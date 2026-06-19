import { LocationPickerScreen } from '@/components/onboarding/location-picker-screen';
import { useBusinessProfile } from '@/hooks/use-marketplace';
import { setProfileLocationSelection } from '@/lib/profile/location-selection';

export default function ProfileLocationPickerRoute() {
  const profile = useBusinessProfile();
  const initialSelection =
    typeof profile.data?.brand_latitude === 'number' &&
    typeof profile.data.brand_longitude === 'number'
      ? {
          label: profile.data.brand_location ?? 'Selected location',
          latitude: profile.data.brand_latitude,
          longitude: profile.data.brand_longitude,
        }
      : null;

  return (
    <LocationPickerScreen
      title="Choose brand location"
      searchPlaceholder="Search brand address"
      confirmLabel="Use this location"
      initialSelection={initialSelection}
      onConfirm={setProfileLocationSelection}
    />
  );
}
