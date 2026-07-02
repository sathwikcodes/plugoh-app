import { Ionicons } from '@expo/vector-icons';
import type { Influencer } from '@plugoh/contracts';
import { useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { AppleMaps, GoogleMaps, type Coordinates } from 'expo-maps';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import followersImage from '@/assets/images/followers.png';
import likesImage from '@/assets/images/likes.png';
import megaphoneImage from '@/assets/images/megaphone.png';
import { BookingPackageCarousel } from '@/components/booking/booking-package-carousel';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { TabScreenCanvas } from '@/components/ui/tab-screen-canvas';
import { theme } from '@/constants/theme';
import { getInfluencer } from '@/lib/api/endpoints';
import { shouldShowInitialLoader } from '@/lib/query/loading';

type CreatorProfile = Influencer & {
  media?: { id?: string; media_url?: string; caption?: string; engagement?: number }[];
};

function initial(value?: string) {
  return value?.trim().charAt(0).toUpperCase() || 'P';
}

function profileImageUrl(profile?: CreatorProfile) {
  return profile?.profile_photo_url || profile?.avatar_url || undefined;
}

function creatorName(profile?: CreatorProfile) {
  return profile?.display_name?.trim() || profile?.ig_username?.trim() || 'Creator';
}

function instagramHandle(profile?: CreatorProfile) {
  const handle = profile?.ig_username?.trim() || profile?.instagram_handle?.trim();
  return handle ? `@${handle.replace(/^@/, '')}` : 'Not linked';
}

function formatNumber(value?: number) {
  if (value == null) return 'Not available';
  return Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

function CreatorLiquidSurface({
  children,
  style,
}: {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
}) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView isInteractive={false} glassEffectStyle="regular" colorScheme="dark" style={style}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={style}>
      {children}
    </BlurView>
  );
}

function MetricGlassTile({
  image,
  value,
  label,
  loading,
}: {
  image: ImageSourcePropType;
  value: string;
  label: string;
  loading?: boolean;
}) {
  return (
    <CreatorLiquidSurface style={styles.metricGlass}>
      <View style={styles.metricInner} accessibilityLabel={`${label}: ${value}`}>
        <View pointerEvents="none" style={styles.metricInnerStroke} />
        <Image
          source={image}
          style={styles.metricImage}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <AsyncText
          loading={Boolean(loading)}
          value={value}
          style={styles.metricValue}
          numberOfLines={1}
          shimmerWidth={54}
          shimmerHeight={18}
        />
      </View>
    </CreatorLiquidSurface>
  );
}

export default function CreatorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const influencer = useQuery({
    queryKey: ['creator', id],
    queryFn: () => getInfluencer(id),
    enabled: Boolean(id),
  });

  const data = influencer.data;
  const loading = shouldShowInitialLoader(influencer);
  const name = creatorName(data);
  const imageUrl = profileImageUrl(data);
  const handle = instagramHandle(data);
  const city = data?.city?.trim();
  const media = data?.media ?? [];

  const cityGeocode = useQuery({
    queryKey: ['creator-city-geocode', city],
    queryFn: async () => {
      if (!city) return null;
      const results = await Location.geocodeAsync(city);
      return results[0] ?? null;
    },
    enabled: Boolean(city) && Platform.OS === 'ios',
    staleTime: Infinity,
  });
  const coordinates: Coordinates | null = cityGeocode.data
    ? { latitude: cityGeocode.data.latitude, longitude: cityGeocode.data.longitude }
    : null;
  const locationPrimary = city || 'Location not specified';

  return (
    <TabScreenCanvas>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.section }}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + theme.spacing.md }]}>
          <View style={styles.headerRow}>
            <GlassCircleButton
              symbol="chevron.left"
              fallbackIcon="chevron-back"
              tintColor="#FFFFFF"
              size={44}
              symbolSize={20}
              accessibilityLabel="Go back"
              onPress={() => {
                router.back();
              }}
            />
          </View>

          <View style={styles.heroContent}>
            <View style={styles.avatar}>
              {loading ? (
                <ShimmerCircle size={76} />
              ) : imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarInitial}>{initial(name)}</Text>
              )}
            </View>
            <View style={styles.heroCopy}>
              <AsyncText
                loading={loading}
                value={name}
                selectable
                style={styles.creatorName}
                numberOfLines={2}
                shimmerWidth="74%"
                shimmerHeight={24}
              />
              {loading ? (
                <ShimmerText width="72%" height={18} />
              ) : (
                <Text selectable style={styles.handle} numberOfLines={1}>
                  {handle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.metricRow}>
            <MetricGlassTile
              image={followersImage}
              value={formatNumber(data?.follower_count)}
              label="Followers"
              loading={loading}
            />
            <MetricGlassTile
              image={likesImage}
              value={formatNumber(data?.avg_likes_per_reel)}
              label="Avg likes"
              loading={loading}
            />
            <MetricGlassTile
              image={megaphoneImage}
              value={formatNumber(data?.avg_views_per_reel)}
              label="Avg views"
              loading={loading}
            />
          </View>
        </View>

        <View style={styles.body}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Book ${name}`}
            disabled={loading || !id}
            onPress={() => {
              router.push(`/(app)/booking/${id}`);
            }}
            style={({ pressed }) => [styles.bookButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.bookButtonText}>Book creator</Text>
            <Ionicons name="arrow-forward" size={18} color="#0D0D0D" />
          </Pressable>

          {loading ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>About</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.briefSkeleton}>
                <ShimmerText width="92%" height={15} />
                <ShimmerText width="78%" height={15} />
              </View>
            </View>
          ) : data?.bio ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>About</Text>
              <View style={styles.sectionDivider} />
              <Text selectable style={styles.descriptionText}>
                {data.bio}
              </Text>
            </View>
          ) : null}

          {media.length > 0 ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Recent content</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.mediaGrid}>
                {media.slice(0, 4).map((item, index) => (
                  <View key={item.id ?? `${item.media_url}-${index}`} style={styles.mediaTile}>
                    {item.media_url ? (
                      <Image
                        source={{ uri: item.media_url }}
                        style={styles.mediaImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.mediaFallback}>
                        <Ionicons name="image" size={22} color="rgba(255,255,255,0.58)" />
                      </View>
                    )}
                    {item.engagement != null ? (
                      <View style={styles.mediaBadge}>
                        <Ionicons name="heart" size={12} color="#FFFFFF" />
                        <Text style={styles.mediaBadgeText}>{formatNumber(item.engagement)}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Pricing</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.briefSkeleton}>
                <ShimmerText width="90%" height={20} />
              </View>
            </View>
          ) : (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Pricing</Text>
              <View style={styles.sectionDivider} />
              <BookingPackageCarousel influencer={data} bleed={theme.spacing.xl} />
            </View>
          )}

          {loading ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Location</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.locationMetaRow}>
                <View style={styles.locationTextBlock}>
                  <ShimmerText width={190} height={26} />
                  <ShimmerText width={160} height={22} />
                </View>
              </View>
              <View style={styles.locationCard}>
                <View style={styles.mapLoading}>
                  <ShimmerText width="64%" height={18} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Location</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.locationMetaRow}>
                <View style={styles.locationTextBlock}>
                  <Text selectable style={styles.locationPrimary} numberOfLines={1}>
                    {locationPrimary}
                  </Text>
                </View>
              </View>
              <View style={styles.locationCard}>
                {coordinates && Platform.OS === 'ios' ? (
                  <AppleMaps.View
                    style={styles.nativeMap}
                    cameraPosition={{ coordinates, zoom: 12 }}
                    markers={[{ id: 'creator-location', coordinates, title: locationPrimary }]}
                    uiSettings={{
                      compassEnabled: false,
                      myLocationButtonEnabled: false,
                      scaleBarEnabled: false,
                    }}
                  />
                ) : coordinates && Platform.OS === 'android' ? (
                  <GoogleMaps.View
                    style={styles.nativeMap}
                    cameraPosition={{ coordinates, zoom: 12 }}
                    markers={[{ id: 'creator-location', coordinates, title: locationPrimary }]}
                    uiSettings={{
                      compassEnabled: false,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                      rotationGesturesEnabled: false,
                      tiltGesturesEnabled: false,
                    }}
                  />
                ) : (
                  <View style={styles.mapFallback}>
                    <Ionicons name="location" size={18} color="rgba(255,255,255,0.72)" />
                    <Text selectable style={styles.mapFallbackText} numberOfLines={2}>
                      {locationPrimary}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </TabScreenCanvas>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  hero: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  headerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pressed: {
    opacity: 0.72,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    ...theme.typography.title,
    color: '#111522',
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
  },
  creatorName: {
    ...theme.typography.title,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  handle: {
    ...theme.typography.body,
    color: 'rgba(255,190,210,0.9)',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.md,
  },
  metricGlass: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 1,
  },
  metricInner: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    position: 'relative',
  },
  metricInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  metricImage: {
    width: 24,
    height: 24,
  },
  metricValue: {
    ...theme.typography.cardTitle,
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  bookButton: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.xl,
  },
  bookButtonText: {
    ...theme.typography.bodyStrong,
    color: '#0D0D0D',
    fontWeight: '800',
  },
  descriptionSection: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  descriptionTitle: {
    ...theme.typography.headline,
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  descriptionText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.66)',
    lineHeight: 25,
  },
  briefSkeleton: {
    gap: theme.spacing.sm,
  },
  locationMetaRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  locationTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  locationPrimary: {
    ...theme.typography.section,
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
  },
  locationCard: {
    height: 148,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  nativeMap: {
    width: '100%',
    height: '100%',
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  mapFallbackText: {
    ...theme.typography.callout,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  mediaTile: {
    flexBasis: '48%',
    flexGrow: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: theme.spacing.sm,
  },
  mediaBadgeText: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
