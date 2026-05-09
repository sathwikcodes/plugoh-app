import { FlashList } from "@shopify/flash-list";
import { Text, View } from "react-native";
import { Card, EmptyState, Screen, SectionTitle, StatusChip } from "@/components/ui/primitives";
import { theme } from "@/constants/theme";
import { useEarnings } from "@/hooks/use-marketplace";

export default function EarningsScreen() {
  const earnings = useEarnings();

  return (
    <Screen>
      <SectionTitle title="Earnings" subtitle="See held funds, released income, and your current creator tier." />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Total earned</Text>
          <Text style={{ ...theme.typography.title, color: theme.colors.foreground }}>₹{Math.round(earnings.data?.total_earnings ?? 0).toLocaleString("en-IN")}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Pending</Text>
          <Text style={{ ...theme.typography.title, color: theme.colors.foreground }}>₹{Math.round(earnings.data?.pending_earnings ?? 0).toLocaleString("en-IN")}</Text>
        </Card>
      </View>
      <Card>
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Tier</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ ...theme.typography.section, color: theme.colors.foreground, textTransform: "capitalize" }}>{earnings.data?.tier ?? "nano"}</Text>
          <StatusChip label="Progress" status="success" />
        </View>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.colors.border }}>
          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: theme.colors.accentStrong,
              width: `${Math.max(8, Math.round((earnings.data?.tier_progress ?? 0) * 100))}%`,
            }}
          />
        </View>
      </Card>
      {(earnings.data?.transactions ?? []).length === 0 ? (
        <EmptyState title="No completed payouts yet" subtitle="Completed campaigns will appear here with release-ready financial history." />
      ) : (
        <FlashList
          data={earnings.data?.transactions ?? []}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>{item.title}</Text>
              <Text style={{ ...theme.typography.mono, color: theme.colors.foreground }}>₹{Math.round(item.amount ?? 0).toLocaleString("en-IN")}</Text>
              <StatusChip label={item.status.replaceAll("_", " ")} status={item.status} />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
