import { theme } from '@/constants/theme';
import { campaignAvatarColor, TX_AVATAR_RADIUS, TX_AVATAR_SIZE } from '@/lib/influencer/earnings';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const CampaignAvatar = memo(function CampaignAvatar({
  imageUrl,
  title,
}: {
  imageUrl?: string;
  title: string;
}) {
  const color = campaignAvatarColor(title);
  const [imageFailed, setImageFailed] = useState(false);
  const sourceUrl = imageUrl?.trim();

  return (
    <View style={[styles.box, { backgroundColor: color + '22' }]}>
      {sourceUrl && !imageFailed ? (
        <Image
          source={{ uri: sourceUrl }}
          style={styles.image}
          contentFit="cover"
          accessibilityLabel={`${title} brand image`}
          accessibilityIgnoresInvertColors
          onError={() => {
            setImageFailed(true);
          }}
        />
      ) : (
        <Text style={[styles.letter, { color }]}>
          {title.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      )}
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
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  letter: {
    ...theme.typography.bodyStrong,
    fontWeight: '800',
  },
});
