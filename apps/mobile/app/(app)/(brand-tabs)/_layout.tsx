import { NativeIconButton } from '@/components/ui/native-icon-button';
import { useRouter } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BrandTabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <NativeTabs
        blurEffect="systemUltraThinMaterialDark"
        backgroundColor="rgba(0,0,0,0.85)"
        iconColor={{ default: '#8A7040', selected: '#FFFFFF' }}
        tintColor="#FFFFFF"
        labelStyle={{ color: '#9A8A83', fontSize: 11, fontWeight: '600' }}
        disableTransparentOnScrollEdge
      >
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
    backgroundColor: '#000000',
  },
});
