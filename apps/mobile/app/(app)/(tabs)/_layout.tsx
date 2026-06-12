import { NativeIconButton } from '@/components/ui/native-icon-button';
import { plugohNativeTabOptions } from '@/components/navigation/native-tab-config';
import { theme } from '@/constants/theme';
import { useBootstrap } from '@/hooks/use-marketplace';
import { Redirect, useRouter, useSegments } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const bootstrap = useBootstrap();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();

  if (bootstrap.data?.role === 'business') {
    return <Redirect href="/(app)/(brand-tabs)" />;
  }
  const segmentPath = segments as unknown as string[];
  const leaf = segmentPath[segmentPath.length - 1] ?? '';
  const hideFloatingProfile =
    segmentPath.includes('(tabs)') &&
    (leaf === 'index' ||
      leaf === '(tabs)' ||
      leaf === 'campaigns' ||
      leaf === 'inbox' ||
      leaf === 'earnings');

  return (
    <View style={styles.root}>
      <NativeTabs {...plugohNativeTabOptions}>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'house', selected: 'house.fill' }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="campaigns">
          <Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
          <Label>Work</Label>
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

        <NativeTabs.Trigger name="earnings">
          <Icon sf={{ default: 'wallet.pass', selected: 'wallet.pass.fill' }} />
          <Label>Earn</Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      {!hideFloatingProfile ? (
        <NativeIconButton
          symbol="person.circle"
          fallbackIcon="person-circle-outline"
          variant="glass"
          haptic="light"
          size={44}
          symbolSize={20}
          onPress={() => {
            router.push('/(app)/profile');
          }}
          style={{ position: 'absolute', right: 16, top: insets.top + 14, zIndex: 50 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
