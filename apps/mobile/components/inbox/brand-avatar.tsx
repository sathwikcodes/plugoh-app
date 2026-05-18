import { theme } from '@/constants/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

type BrandAvatarProps = {
  imageUri?: string | null;
  name?: string | null;
  size?: number;
  textSize?: number;
};

function initials(name?: string | null): string {
  const value = name?.trim();
  if (!value) return '?';
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function BrandAvatar({ imageUri, name, size = 44, textSize = 16 }: BrandAvatarProps) {
  const radius = size / 2;
  const cleanImageUri = imageUri?.trim();

  return (
    <View style={[styles.shell, { width: size, height: size, borderRadius: radius }]}>
      {cleanImageUri ? (
        <Image
          source={{ uri: cleanImageUri }}
          style={[styles.image, { width: size, height: size, borderRadius: radius }]}
          contentFit="cover"
          transition={140}
        />
      ) : (
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={['#FF3CAC', '#FF3CAC', '#FFD700', '#FFD700']}
            locations={[0, 0.42, 0.68, 1]}
            start={{ x: 0.04, y: 0.12 }}
            end={{ x: 0.98, y: 0.78 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={[
              'rgba(255,60,172,0)',
              'rgba(255,60,172,0.22)',
              'rgba(255,215,0,0.36)',
              'rgba(255,215,0,0)',
            ]}
            locations={[0, 0.38, 0.62, 1]}
            start={{ x: 0.18, y: 1 }}
            end={{ x: 0.82, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.14)']}
            locations={[0, 0.48, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.grain} />
          <Text style={[styles.initials, { fontSize: textSize, lineHeight: size }]}>
            {initials(name)}
          </Text>
        </View>
      )}
      <View style={[styles.stroke, { borderRadius: radius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    flexShrink: 0,
    borderCurve: 'continuous',
    backgroundColor: '#FF3CAC',
  },
  image: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
    backgroundColor: 'rgba(255,255,255,0.24)',
    transform: [{ rotate: '18deg' }, { scaleX: 0.42 }],
  },
  initials: {
    ...theme.typography.cardTitle,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  stroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});
