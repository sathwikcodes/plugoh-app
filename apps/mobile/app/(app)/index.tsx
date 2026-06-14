import { theme } from '@/constants/theme';
import { useBootstrap } from '@/hooks/use-marketplace';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AppIndexScreen() {
  const bootstrap = useBootstrap();
  if (bootstrap.isLoading || !bootstrap.data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.backgroundClear,
        }}
      >
        <ActivityIndicator color={theme.colors.accentStrong} />
      </View>
    );
  }
  if (bootstrap.data.role === 'business') return <Redirect href="/(app)/(brand-tabs)" />;
  return <Redirect href="/(app)/(tabs)" />;
}
