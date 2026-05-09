import { Text } from "react-native";
import { PrimaryButton, Screen, SectionTitle } from "@/components/ui/primitives";
import { logout } from "@/lib/auth/logout";

export default function SettingsScreen() {
  return (
    <Screen>
      <SectionTitle title="Settings" subtitle="Lightweight controls for notifications, availability, and secure logout." />
      <Text>Push notifications are registered automatically after sign-in when permissions are granted.</Text>
      <PrimaryButton label="Sign out" onPress={logout} />
    </Screen>
  );
}
