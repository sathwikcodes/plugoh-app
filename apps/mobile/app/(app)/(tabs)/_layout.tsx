import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const isProfileRoute = pathname.endsWith('/profile');
  //deploy test

  return (
    <View style={styles.root}>
      <NativeTabs
        blurEffect="systemMaterialLight"
        backgroundColor="rgba(255,255,255,0.72)"
        iconColor={{ default: '#9E7218', selected: '#D7A323' }}
        tintColor="#D7A323"
        labelStyle={{ color: '#7D6A63', fontSize: 11, fontWeight: '600' }}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'house', selected: 'house.fill' }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="campaigns">
          <Icon sf={{ default: 'megaphone', selected: 'megaphone.fill' }} />
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

        <NativeTabs.Trigger name="earnings">
          <Icon sf={{ default: 'dollarsign.circle', selected: 'dollarsign.circle.fill' }} />
          <Label>Earn</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile" hidden>
          <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
          <Label>Me</Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      {!isProfileRoute ? (
        <Pressable
          style={[styles.headerProfileButton, { top: insets.top + 6 }]}
          onPress={() => {
            router.push('/(app)/(tabs)/profile');
          }}
        >
          <BlurView intensity={50} tint="systemMaterialLight" style={styles.headerGlass}>
            <Ionicons name="person-circle-outline" size={22} color={theme.colors.foreground} />
          </BlurView>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerProfileButton: {
    position: 'absolute',
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    zIndex: 50,
  },
  headerGlass: {
    flex: 1,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
});
