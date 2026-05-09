import { router } from "expo-router";
import { Text, View } from "react-native";
import { PrimaryButton, Screen, SecondaryButton, SectionTitle } from "@/components/ui/primitives";
import { theme } from "@/constants/theme";
import { getApiBaseUrl } from "@/lib/api/client";
import { supabase } from "@/lib/supabase/client";

export function BootstrapErrorScreen({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <Screen>
      <SectionTitle
        eyebrow="Connection problem"
        title="The app could not finish startup"
        subtitle="Auth succeeded, but the app could not load your Plugoh bootstrap state from the API."
      />
      <View
        style={{
          borderRadius: theme.radius.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceBlush,
          padding: theme.spacing.xl,
          gap: theme.spacing.md,
        }}
      >
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>API base URL</Text>
        <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>{getApiBaseUrl()}</Text>
        {message ? (
          <>
            <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Error</Text>
            <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>{message}</Text>
          </>
        ) : null}
      </View>
      <PrimaryButton label="Retry" onPress={onRetry} />
      <SecondaryButton
        label="Sign out"
        onPress={() => {
          void supabase.auth.signOut().finally(() => {
            router.replace("/(auth)/login");
          });
        }}
      />
    </Screen>
  );
}
