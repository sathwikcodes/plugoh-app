import {
  CAMPAIGN_CARD_CORNER_RADIUS,
  CAMPAIGN_CARD_FRAME_BORDER,
} from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import type { CampaignListItem } from '@plugoh/contracts';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Text, View, type ViewStyle } from 'react-native';

type Props = {
  campaign: CampaignListItem;
  style?: ViewStyle;
};

function formatBudget(amount?: number) {
  if (!amount) return null;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatPackageType(pkg?: string) {
  if (!pkg) return null;
  return pkg.replace('_', '+').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CampaignSwipeCard({ campaign, style }: Props) {
  const budget = formatBudget(campaign.price_offered);
  const packageType = formatPackageType(campaign.package_type);

  const cardContent = (
    <View style={{ flex: 1, padding: theme.spacing.xxl, justifyContent: 'space-between' }}>
      {/* Top: badges */}
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <View
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.accentStrong,
          }}
        >
          <Text style={{ ...theme.typography.label, color: theme.colors.accentStrong }}>
            New Request
          </Text>
        </View>
        {packageType && (
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: theme.radius.pill,
            }}
          >
            <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
              {packageType}
            </Text>
          </View>
        )}
      </View>

      {/* Middle: campaign info */}
      <View style={{ gap: theme.spacing.md }}>
        {campaign.business_profile?.brand_name && (
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            {campaign.business_profile.brand_name}
          </Text>
        )}
        <Text
          style={{ ...theme.typography.title, color: theme.colors.foreground }}
          numberOfLines={3}
        >
          {campaign.title}
        </Text>
        {campaign.brief ? (
          <Text style={{ ...theme.typography.body, color: theme.colors.muted }} numberOfLines={4}>
            {campaign.brief}
          </Text>
        ) : null}
      </View>

      {/* Bottom: budget + expiry */}
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)' }} />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {budget ? (
            <View>
              <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Budget</Text>
              <Text style={{ ...theme.typography.section, color: theme.colors.foreground }}>
                {budget}
              </Text>
            </View>
          ) : null}
          {campaign.expires_at ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Expires</Text>
              <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
                {new Date(campaign.expires_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  const shellStyle: ViewStyle = {
    flex: 1,
    borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: CAMPAIGN_CARD_FRAME_BORDER,
    ...(style ?? {}),
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={shellStyle}>
        {cardContent}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={shellStyle}>
      {cardContent}
    </BlurView>
  );
}
