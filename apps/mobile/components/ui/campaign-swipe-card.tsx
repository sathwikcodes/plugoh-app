import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { statusTone, theme } from '@/constants/theme';
import type { CampaignListItem } from '@plugoh/contracts';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

type Props = {
  campaign: CampaignListItem;
  cardWidth: number;
  cardHeight: number;
  style?: ViewStyle;
  onViewPress?: () => void;
};

function formatBudget(amount?: number) {
  if (amount == null) return null;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatPackageType(pkg?: string) {
  if (!pkg) return null;
  return pkg
    .replaceAll('_', ' ')
    .replaceAll('+', ' + ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStatus(status?: string) {
  if (!status) return 'Campaign';
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function brandImageUrl(campaign: CampaignListItem) {
  return (
    campaign.business_profile?.profile_photo_url ||
    campaign.business_profile?.ig_profile_picture_url ||
    campaign.business_profile?.avatar_url ||
    undefined
  );
}

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'P';
}

function parseBriefValue(brief: string | undefined, label: string) {
  if (!brief) return null;
  const prefix = `${label}:`;
  const match = brief
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()));
  return match?.slice(prefix.length).trim() || null;
}

function formatDateLabel(label: string, value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${label} ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

function campaignTiming(campaign: CampaignListItem) {
  const briefTiming = parseBriefValue(campaign.brief, 'Timing');
  if (briefTiming) {
    return briefTiming.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return (
    formatDateLabel('Done', campaign.completed_at) ||
    formatDateLabel('Sent', campaign.delivery_submitted_at) ||
    formatDateLabel('Expires', campaign.expires_at)
  );
}

function compactMeta(campaign: CampaignListItem) {
  return [
    formatBudget(campaign.price_offered),
    formatPackageType(campaign.package_type),
    campaignTiming(campaign),
  ].filter((value): value is string => Boolean(value));
}

export function CampaignSwipeCard({ campaign, cardWidth, cardHeight, style, onViewPress }: Props) {
  const scale = Math.min(cardWidth / 360, cardHeight / 560);
  const px = (value: number) => Math.round(value * scale);
  const brandName = campaign.business_profile?.brand_name?.trim() || 'Plugoh brand';
  const location = campaign.business_profile?.brand_location?.trim();
  const venue = parseBriefValue(campaign.brief, 'Venue');
  const imageUrl = brandImageUrl(campaign);
  const statusLabel = formatStatus(campaign.status);
  const tone = statusTone(campaign.status);
  const meta = compactMeta(campaign);
  const title = campaign.title.trim() || brandName;
  const subtitle = [brandName, venue || location].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onViewPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${title}`}
      style={({ pressed }) => [
        styles.shell,
        {
          width: cardWidth,
          height: cardHeight,
          borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <LinearGradient
          colors={['#1A0714', '#091610', '#050509']}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.28, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(231,106,146,0.22)', 'rgba(245,192,166,0)', 'rgba(215,163,35,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {!imageUrl ? (
        <View style={styles.fallbackArt} pointerEvents="none">
          <Text style={[styles.fallbackInitial, { fontSize: px(168), lineHeight: px(176) }]}>
            {initial(brandName)}
          </Text>
          <Text style={[styles.fallbackMark, { fontSize: px(44) }]}>plugoh</Text>
        </View>
      ) : null}

      <View style={[styles.topRow, { padding: px(20) }]}>
        <View
          style={[
            styles.avatarFrame,
            {
              width: px(58),
              height: px(58),
              borderRadius: px(29),
            },
          ]}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={[styles.avatarInitial, { fontSize: px(23) }]}>{initial(brandName)}</Text>
          )}
        </View>

        <View
          style={[
            styles.statusPill,
            {
              minHeight: px(42),
              borderRadius: px(22),
              backgroundColor: tone.bg,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
          <Text style={[styles.statusText, { color: tone.fg, fontSize: px(14) }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.content, { padding: px(22), gap: px(14) }]}>
        <Text style={[styles.brandKicker, { fontSize: px(12) }]} numberOfLines={1}>
          PLUGOH CAMPAIGN
        </Text>
        <Text
          selectable
          style={[
            styles.title,
            {
              fontSize: px(title.length > 30 ? 38 : 46),
              lineHeight: px(title.length > 30 ? 42 : 50),
            },
          ]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { fontSize: px(17), lineHeight: px(23) }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}

        <View style={[styles.metaDock, { borderRadius: px(28), padding: px(8), gap: px(8) }]}>
          {meta.slice(0, 3).map((item, index) => (
            <View key={`${item}-${index}`} style={[styles.metaChip, { borderRadius: px(20) }]}>
              <Ionicons
                name={index === 0 ? 'cash' : index === 1 ? 'sparkles' : 'time'}
                size={px(15)}
                color="#FFF5CF"
              />
              <Text style={[styles.metaText, { fontSize: px(12) }]} numberOfLines={1}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.viewRow, { marginTop: px(2) }]}>
          <Text style={[styles.viewText, { fontSize: px(15) }]}>View details</Text>
          <Ionicons name="arrow-forward" size={px(18)} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#050509',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 16,
  },
  fallbackArt: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInitial: {
    color: 'rgba(245,192,166,0.18)',
    fontWeight: '900',
    letterSpacing: -8,
    textShadowColor: 'rgba(231,106,146,0.35)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 28,
  },
  fallbackMark: {
    position: 'absolute',
    bottom: '38%',
    color: 'rgba(255,255,255,0.12)',
    fontWeight: '900',
    letterSpacing: -2,
  },
  topRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  avatarFrame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    color: '#111522',
    fontWeight: '900',
  },
  statusPill: {
    maxWidth: '64%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  brandKicker: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: theme.typography.display.fontFamily,
    fontWeight: '900',
    letterSpacing: -1.6,
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: 'rgba(236,247,255,0.9)',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  metaDock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7,7,10,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  metaChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  metaText: {
    minWidth: 0,
    color: '#FFFFFF',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  viewRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  viewText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
