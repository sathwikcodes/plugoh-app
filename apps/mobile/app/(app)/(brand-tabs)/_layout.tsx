import homeTab from '@/assets/images/home-tab.png';
import homeTabSelected from '@/assets/images/home-tab-selected.png';
import inboxTab from '@/assets/images/inbox-tab.png';
import inboxTabSelected from '@/assets/images/inbox-tab-selected.png';
import searchTab from '@/assets/images/search-tab.png';
import searchTabSelected from '@/assets/images/search-tab-selected.png';
import workTab from '@/assets/images/work-tab.png';
import workTabSelected from '@/assets/images/work-tab-selected.png';
import { plugohNativeTabOptions } from '@/components/navigation/native-tab-config';
import { TabScreenCanvasProvider } from '@/components/ui/tab-screen-canvas';
import { theme } from '@/constants/theme';
import { useBootstrap } from '@/hooks/use-marketplace';
import { Redirect } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet, View } from 'react-native';

export default function BrandTabsLayout() {
  const bootstrap = useBootstrap();

  if (bootstrap.data?.role === 'influencer') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <TabScreenCanvasProvider>
      <View style={styles.root}>
        <NativeTabs {...plugohNativeTabOptions}>
          <NativeTabs.Trigger name="index">
            <Icon src={{ default: homeTab, selected: homeTabSelected }} />
            <Label hidden>Home</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="discover">
            <Icon src={{ default: searchTab, selected: searchTabSelected }} />
            <Label hidden>Find</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="campaigns">
            <Icon src={{ default: workTab, selected: workTabSelected }} />
            <Label hidden>Work</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="inbox">
            <Icon src={{ default: inboxTab, selected: inboxTabSelected }} />
            <Label hidden>Inbox</Label>
          </NativeTabs.Trigger>
        </NativeTabs>
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
