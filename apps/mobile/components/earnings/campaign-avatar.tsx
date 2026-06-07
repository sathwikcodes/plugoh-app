import { theme } from '@/constants/theme';
import { campaignAvatarColor, TX_AVATAR_RADIUS, TX_AVATAR_SIZE } from '@/lib/influencer/earnings';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const CampaignAvatar = memo(function CampaignAvatar({ title }: { title: string }) {
  const color = campaignAvatarColor(title);
  return (
    <View style={[styles.box, { backgroundColor: color + '22' }]}>
      <Text style={[styles.letter, { color }]}>{title.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    width: TX_AVATAR_SIZE,
    height: TX_AVATAR_SIZE,
    borderRadius: TX_AVATAR_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letter: {
    ...theme.typography.bodyStrong,
    fontWeight: '800',
  },
});
