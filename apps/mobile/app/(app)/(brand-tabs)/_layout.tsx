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
            <Icon sf={{ default: 'house', selected: 'house.fill' }} />
            <Label hidden>Home</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="discover">
            <Icon
              sf={{ default: 'magnifyingglass.circle', selected: 'magnifyingglass.circle.fill' }}
            />
            <Label hidden>Find</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="campaigns">
            <Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
            <Label hidden>Work</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="inbox">
            <Icon
              sf={{
                default: 'bubble.left.and.bubble.right',
                selected: 'bubble.left.and.bubble.right.fill',
              }}
            />
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
