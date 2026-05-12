import { GlassSearchField } from '@/components/ui/glass-search-field';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { Screen } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useInfluencerProfile } from '@/hooks/use-marketplace';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

export default function InboxScreen() {
  const [query, setQuery] = useState('');
  const influencerProfile = useInfluencerProfile();

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
        }}
      >
        <Text
          style={{
            ...theme.typography.title,
            color: theme.colors.foreground,
            flex: 1,
          }}
          numberOfLines={1}
        >
          Inbox
        </Text>
        <NativeIconButton
          symbol="person.circle"
          fallbackIcon="person-circle-outline"
          variant="glass"
          haptic="light"
          size={44}
          symbolSize={20}
          imageUri={influencerProfile.data?.profile_photo_url}
          onPress={() => {
            router.push('/(app)/profile');
          }}
        />
      </View>

      <GlassSearchField value={query} onChangeText={setQuery} placeholder="Search inbox" />
    </Screen>
  );
}
