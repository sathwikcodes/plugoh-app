import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTransparent: true,
        headerTitle: "",
        headerRight: () => (
          <Pressable style={styles.headerProfileButton} onPress={() => router.push("/(app)/(tabs)/profile")}>
            <Ionicons name="person-circle-outline" size={22} color={theme.colors.foreground} />
          </Pressable>
        ),
        tabBarActiveTintColor: theme.colors.foreground,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveBackgroundColor: theme.colors.accentSoft,
        tabBarIconStyle: styles.tabIcon,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: Math.max(insets.bottom + 8, 12),
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        },
        tabBarBackground: () => <View style={styles.tabBackground} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size + 1} />,
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: "Campaigns",
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "briefcase" : "briefcase-outline"} color={color} size={size + 1} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} color={color} size={size + 1} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "wallet" : "wallet-outline"} color={color} size={size + 1} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: null,
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person-circle" : "person-circle-outline"} color={color} size={size + 1} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    ...theme.typography.label,
  },
  headerProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 14,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabItem: {
    borderRadius: theme.radius.pill,
    marginHorizontal: 2,
    marginVertical: 4,
  },
  tabIcon: {
    marginTop: 2,
  },
  tabBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
});
