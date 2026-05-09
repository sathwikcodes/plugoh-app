import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, PrimaryButton, Screen, SectionTitle, StatusChip } from "@/components/ui/primitives";
import { theme } from "@/constants/theme";
import { logout } from "@/lib/auth/logout";
import { useInfluencerProfile, useMarketplaceMutations } from "@/hooks/use-marketplace";

const actions = [
  { label: "Edit profile", href: "/(app)/profile/edit" },
  { label: "Pricing", href: "/(app)/profile/pricing" },
  { label: "Instagram", href: "/(app)/profile/instagram" },
  { label: "Payout", href: "/(app)/profile/payout" },
  { label: "Settings", href: "/(app)/profile/settings" },
] as const;

export default function ProfileScreen() {
  const profile = useInfluencerProfile();
  const mutations = useMarketplaceMutations();

  return (
    <Screen>
      <SectionTitle title={profile.data?.display_name ?? "Your profile"} subtitle={profile.data?.bio ?? "Refine your creator presence and marketplace readiness."} />
      <Card>
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Category</Text>
        <Text style={{ ...theme.typography.section, color: theme.colors.foreground }}>{profile.data?.category ?? "Unassigned"}</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <StatusChip label={profile.data?.instagram_connected ? "Instagram linked" : "Instagram not linked"} status={profile.data?.instagram_connected ? "success" : "pending"} />
          <StatusChip label={profile.data?.is_active ? "Available" : "Paused"} status={profile.data?.is_active ? "success" : "pending"} />
        </View>
      </Card>
      <Card>
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Starting rates</Text>
          <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
            Reel ₹{Math.round(profile.data?.price_per_reel ?? 0).toLocaleString("en-IN")} · Post ₹{Math.round(profile.data?.price_per_post ?? 0).toLocaleString("en-IN")} · Story ₹{Math.round(profile.data?.price_per_story ?? 0).toLocaleString("en-IN")}
          </Text>
      </Card>
      {actions.map((action) => (
        <Pressable key={action.href} onPress={() => router.push(action.href as never)}>
          <Card>
            <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>{action.label}</Text>
          </Card>
        </Pressable>
      ))}
      <PrimaryButton
        label={mutations.updateAvailability.isPending ? "Updating..." : profile.data?.is_active ? "Pause availability" : "Go live"}
        onPress={() => mutations.updateAvailability.mutate(!(profile.data?.is_active ?? false))}
      />
      <PrimaryButton
        label="Sign out"
        onPress={logout}
      />
    </Screen>
  );
}
