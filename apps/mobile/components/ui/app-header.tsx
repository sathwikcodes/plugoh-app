import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { theme } from '@/constants/theme';
import type { ComponentProps, ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

export const APP_HEADER_HEIGHT = 40;
export const APP_HEADER_ACTION_SIZE = 40;
export const APP_HEADER_ACTION_SYMBOL_SIZE = 18;
export const APP_HEADER_HORIZONTAL_PADDING = 2;
export const APP_HEADER_SCREEN_TOP_PADDING = 0;
export const APP_HEADER_PROFILE_GLASS_RENDERING = 'blur';

type ProfileIconProps = {
  imageUri?: string | null;
  onPress: () => void;
  routeLabel?: string;
  symbol?: SFSymbol;
  fallbackIcon?: ComponentProps<typeof NativeIconButton>['fallbackIcon'];
};

type AppHeaderProps = {
  title: string;
  profile?: ProfileIconProps;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export function AppHeader({ title, profile, right, style, titleStyle }: AppHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
      {profile ? (
        <NativeIconButton
          symbol={profile.symbol ?? 'person.circle'}
          fallbackIcon={profile.fallbackIcon ?? 'person-circle-outline'}
          variant="glass"
          haptic="light"
          size={APP_HEADER_ACTION_SIZE}
          symbolSize={APP_HEADER_ACTION_SYMBOL_SIZE}
          imageUri={profile.imageUri}
          accessibilityLabel={profile.routeLabel ?? 'Open profile'}
          glassRendering={APP_HEADER_PROFILE_GLASS_RENDERING}
          onPress={profile.onPress}
        />
      ) : (
        right
      )}
    </View>
  );
}

type BackHeaderProps = {
  title: string;
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export function BackHeader({ title, onBack, style, titleStyle }: BackHeaderProps) {
  return (
    <View style={[styles.row, styles.backRow, style]}>
      <View style={styles.backButton}>
        <GlassCircleButton
          symbol="chevron.left"
          fallbackIcon="chevron-back"
          tintColor="#FFFFFF"
          size={APP_HEADER_ACTION_SIZE}
          symbolSize={APP_HEADER_ACTION_SYMBOL_SIZE}
          accessibilityLabel="Go back"
          onPress={onBack}
        />
      </View>
      <Text style={[styles.title, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: APP_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingHorizontal: APP_HEADER_HORIZONTAL_PADDING,
  },
  backRow: {
    justifyContent: 'flex-start',
    gap: theme.spacing.lg,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.foreground,
    flex: 1,
    minWidth: 0,
    includeFontPadding: false,
  },
  backButton: {
    flexShrink: 0,
  },
});
