import { NativeIconButton } from '@/components/ui/native-icon-button';
import { theme } from '@/constants/theme';
import { useBootstrap } from '@/hooks/use-marketplace';
import { Redirect, useRouter } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BrandTabsLayout() {
  const bootstrap = useBootstrap();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (bootstrap.data?.role === 'influencer') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <View style={styles.root}>
      <NativeTabs blurEffect="systemChromeMaterialDark" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'house', selected: 'house.fill' }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="discover">
          <Icon
            sf={{ default: 'magnifyingglass.circle', selected: 'magnifyingglass.circle.fill' }}
          />
          <Label>Find</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="campaigns">
          <Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
          <Label>Camps</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="inbox">
          <Icon
            sf={{
              default: 'bubble.left.and.bubble.right',
              selected: 'bubble.left.and.bubble.right.fill',
            }}
          />
          <Label>Inbox</Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      <NativeIconButton
        symbol="storefront"
        fallbackIcon="storefront-outline"
        variant="glass"
        haptic="light"
        onPress={() => {
          router.push('/(app)/brand-profile');
        }}
        style={{ position: 'absolute', right: 16, top: insets.top + 20, zIndex: 50 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
