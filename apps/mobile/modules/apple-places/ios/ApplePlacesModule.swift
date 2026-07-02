import ExpoModulesCore
import MapKit

// Bridges Apple's native MapKit search (the engine behind Apple Maps autocomplete) to JS.
// MKLocalSearchCompleter streams suggestions for a query fragment; MKLocalSearch resolves a
// chosen suggestion into coordinates + a readable address. No API key required.
public final class ApplePlacesModule: Module {
  private let completer = MKLocalSearchCompleter()
  private let completerDelegate = CompleterDelegate()
  private var completions: [MKLocalSearchCompletion] = []

  public func definition() -> ModuleDefinition {
    Name("ApplePlaces")

    OnCreate {
      self.completer.resultTypes = [.address, .pointOfInterest]
      self.completer.delegate = self.completerDelegate
    }

    AsyncFunction("getCompletions") { (query: String, promise: Promise) in
      DispatchQueue.main.async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
          self.completions = []
          promise.resolve([[String: Any]]())
          return
        }

        var settled = false
        self.completerDelegate.onUpdate = { [weak self] results in
          guard let self, !settled else { return }
          settled = true
          self.completions = results
          let mapped: [[String: Any]] = results.enumerated().map { index, completion in
            [
              "id": index,
              "title": completion.title,
              "subtitle": completion.subtitle,
            ]
          }
          promise.resolve(mapped)
        }
        self.completerDelegate.onError = { [weak self] _ in
          guard let self, !settled else { return }
          settled = true
          self.completions = []
          promise.resolve([[String: Any]]())
        }

        self.completer.queryFragment = trimmed
      }
    }

    AsyncFunction("resolveCompletion") { (id: Int, promise: Promise) in
      DispatchQueue.main.async {
        guard id >= 0, id < self.completions.count else {
          promise.reject("ERR_INVALID_COMPLETION", "Completion is no longer available")
          return
        }

        let completion = self.completions[id]
        let request = MKLocalSearch.Request(completion: completion)
        let search = MKLocalSearch(request: request)
        search.start { response, error in
          if let error {
            promise.reject("ERR_PLACE_SEARCH", error.localizedDescription)
            return
          }
          guard let item = response?.mapItems.first else {
            promise.reject("ERR_PLACE_NOT_FOUND", "No location found for this place")
            return
          }
          let coordinate = item.placemark.coordinate
          let name = item.name ?? completion.title
          let address = Self.formatAddress(item.placemark) ?? completion.subtitle
          promise.resolve([
            "latitude": coordinate.latitude,
            "longitude": coordinate.longitude,
            "name": name,
            "address": address,
          ])
        }
      }
    }
  }

  /// Compose a readable single-line address from CLPlacemark components.
  private static func formatAddress(_ placemark: MKPlacemark) -> String? {
    let parts = [
      placemark.thoroughfare,
      placemark.locality,
      placemark.administrativeArea,
      placemark.postalCode,
      placemark.country,
    ].compactMap { $0 }.filter { !$0.isEmpty }
    return parts.isEmpty ? placemark.title : parts.joined(separator: ", ")
  }
}

final class CompleterDelegate: NSObject, MKLocalSearchCompleterDelegate {
  var onUpdate: (([MKLocalSearchCompletion]) -> Void)?
  var onError: ((Error) -> Void)?

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    onUpdate?(completer.results)
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    onError?(error)
  }
}
