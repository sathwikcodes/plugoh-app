import { router } from "expo-router";
import { Alert, Text } from "react-native";
import { AccentHero, Card, PrimaryButton, Screen, SectionTitle, SecondaryButton } from "@/components/ui/primitives";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";

export default function LoginScreen() {
  const handleGoogle = async () => {
    const redirectTo = "plugoh://google-callback";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      Alert.alert("Google sign-in unavailable", error.message);
      return;
    }
    if (data.url) {
      router.push({ pathname: "/(auth)/google-callback", params: { url: data.url } });
    }
  };

  return (
    <Screen>
      <AccentHero title="Plugoh" subtitle="Creator marketplace operations in one place." />
      <SectionTitle title="Sign in to continue" subtitle="Use email OTP or Google to access your influencer workspace." />
      <Card>
        <PrimaryButton label="Continue with Email" onPress={() => router.push("/(auth)/email")} />
        <SecondaryButton label="Continue with Google" onPress={handleGoogle} />
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          By continuing, you agree to Terms and Privacy Policy.
        </Text>
      </Card>
    </Screen>
  );
}
