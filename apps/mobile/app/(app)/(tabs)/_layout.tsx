import earnTab from '@/assets/images/earn-tab.png';
import earnTabSelected from '@/assets/images/earn-tab-selected.png';
import homeTab from '@/assets/images/home-tab.png';
import homeTabSelected from '@/assets/images/home-tab-selected.png';
import inboxTab from '@/assets/images/inbox-tab.png';
import inboxTabSelected from '@/assets/images/inbox-tab-selected.png';
import workTab from '@/assets/images/work-tab.png';
import workTabSelected from '@/assets/images/work-tab-selected.png';
import { plugohNativeTabOptions } from '@/components/navigation/native-tab-config';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { TabScreenCanvasProvider } from '@/components/ui/tab-screen-canvas';
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
    <TabScreenCanvasProvider>
      <View style={styles.root}>
        <NativeTabs {...plugohNativeTabOptions}>
          <NativeTabs.Trigger name="index">
            <Icon src={{ default: homeTab, selected: homeTabSelected }} />
            <Label hidden>Home</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="campaigns">
            <Icon src={{ default: workTab, selected: workTabSelected }} />
            <Label hidden>Work</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="inbox">
            <Icon src={{ default: inboxTab, selected: inboxTabSelected }} />
            <Label hidden>Inbox</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="earnings">
            <Icon src={{ default: earnTab, selected: earnTabSelected }} />
            <Label hidden>Earn</Label>
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
    </TabScreenCanvasProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDeep,
  },
});
