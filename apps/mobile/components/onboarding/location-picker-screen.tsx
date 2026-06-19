import mapImage from '@/assets/images/map.png';
import { GlassSearchField } from '@/components/ui/glass-search-field';
import { theme } from '@/constants/theme';
import { endpoints } from '@/lib/api/endpoints';
import {
  onboardingLocationChannel,
  type LocationSelection,
} from '@/lib/location/location-selection';
import {
  resolvePlace,
  reverseLabel,
  searchPlaces,
  type PlaceSuggestion,
} from '@/lib/onboarding/place-search';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Coordinates = {
  latitude?: number;
  longitude?: number;
};

type LocationPickerScreenProps = {
  initialSelection?: LocationSelection | null;
  onConfirm?: (selection: LocationSelection) => void;
  title?: string;
  searchPlaceholder?: string;
  confirmLabel?: string;
};

const DEFAULT_COORDINATES = {
  latitude: 17.4065,
  longitude: 78.4772,
};
const SEARCH_ZOOM = 16;

function validCoordinates(coordinates?: Coordinates): coordinates is Required<Coordinates> {
  return (
    typeof coordinates?.latitude === 'number' &&
    Number.isFinite(coordinates.latitude) &&
    typeof coordinates.longitude === 'number' &&
    Number.isFinite(coordinates.longitude)
  );
}

function sameCoordinates(a: LocationSelection, b: LocationSelection) {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

export function LocationPickerScreen({
  initialSelection = null,
  onConfirm,
  title = 'Choose your place',
  searchPlaceholder = 'Search exact address',
  confirmLabel = 'Save location',
}: LocationPickerScreenProps = {}) {
  const appleMapRef = useRef<AppleMaps.MapView>(null);
  const googleMapRef = useRef<GoogleMaps.MapView>(null);
  const [query, setQuery] = useState(initialSelection?.label ?? '');
  const [selection, setSelection] = useState<LocationSelection | null>(initialSelection);
  const [labelLoading, setLabelLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const requestIdRef = useRef(0);
  const suppressSearchRef = useRef(false);

  const marker = useMemo(
    () =>
      selection
        ? [
            {
              id: 'selected-location',
              title: selection.label,
              coordinates: {
                latitude: selection.latitude,
                longitude: selection.longitude,
              },
            },
          ]
        : [],
    [selection],
  );

  const initialCoordinates = useMemo(
    () =>
      initialSelection
        ? { latitude: initialSelection.latitude, longitude: initialSelection.longitude }
        : DEFAULT_COORDINATES,
    [initialSelection],
  );

  const moveCamera = useCallback((coordinates: Required<Coordinates>) => {
    if (Platform.OS === 'ios') {
      appleMapRef.current?.setCameraPosition({ coordinates, zoom: SEARCH_ZOOM });
    } else if (Platform.OS === 'android') {
      googleMapRef.current?.setCameraPosition({
        coordinates,
        zoom: SEARCH_ZOOM,
        duration: 280,
      });
    }
  }, []);

  const chooseCoordinates = useCallback(
    async (coordinates: Coordinates, labelHint?: string, shouldMoveCamera = false) => {
      if (!validCoordinates(coordinates)) return;
      const next = {
        label: labelHint?.trim() || 'Selected location',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
      setSelection(next);
      if (shouldMoveCamera) moveCamera(coordinates);
      void Haptics.selectionAsync();

      if (labelHint?.trim()) return;

      setLabelLoading(true);
      try {
        // iOS resolves the address fully on-device (Apple geocoder); Android uses the backend.
        let resolved: string | null = null;
        if (Platform.OS === 'ios') {
          resolved = await reverseLabel({ latitude: next.latitude, longitude: next.longitude });
        } else {
          const result = await endpoints.reverseGeocode({
            latitude: next.latitude,
            longitude: next.longitude,
          });
          resolved = result.label;
        }
        setSelection((current) =>
          current && sameCoordinates(current, next)
            ? { ...current, label: resolved || current.label }
            : current,
        );
      } catch {
        setSelection((current) =>
          current && sameCoordinates(current, next) ? { ...current, label: next.label } : current,
        );
      } finally {
        setLabelLoading(false);
      }
    },
    [moveCamera],
  );

  // Debounced on-device autocomplete (iOS). Each keystroke supersedes the prior request.
  useEffect(() => {
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }

    const trimmed = query.trim();
    if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || trimmed.length < 3) {
      setSuggestions([]);
      setNoMatch(false);
      setSearchLoading(false);
      return;
    }

    const id = ++requestIdRef.current;
    setSearchLoading(true);
    setNoMatch(false);
    const timer = setTimeout(() => {
      void (async () => {
        const results = await searchPlaces(trimmed);
        if (requestIdRef.current !== id) return;
        setSuggestions(results);
        setNoMatch(results.length === 0);
        setSearchLoading(false);
      })();
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const selectSuggestion = useCallback(
    (suggestion: PlaceSuggestion) => {
      requestIdRef.current += 1; // invalidate any in-flight search
      suppressSearchRef.current = true;
      setQuery(suggestion.label);
      setSuggestions([]);
      setNoMatch(false);
      setSearchLoading(false);
      Keyboard.dismiss();
      void (async () => {
        setLabelLoading(true);
        const place = await resolvePlace(suggestion);
        setLabelLoading(false);
        if (!place) {
          Alert.alert('Could not load that place', 'Please pick another result.');
          return;
        }
        // Pass the resolved label so chooseCoordinates skips a redundant reverse-geocode.
        await chooseCoordinates(
          { latitude: place.latitude, longitude: place.longitude },
          place.label,
          true,
        );
      })();
    },
    [chooseCoordinates],
  );

  const submitTopSuggestion = useCallback(() => {
    if (suggestions.length > 0) selectSuggestion(suggestions[0]);
  }, [selectSuggestion, suggestions]);

  const showDropdown =
    (Platform.OS === 'ios' || Platform.OS === 'android') &&
    query.trim().length >= 3 &&
    (searchLoading || suggestions.length > 0 || noMatch);

  const confirm = () => {
    if (!selection) {
      Alert.alert('Choose a place', 'Tap the map to drop a pin, then use this place.');
      return;
    }
    if (onConfirm) {
      onConfirm(selection);
    } else {
      onboardingLocationChannel.set(selection);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close location picker"
              onPress={() => {
                router.back();
              }}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
            </View>
          </View>

          <View style={styles.searchZone}>
            <GlassSearchField
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitTopSuggestion}
              placeholder={searchPlaceholder}
              accessibilityLabel={searchPlaceholder}
              autoCapitalize="words"
              returnKeyType="search"
              loading={searchLoading}
            />
            {showDropdown ? (
              <SuggestionsDropdown
                suggestions={suggestions}
                loading={searchLoading}
                noMatch={noMatch}
                onSelect={selectSuggestion}
              />
            ) : null}
          </View>

          <View style={styles.mapShell}>
            {Platform.OS === 'ios' ? (
              <AppleMaps.View
                ref={appleMapRef}
                style={styles.map}
                cameraPosition={{ coordinates: initialCoordinates, zoom: 12 }}
                markers={marker}
                uiSettings={{
                  compassEnabled: true,
                  myLocationButtonEnabled: false,
                  scaleBarEnabled: true,
                }}
                onMapClick={(event) => void chooseCoordinates(event.coordinates)}
              />
            ) : Platform.OS === 'android' ? (
              <GoogleMaps.View
                ref={googleMapRef}
                style={styles.map}
                cameraPosition={{ coordinates: initialCoordinates, zoom: 12 }}
                markers={marker}
                colorScheme={GoogleMaps.MapColorScheme.DARK}
                uiSettings={{
                  compassEnabled: true,
                  myLocationButtonEnabled: false,
                  mapToolbarEnabled: false,
                  zoomControlsEnabled: false,
                }}
                onMapClick={(event) => void chooseCoordinates(event.coordinates)}
                onPOIClick={(event) => void chooseCoordinates(event.coordinates, event.name)}
              />
            ) : (
              <View style={styles.mapFallback}>
                <Text style={styles.fallbackText}>
                  Map selection is available on iOS and Android.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.selectionShell}>
            <View style={styles.mapIconShell}>
              <Image
                source={mapImage}
                style={styles.mapIcon}
                contentFit="contain"
                accessibilityLabel="Map"
              />
            </View>
            <View style={styles.selectionText}>
              <Text style={styles.selectionTitle}>
                {selection ? 'Selected location' : 'No place selected yet'}
              </Text>
              <Text style={styles.selectionMeta}>
                {selection?.label ?? 'Search an address or tap anywhere on the map'}
              </Text>
            </View>
            {labelLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
          </View>

          <LiquidConfirmButton disabled={!selection} onPress={confirm} label={confirmLabel} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function LiquidConfirmButton({
  disabled,
  onPress,
  label,
}: {
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  const content = <Text style={styles.confirmText}>{label}</Text>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Save selected location"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.confirmPressable,
        disabled ? styles.confirmDisabled : null,
        pressed && !disabled ? styles.confirmPressed : null,
      ]}
    >
      {isLiquidGlassAvailable() ? (
        <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.confirmSurface}>
          {content}
        </GlassView>
      ) : (
        <BlurView tint="systemUltraThinMaterialDark" intensity={86} style={styles.confirmSurface}>
          {content}
        </BlurView>
      )}
    </Pressable>
  );
}

function SuggestionsDropdown({
  suggestions,
  loading,
  noMatch,
  onSelect,
}: {
  suggestions: PlaceSuggestion[];
  loading: boolean;
  noMatch: boolean;
  onSelect: (suggestion: PlaceSuggestion) => void;
}) {
  const body =
    suggestions.length > 0 ? (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {suggestions.map((suggestion, index) => (
          <Pressable
            key={suggestion.id}
            accessibilityRole="button"
            accessibilityLabel={suggestion.label}
            onPress={() => {
              onSelect(suggestion);
            }}
            style={({ pressed }) => [
              styles.suggestionRow,
              index > 0 ? styles.suggestionDivider : null,
              pressed ? styles.suggestionPressed : null,
            ]}
          >
            <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.7)" />
            <View style={styles.suggestionText}>
              <Text style={styles.suggestionLabel} numberOfLines={1}>
                {suggestion.label}
              </Text>
              {suggestion.sublabel ? (
                <Text style={styles.suggestionSublabel} numberOfLines={1}>
                  {suggestion.sublabel}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    ) : loading ? (
      <View style={styles.suggestionStatusRow}>
        <ActivityIndicator color="#FFFFFF" size="small" />
        <Text style={styles.suggestionStatusText}>Searching…</Text>
      </View>
    ) : noMatch ? (
      <View style={styles.suggestionStatusRow}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.6)" />
        <Text style={styles.suggestionStatusText}>No matches. Try a more specific address.</Text>
      </View>
    ) : null;

  return (
    <View style={styles.dropdown}>
      {isLiquidGlassAvailable() ? (
        <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.dropdownSurface}>
          {body}
        </GlassView>
      ) : (
        <BlurView tint="systemUltraThinMaterialDark" intensity={68} style={styles.dropdownSurface}>
          {body}
        </BlurView>
      )}
      <View pointerEvents="none" style={styles.dropdownRing} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  searchZone: {
    zIndex: 20,
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.055)',
    maxHeight: 264,
    zIndex: 30,
  },
  dropdownSurface: {
    maxHeight: 264,
  },
  dropdownRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  suggestionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  suggestionPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  suggestionText: {
    flex: 1,
    gap: 1,
  },
  suggestionLabel: {
    ...theme.typography.bodyStrong,
    color: '#FFFFFF',
  },
  suggestionSublabel: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.6)',
  },
  suggestionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  suggestionStatusText: {
    ...theme.typography.callout,
    color: 'rgba(255,255,255,0.72)',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...theme.typography.headline,
    color: '#FFFFFF',
  },
  mapShell: {
    flex: 1,
    minHeight: 390,
    borderRadius: 28,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(7,7,10,0.72)',
    zIndex: 0,
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackText: {
    ...theme.typography.callout,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  selectionShell: {
    minHeight: 70,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  mapIconShell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIcon: {
    width: 36,
    height: 36,
  },
  selectionText: {
    flex: 1,
    gap: 1,
  },
  selectionTitle: {
    ...theme.typography.bodyStrong,
    color: '#FFFFFF',
  },
  selectionMeta: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.62)',
  },
  confirmPressable: {
    minHeight: 54,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  confirmDisabled: {
    opacity: 0.46,
  },
  confirmSurface: {
    minHeight: 54,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(160,255,203,0.64)',
    backgroundColor: '#20C96A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  confirmPressed: {
    transform: [{ scale: 0.985 }],
  },
  pressed: {
    opacity: 0.78,
  },
});
