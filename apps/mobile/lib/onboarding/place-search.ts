import { endpoints } from '@/lib/api/endpoints';
import { getCompletions, resolveCompletion } from '@/modules/apple-places';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Apple-Maps-style place search.
 * - iOS: native MapKit (MKLocalSearchCompleter + MKLocalSearch) — on-device, no API key.
 * - Android: Google Places (New) via the backend (key stays server-side).
 *
 * Suggestions are predictions without coordinates; call `resolvePlace` on the chosen one to get
 * the pin coordinates + a full address (matches how Apple/Google autocomplete actually work).
 */
export type SuggestionRef =
  | { kind: 'apple'; completionId: number }
  | { kind: 'google'; placeId: string };

export type PlaceSuggestion = {
  id: string;
  label: string;
  sublabel: string;
  ref: SuggestionRef;
};

export type ResolvedPlace = {
  label: string;
  latitude: number;
  longitude: number;
};

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  try {
    if (Platform.OS === 'ios') {
      const completions = await getCompletions(trimmed);
      return completions.map((completion) => ({
        id: `apple:${completion.id}`,
        label: completion.title,
        sublabel: completion.subtitle,
        ref: { kind: 'apple', completionId: completion.id },
      }));
    }

    if (Platform.OS === 'android') {
      const { predictions } = await endpoints.autocomplete({ query: trimmed });
      return predictions.map((prediction) => ({
        id: `google:${prediction.place_id}`,
        label: prediction.label,
        sublabel: prediction.sublabel,
        ref: { kind: 'google', placeId: prediction.place_id },
      }));
    }

    return [];
  } catch {
    return [];
  }
}

export async function resolvePlace(suggestion: PlaceSuggestion): Promise<ResolvedPlace | null> {
  try {
    if (suggestion.ref.kind === 'apple') {
      const place = await resolveCompletion(suggestion.ref.completionId);
      if (!place) return null;
      const label = place.address ? `${place.name}, ${place.address}` : place.name;
      return { label, latitude: place.latitude, longitude: place.longitude };
    }

    const detail = await endpoints.placeDetails({ place_id: suggestion.ref.placeId });
    return { label: detail.label, latitude: detail.latitude, longitude: detail.longitude };
  } catch {
    return null;
  }
}

/**
 * Reverse-geocode coordinates into a readable label (for map taps).
 * iOS resolves on-device via Apple's geocoder; Android callers fall back to the backend.
 */
export async function reverseLabel(coordinates: {
  latitude: number;
  longitude: number;
}): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const addresses = await Location.reverseGeocodeAsync(coordinates);
    if (addresses.length === 0) return null;
    return formatAddress(addresses[0]);
  } catch {
    return null;
  }
}

function formatAddress(address: Location.LocationGeocodedAddress): string {
  const primary = address.name || address.street || address.city || 'Pinned location';
  const seen = new Set<string>([primary]);
  const rest = [
    address.street,
    address.district,
    address.city,
    address.region,
    address.postalCode,
  ].filter((part): part is string => {
    if (!part || seen.has(part)) return false;
    seen.add(part);
    return true;
  });
  return rest.length > 0 ? `${primary}, ${rest.join(', ')}` : primary;
}
