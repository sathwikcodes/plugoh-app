import {
  CAMPAIGN_CARD_CORNER_RADIUS,
  CAMPAIGN_CARD_FRAME_BORDER,
  getCampaignCardFrameHeight,
} from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Dimensions, Text, View } from 'react-native';

const PLACEHOLDER_TONE = 'rgba(255,255,255,0.42)';

export type GlassPlaceholderCardProps = {
  /** Defaults to the same height as the influencer campaign swipe deck. */
  minHeight?: number;
  /** Shown inside the glass panel */
  placeholder?: string;
};

export function GlassPlaceholderCard({
  minHeight: minHeightProp,
  placeholder = 'Campaign cards will appear here',
}: GlassPlaceholderCardProps) {
  const minHeight = minHeightProp ?? getCampaignCardFrameHeight(Dimensions.get('window').height);

  const inner = (
    <View
      style={{
        minHeight,
        height: minHeight,
        padding: theme.spacing.xl,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          ...theme.typography.body,
          color: PLACEHOLDER_TONE,
          textAlign: 'center',
        }}
      >
        {placeholder}
      </Text>
    </View>
  );

  const shellStyle = {
    minHeight,
    height: minHeight,
    borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
    overflow: 'hidden' as const,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: CAMPAIGN_CARD_FRAME_BORDER,
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={shellStyle}>
        {inner}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={shellStyle}>
      {inner}
    </BlurView>
  );
}
