import { Screen, SectionTitle } from '@/components/ui/primitives';

export default function SettingsScreen() {
  return (
    <Screen>
      <SectionTitle
        title="Notifications"
        subtitle="Push notifications are registered automatically after sign-in when permissions are granted."
      />
    </Screen>
  );
}
