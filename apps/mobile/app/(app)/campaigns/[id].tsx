import { router, useLocalSearchParams } from "expo-router";
import { Alert, Text, View } from "react-native";
import { Card, PrimaryButton, Screen, SectionTitle, SecondaryButton, StatusChip } from "@/components/ui/primitives";
import { theme } from "@/constants/theme";
import { useCampaign, useMarketplaceMutations } from "@/hooks/use-marketplace";

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaign = useCampaign(id);
  const mutations = useMarketplaceMutations();

  const handleDecline = async () => {
    try {
      await mutations.declineCampaign.mutateAsync(id);
      router.back();
    } catch (error) {
      Alert.alert("Could not decline", error instanceof Error ? error.message : "Try again.");
    }
  };

  const handleAccept = async () => {
    try {
      await mutations.acceptCampaign.mutateAsync(id);
      await campaign.refetch();
    } catch (error) {
      Alert.alert("Could not accept", error instanceof Error ? error.message : "Try again.");
    }
  };

  const item = campaign.data;
  const canRespond = item && ["requested", "payment_pending", "pre_authorized"].includes(item.status);
  const canDeliver = item && item.status === "in_escrow";

  return (
    <Screen>
      <SectionTitle title={item?.title ?? "Campaign"} subtitle={item?.business_profile?.brand_name ?? "Brand"} />
      <Card>
        <StatusChip label={item?.status?.replaceAll("_", " ") ?? "loading"} status={item?.status} />
        <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>{item?.brief ?? "No brief added yet."}</Text>
        <Text style={{ ...theme.typography.mono, color: theme.colors.foreground }}>₹{Math.round(item?.price_offered ?? 0).toLocaleString("en-IN")}</Text>
      </Card>
      <Card>
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Timeline</Text>
        <View style={{ gap: 10 }}>
          {["requested", "payment_pending", "in_escrow", "delivery_submitted", "completed"].map((step) => (
            <View key={step} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>{step.replaceAll("_", " ")}</Text>
              {item?.status === step ? <StatusChip label="Current" status={step} /> : null}
            </View>
          ))}
        </View>
      </Card>
      {canRespond ? (
        <View style={{ gap: 12 }}>
          <PrimaryButton label={mutations.acceptCampaign.isPending ? "Accepting..." : "Accept campaign"} onPress={handleAccept} />
          <SecondaryButton label="Decline request" onPress={handleDecline} />
        </View>
      ) : null}
      {canDeliver ? <PrimaryButton label="Submit delivery" onPress={() => router.push(`/(app)/delivery/${id}` as never)} /> : null}
    </Screen>
  );
}
