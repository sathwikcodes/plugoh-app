import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AccentHero, PrimaryButton, Screen, SectionTitle } from "@/components/ui/primitives";
import { theme } from "@/constants/theme";
import { useInfluencerProfile } from "@/hooks/use-marketplace";

export default function AiGeneratingScreen() {
  const profile = useInfluencerProfile();

  useEffect(() => {
    if (profile.data?.category && (profile.data.price_per_reel || profile.data.price_per_post || profile.data.price_per_story)) {
      router.replace("/(app)/(tabs)" as never);
    }
    const timer = setInterval(() => {
      void profile.refetch();
    }, 3000);
    const timeout = setTimeout(() => {
      router.replace("/(app)/(tabs)" as never);
    }, 60000);
    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [profile]);

  return (
    <Screen>
      <AccentHero title="Generating your profile" subtitle="We’re shaping a clean first version from your connected creator signals." />
      <SectionTitle title="AI is filling the gaps" subtitle="Category, pricing suggestions, and creator summary will appear automatically once ready." />
      <View style={{ alignItems: "center", paddingVertical: 40, gap: 16 }}>
        <ActivityIndicator color={theme.colors.accentStrong} size="large" />
        <Text style={{ ...theme.typography.body, color: theme.colors.muted, textAlign: "center" }}>
          This usually takes under a minute.
        </Text>
      </View>
      <PrimaryButton label="Continue manually" onPress={() => router.replace("/(app)/(tabs)" as never)} />
    </Screen>
  );
}
