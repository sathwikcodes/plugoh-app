import { NativeIconButton } from '@/components/ui/native-icon-button';
import { theme } from '@/constants/theme';
import { useBootstrap } from '@/hooks/use-marketplace';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import Octicons from '@expo/vector-icons/Octicons';
import { Redirect, useRouter, useSegments } from 'expo-router';
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
  type VectorIconProps,
} from 'expo-router/unstable-native-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_SELECTED = '#FF3CAC';
const TAB_BAR_ICON_DEFAULT = 'rgba(255, 255, 255, 0.45)';

/** Native tab titles are centered under each icon; size matches typical iOS tab bar caption (~11pt). */
const TAB_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: '600' as const,
};

/** FontAwesome6 is `any` in @expo/vector-icons types; narrow for VectorIcon + eslint. */
const FONT_AWESOME_6_FAMILY = FontAwesome6 as unknown as VectorIconProps<string>['family'];

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
      <NativeTabs
        blurEffect="systemChromeMaterialDark"
        disableTransparentOnScrollEdge
        iconColor={{ default: TAB_BAR_ICON_DEFAULT, selected: TAB_BAR_SELECTED }}
        labelStyle={{
          default: { ...TAB_LABEL_STYLE, color: TAB_BAR_ICON_DEFAULT },
          selected: { ...TAB_LABEL_STYLE, color: TAB_BAR_SELECTED },
        }}
        labelVisibilityMode="labeled"
      >
        <NativeTabs.Trigger name="index">
          <Icon
            src={{
              default: <VectorIcon family={Octicons} name="home" />,
              selected: <VectorIcon family={Octicons} name="home-fill" />,
            }}
          />
          <Label>Home</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="campaigns">
          <Icon src={<VectorIcon family={FONT_AWESOME_6_FAMILY} name="briefcase" />} />
          <Label>Campaigns</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="inbox">
          <Icon src={<VectorIcon family={Ionicons} name="chatbubbles" />} />
          <Label>Inbox</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="earnings">
          <Icon src={<VectorIcon family={Entypo} name="wallet" />} />
          <Label>Earnings</Label>
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
