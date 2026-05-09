import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { BootstrapErrorScreen } from "@/components/bootstrap-error";
import { theme } from "@/constants/theme";
import { useGate } from "@/hooks/use-gate";

export default function AppLayout() {
  const gate = useGate();
  if (gate.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.accentStrong} />
      </View>
    );
  }
  if (gate.status === "error") {
    return (
      <BootstrapErrorScreen
        message={gate.bootstrap.error instanceof Error ? gate.bootstrap.error.message : "Unknown bootstrap error"}
        onRetry={() => {
          void gate.bootstrap.refetch();
        }}
      />
    );
  }
  if (gate.status === "unauthenticated") return <Redirect href="/(auth)/login" />;
  if (gate.status === "needs_basics") return <Redirect href="/(onboarding)/basics" />;
  if (gate.status === "needs_instagram") return <Redirect href="/(onboarding)/instagram-connect" />;
  if (gate.status === "ai_pending") return <Redirect href="/(onboarding)/ai-generating" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="campaigns/[id]" />
      <Stack.Screen name="inbox/[id]" />
      <Stack.Screen name="delivery/[campaignId]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/pricing" />
      <Stack.Screen name="profile/instagram" />
      <Stack.Screen name="profile/payout" />
      <Stack.Screen name="profile/settings" />
    </Stack>
  );
}
