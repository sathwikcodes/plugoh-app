import { Redirect } from 'expo-router';
import { useBootstrap } from '@/hooks/use-marketplace';

export default function AppIndexScreen() {
  const bootstrap = useBootstrap();
  if (bootstrap.data?.role === 'business') return <Redirect href="/(app)/(brand-tabs)" />;
  return <Redirect href="/(app)/(tabs)" />;
}
