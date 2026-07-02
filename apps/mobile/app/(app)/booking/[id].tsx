import { BookingScreen } from '@/components/screens/booking-screen';
import { useLocalSearchParams } from 'expo-router';

export default function BookingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookingScreen influencerId={id} />;
}
