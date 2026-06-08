import crownBadge from '@/assets/images/crown.png';
import lockBadge from '@/assets/images/lock.png';
import medalBadge from '@/assets/images/medal.png';
import snowBadge from '@/assets/images/snow.png';
import starBadge from '@/assets/images/star.png';
import type { InfluencerTier, TierBadgeCatalogItem } from '@/lib/influencer/home-tier';
import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import AnimatedGlow, { type PresetConfig } from 'react-native-animated-glow';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type TierAssetBadgeProps = {
  active: boolean;
  item: TierBadgeCatalogItem;
};

type BadgeTreatment = {
  glowHeight: number;
  glowRadius: number;
  glowTop: number;
  glowWidth: number;
  imageScale: number;
  translateY: number;
};

type GlowFragment = {
  height: number;
  key: string;
  left: number;
  opacity?: number;
  radius: number;
  rotate?: string;
  top: number;
  width: number;
};

type SilhouetteGlow = {
  blurRadius?: number;
  meshOpacity?: number;
  opacity: number;
  scale: number;
  softBlurRadius?: number;
  softOpacity?: number;
  softScale?: number;
  tintColor: string;
  trailDuration?: number;
  trailOpacity?: number;
  trailRotation?: string;
  trailScale?: number;
  translateY?: number;
};

type GlowMeshParticle = {
  height: number;
  key: string;
  left: number;
  opacity: number;
  radius: number;
  rotate?: string;
  top: number;
  width: number;
};

const BADGE_ASSETS: Record<InfluencerTier, ImageSourcePropType> = {
  nano: medalBadge,
  micro: starBadge,
  mid: snowBadge,
  macro: crownBadge,
};

const GLOW_LAYER_SIZE = 236;
const SILHOUETTE_LAYER_SIZE = 222;

const GLOW_MESH_PARTICLES: GlowMeshParticle[] = [
  {
    key: 'mist-1',
    width: 78,
    height: 24,
    left: 34,
    top: 42,
    opacity: 0.16,
    radius: 12,
    rotate: '-23deg',
  },
  {
    key: 'mist-2',
    width: 96,
    height: 30,
    left: 84,
    top: 32,
    opacity: 0.12,
    radius: 15,
    rotate: '17deg',
  },
  {
    key: 'mist-3',
    width: 68,
    height: 20,
    left: 110,
    top: 150,
    opacity: 0.13,
    radius: 10,
    rotate: '-19deg',
  },
  { key: 'grain-1', width: 3, height: 3, left: 42, top: 76, opacity: 0.34, radius: 2 },
  { key: 'grain-2', width: 2, height: 2, left: 62, top: 132, opacity: 0.28, radius: 1 },
  { key: 'grain-3', width: 4, height: 4, left: 100, top: 48, opacity: 0.3, radius: 2 },
  { key: 'grain-4', width: 2, height: 2, left: 138, top: 90, opacity: 0.26, radius: 1 },
  { key: 'grain-5', width: 3, height: 3, left: 174, top: 72, opacity: 0.32, radius: 2 },
  { key: 'grain-6', width: 2, height: 2, left: 158, top: 158, opacity: 0.24, radius: 1 },
  { key: 'grain-7', width: 3, height: 3, left: 78, top: 176, opacity: 0.25, radius: 2 },
  { key: 'grain-8', width: 2, height: 2, left: 190, top: 128, opacity: 0.22, radius: 1 },
];
const MACRO_GLOW_MESH_PARTICLES = GLOW_MESH_PARTICLES.filter(
  (particle) => particle.key !== 'mist-1' && particle.key !== 'mist-2',
);
const MICRO_GLOW_MESH_PARTICLES = MACRO_GLOW_MESH_PARTICLES;
const NANO_GLOW_MESH_PARTICLES = GLOW_MESH_PARTICLES.filter((particle) =>
  particle.key.startsWith('grain-'),
);

const BADGE_TREATMENTS: Record<InfluencerTier, BadgeTreatment> = {
  nano: {
    glowHeight: 162,
    glowRadius: 81,
    glowTop: 28,
    glowWidth: 162,
    imageScale: 1.02,
    translateY: -2,
  },
  micro: {
    glowHeight: 154,
    glowRadius: 48,
    glowTop: 34,
    glowWidth: 154,
    imageScale: 0.86,
    translateY: 0,
  },
  mid: {
    glowHeight: 160,
    glowRadius: 80,
    glowTop: 31,
    glowWidth: 160,
    imageScale: 0.92,
    translateY: 0,
  },
  macro: {
    glowHeight: 132,
    glowRadius: 48,
    glowTop: 58,
    glowWidth: 174,
    imageScale: 0.98,
    translateY: 8,
  },
};

const METALLIC_GLOW_PRESET: PresetConfig = {
  metadata: {
    name: 'Plugoh Metallic Badge Glow',
    textColor: '#FFFFFF',
    category: 'Achievement',
    tags: ['gold', 'metallic', 'badge'],
  },
  states: [
    {
      name: 'default',
      preset: {
        animationSpeed: 0.9,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderSpeedMultiplier: 0.7,
        cornerRadius: 90,
        outlineWidth: 0,
        glowLayers: [
          {
            glowPlacement: 'behind',
            colors: ['#8A5515', '#F2C45F', '#FFF2B8', '#B9781C'],
            glowSize: [6, 9, 7, 5],
            opacity: 0.16,
            speedMultiplier: 0.5,
            coverage: 0.78,
            relativeOffset: 0.14,
          },
          {
            glowPlacement: 'behind',
            colors: ['#FFF1B0', '#D69225', '#FFE7A6'],
            glowSize: [1.5, 3, 2, 1],
            opacity: 0.28,
            speedMultiplier: 0.9,
            coverage: 0.42,
            relativeOffset: 0.24,
          },
        ],
      },
    },
    {
      name: 'hover',
      transition: 260,
      preset: {
        animationSpeed: 1.25,
        glowLayers: [
          { glowSize: [9, 14, 10, 7], opacity: 0.24, coverage: 0.82 },
          { glowSize: [2, 4, 3, 1.5], opacity: 0.38, coverage: 0.48 },
        ],
      },
    },
    {
      name: 'press',
      transition: 140,
      preset: {
        animationSpeed: 1.6,
        glowLayers: [
          { glowSize: [10, 16, 11, 8], opacity: 0.28 },
          { glowSize: [2, 4.5, 3, 2], opacity: 0.44 },
        ],
      },
    },
  ],
};

const NANO_MEDAL_GLOW_PRESET: PresetConfig = {
  metadata: {
    name: 'Plugoh Nano Medal Edge Glow',
    textColor: '#FFFFFF',
    category: 'Achievement',
    tags: ['gold', 'metal', 'medal'],
  },
  states: [
    {
      name: 'default',
      preset: {
        animationSpeed: 0.8,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderSpeedMultiplier: 0.55,
        cornerRadius: 80,
        outlineWidth: 0,
        glowLayers: [
          {
            glowPlacement: 'behind',
            colors: ['#9A6219', '#E3AE3F', '#FFF0AA', '#B47721'],
            glowSize: [3, 5, 4, 3],
            opacity: 0.17,
            speedMultiplier: 0.45,
            coverage: 1,
            relativeOffset: 0,
          },
          {
            glowPlacement: 'behind',
            colors: ['#FFF3B4', '#D99424', '#FFE8A2'],
            glowSize: [1, 2.5, 2, 1],
            opacity: 0.3,
            speedMultiplier: 0.8,
            coverage: 0.24,
            relativeOffset: 0.12,
          },
        ],
      },
    },
    {
      name: 'hover',
      transition: 240,
      preset: {
        animationSpeed: 1.1,
        glowLayers: [
          { glowSize: [4, 7, 5, 4], opacity: 0.24 },
          { glowSize: [1.5, 3.5, 2.5, 1.5], opacity: 0.4 },
        ],
      },
    },
    {
      name: 'press',
      transition: 140,
      preset: {
        animationSpeed: 1.4,
        glowLayers: [
          { glowSize: [5, 8, 6, 5], opacity: 0.28 },
          { glowSize: [2, 4, 3, 2], opacity: 0.44 },
        ],
      },
    },
  ],
};

const MICRO_STAR_GLOW_PRESET: PresetConfig = {
  metadata: {
    name: 'Plugoh Micro Star Point Glow',
    textColor: '#FFFFFF',
    category: 'Achievement',
    tags: ['gold', 'star', 'points'],
  },
  states: [
    {
      name: 'default',
      preset: {
        animationSpeed: 0.95,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderSpeedMultiplier: 0.7,
        cornerRadius: 18,
        outlineWidth: 0,
        glowLayers: [
          {
            glowPlacement: 'behind',
            colors: ['#8D5012', '#D99424', '#FFF1A8', '#B96F17'],
            glowSize: [1.4, 2.4, 1.8, 1.4],
            opacity: 0.12,
            speedMultiplier: 0.4,
            coverage: 1,
            relativeOffset: 0,
          },
          {
            glowPlacement: 'behind',
            colors: ['#FFF6C4', '#E6A536', '#FFE2A0'],
            glowSize: [0.6, 1.4, 1, 0.6],
            opacity: 0.2,
            speedMultiplier: 0.72,
            coverage: 1,
            relativeOffset: 0,
          },
        ],
      },
    },
    {
      name: 'hover',
      transition: 240,
      preset: {
        animationSpeed: 1.25,
        glowLayers: [
          { glowSize: [2, 3.5, 2.5, 2], opacity: 0.2, coverage: 1 },
          { glowSize: [0.8, 2, 1.4, 0.8], opacity: 0.3, coverage: 1 },
        ],
      },
    },
    {
      name: 'press',
      transition: 140,
      preset: {
        animationSpeed: 1.5,
        glowLayers: [
          { glowSize: [2.5, 4, 3, 2.5], opacity: 0.24 },
          { glowSize: [1, 2.4, 1.8, 1], opacity: 0.34 },
        ],
      },
    },
  ],
};

const BADGE_GLOW_PRESETS: Partial<Record<InfluencerTier, PresetConfig>> = {
  nano: NANO_MEDAL_GLOW_PRESET,
  micro: MICRO_STAR_GLOW_PRESET,
};

const BADGE_SILHOUETTE_GLOWS: Partial<Record<InfluencerTier, SilhouetteGlow>> = {
  nano: {
    blurRadius: 7,
    meshOpacity: 0.16,
    opacity: 0.26,
    scale: 0.98,
    softBlurRadius: 14,
    softOpacity: 0.14,
    softScale: 1.08,
    tintColor: '#F6D176',
    trailDuration: 2350,
    trailOpacity: 0.62,
    trailRotation: '-18deg',
    trailScale: 1.12,
    translateY: -2,
  },
  micro: {
    blurRadius: 7,
    meshOpacity: 0.2,
    opacity: 0.4,
    scale: 0.96,
    softBlurRadius: 14,
    softOpacity: 0.18,
    softScale: 1.08,
    tintColor: '#F4B83F',
    trailDuration: 2200,
    trailOpacity: 0.62,
    trailRotation: '-18deg',
    trailScale: 1.03,
  },
  mid: {
    blurRadius: 8,
    meshOpacity: 0.16,
    opacity: 0.26,
    scale: 0.98,
    softBlurRadius: 15,
    softOpacity: 0.15,
    softScale: 1.1,
    tintColor: '#FFE7A1',
    trailDuration: 2400,
    trailOpacity: 0.5,
    trailRotation: '-22deg',
    trailScale: 1.02,
  },
  macro: {
    blurRadius: 7,
    meshOpacity: 0.16,
    opacity: 0.22,
    scale: 1.04,
    softBlurRadius: 14,
    softOpacity: 0.13,
    softScale: 1.08,
    tintColor: '#FFD56E',
    trailDuration: 2300,
    trailOpacity: 0.54,
    trailRotation: '-14deg',
    trailScale: 1.04,
    translateY: 8,
  },
};

const BADGE_GLOW_FRAGMENTS: Partial<Record<InfluencerTier, GlowFragment[]>> = {
  nano: [],
  micro: [],
  mid: [],
  macro: [],
};

export const TierAssetBadge = memo(function TierAssetBadge({ active, item }: TierAssetBadgeProps) {
  const treatment = BADGE_TREATMENTS[item.key];
  const locked = !item.unlocked;
  const badgeOpacity = locked ? 0.32 : 1;
  const glowFragments = BADGE_GLOW_FRAGMENTS[item.key] ?? [
    {
      key: item.key,
      width: treatment.glowWidth,
      height: treatment.glowHeight,
      left: (GLOW_LAYER_SIZE - treatment.glowWidth) / 2,
      top: treatment.glowTop,
      radius: treatment.glowRadius,
    },
  ];
  const glowPreset = BADGE_GLOW_PRESETS[item.key] ?? METALLIC_GLOW_PRESET;
  const silhouetteGlow = BADGE_SILHOUETTE_GLOWS[item.key];
  const meshParticles =
    item.key === 'macro'
      ? MACRO_GLOW_MESH_PARTICLES
      : item.key === 'micro'
        ? MICRO_GLOW_MESH_PARTICLES
        : item.key === 'nano'
          ? NANO_GLOW_MESH_PARTICLES
          : GLOW_MESH_PARTICLES;
  const silhouetteScale = (silhouetteGlow?.scale ?? 1) * (active ? 1 : 0.96);
  const softSilhouetteScale =
    (silhouetteGlow?.softScale ?? silhouetteGlow?.scale ?? 1) * (active ? 1 : 0.96);
  const trailScale =
    (silhouetteGlow?.trailScale ?? silhouetteGlow?.scale ?? 1) * (active ? 1 : 0.96);
  const silhouetteTranslateY = silhouetteGlow?.translateY ?? 0;
  const meshScale = softSilhouetteScale * 0.99;
  const trailProgress = useSharedValue(0);

  useEffect(() => {
    if (locked || !active || !silhouetteGlow?.trailOpacity) {
      trailProgress.value = withTiming(0, { duration: 180 });
      return;
    }

    trailProgress.value = 0;
    trailProgress.value = withRepeat(
      withTiming(1, {
        duration: silhouetteGlow.trailDuration ?? 2300,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [active, locked, silhouetteGlow, trailProgress]);

  const silhouetteAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: silhouetteTranslateY }, { scale: silhouetteScale }],
    }),
    [silhouetteScale, silhouetteTranslateY],
  );
  const softSilhouetteAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: silhouetteTranslateY }, { scale: softSilhouetteScale }],
    }),
    [silhouetteTranslateY, softSilhouetteScale],
  );
  const trailRotation = silhouetteGlow?.trailRotation ?? '-18deg';
  const trailAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: -150 + trailProgress.value * 332 }, { rotate: trailRotation }],
    }),
    [trailRotation],
  );
  const trailWrapAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: silhouetteTranslateY }, { scale: trailScale }],
    }),
    [silhouetteTranslateY, trailScale],
  );

  return (
    <View
      style={styles.stage}
      accessible
      accessibilityLabel={`${item.label} tier badge${item.unlocked ? '' : ', locked'}`}
    >
      {!locked ? (
        <View pointerEvents="none" style={styles.glowLayer}>
          {silhouetteGlow ? (
            <>
              {silhouetteGlow.meshOpacity ? (
                <View
                  style={[
                    styles.meshLayer,
                    {
                      opacity: active
                        ? silhouetteGlow.meshOpacity
                        : silhouetteGlow.meshOpacity * 0.45,
                      transform: [{ translateY: silhouetteTranslateY }, { scale: meshScale }],
                    },
                  ]}
                >
                  {meshParticles.map((particle) => (
                    <View
                      key={particle.key}
                      style={[
                        styles.meshParticle,
                        {
                          backgroundColor: silhouetteGlow.tintColor,
                          borderRadius: particle.radius,
                          height: particle.height,
                          left: particle.left,
                          opacity: particle.opacity,
                          shadowColor: silhouetteGlow.tintColor,
                          top: particle.top,
                          transform: particle.rotate ? [{ rotate: particle.rotate }] : undefined,
                          width: particle.width,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
              {silhouetteGlow.softOpacity ? (
                <Animated.View style={[styles.silhouetteGlowWrap, softSilhouetteAnimatedStyle]}>
                  <Image
                    source={BADGE_ASSETS[item.key]}
                    style={[
                      styles.silhouetteGlow,
                      {
                        opacity: active
                          ? silhouetteGlow.softOpacity
                          : silhouetteGlow.softOpacity * 0.58,
                      },
                    ]}
                    contentFit="contain"
                    blurRadius={silhouetteGlow.softBlurRadius ?? 12}
                    tintColor={silhouetteGlow.tintColor}
                    accessibilityElementsHidden
                    accessibilityIgnoresInvertColors
                    importantForAccessibility="no-hide-descendants"
                  />
                </Animated.View>
              ) : null}
              <Animated.View style={[styles.silhouetteGlowWrap, silhouetteAnimatedStyle]}>
                <Image
                  source={BADGE_ASSETS[item.key]}
                  style={[
                    styles.silhouetteGlow,
                    {
                      opacity: active ? silhouetteGlow.opacity : silhouetteGlow.opacity * 0.58,
                    },
                  ]}
                  contentFit="contain"
                  blurRadius={silhouetteGlow.blurRadius ?? 6}
                  tintColor={silhouetteGlow.tintColor}
                  accessibilityElementsHidden
                  accessibilityIgnoresInvertColors
                  importantForAccessibility="no-hide-descendants"
                />
              </Animated.View>
              {silhouetteGlow.trailOpacity ? (
                <Animated.View
                  style={[
                    styles.silhouetteGlowWrap,
                    {
                      opacity: active ? silhouetteGlow.trailOpacity : 0,
                    },
                    trailWrapAnimatedStyle,
                  ]}
                >
                  <MaskedView
                    style={styles.trailMask}
                    maskElement={
                      <View style={styles.trailMask}>
                        <Image
                          source={BADGE_ASSETS[item.key]}
                          style={styles.silhouetteGlow}
                          contentFit="contain"
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        />
                      </View>
                    }
                  >
                    <Animated.View style={[styles.trailSweep, trailAnimatedStyle]}>
                      <LinearGradient
                        colors={[
                          'rgba(255, 233, 150, 0)',
                          'rgba(255, 244, 198, 0.14)',
                          'rgba(255, 255, 245, 0.95)',
                          'rgba(255, 205, 92, 0.3)',
                          'rgba(255, 233, 150, 0)',
                        ]}
                        locations={[0, 0.28, 0.5, 0.68, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.trailGradient}
                      />
                    </Animated.View>
                  </MaskedView>
                </Animated.View>
              ) : null}
            </>
          ) : null}
          {glowFragments.map((fragment) => (
            <AnimatedGlow
              key={fragment.key}
              activeState={active ? 'hover' : 'default'}
              isVisible
              preset={glowPreset}
              style={[
                styles.animatedGlow,
                {
                  height: fragment.height,
                  left: fragment.left,
                  opacity: fragment.opacity ?? 1,
                  top: fragment.top,
                  transform: fragment.rotate ? [{ rotate: fragment.rotate }] : undefined,
                  width: fragment.width,
                },
              ]}
              wrapperStyle={[
                styles.glowMask,
                {
                  borderRadius: fragment.radius,
                },
              ]}
              cornerRadius={fragment.radius}
            >
              <View style={styles.glowShape} />
            </AnimatedGlow>
          ))}
        </View>
      ) : null}

      <View
        style={[
          styles.imageShadow,
          {
            opacity: badgeOpacity,
            shadowColor: '#F7C75E',
            shadowOpacity: locked ? 0 : active ? 0.3 : 0.1,
            transform: [
              { translateY: treatment.translateY },
              { scale: treatment.imageScale * (active ? 1 : 0.96) },
            ],
          },
        ]}
      >
        <Image
          source={BADGE_ASSETS[item.key]}
          style={styles.badgeImage}
          contentFit="contain"
          blurRadius={locked ? 5 : 0}
          transition={160}
          cachePolicy="memory-disk"
          priority={active ? 'high' : 'normal'}
          accessibilityIgnoresInvertColors
        />
      </View>

      {locked ? (
        <View pointerEvents="none" style={styles.lockOverlay}>
          <Image
            source={lockBadge}
            style={styles.lockAura}
            contentFit="contain"
            blurRadius={5}
            tintColor="#F8D26A"
            accessibilityElementsHidden
            accessibilityIgnoresInvertColors
            importantForAccessibility="no-hide-descendants"
          />
          <Image
            source={lockBadge}
            style={styles.lockImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={160}
            accessibilityElementsHidden
            accessibilityIgnoresInvertColors
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glowLayer: {
    position: 'absolute',
    width: GLOW_LAYER_SIZE,
    height: GLOW_LAYER_SIZE,
    alignItems: 'center',
  },
  animatedGlow: {
    position: 'absolute',
  },
  silhouetteGlowWrap: {
    position: 'absolute',
    width: SILHOUETTE_LAYER_SIZE,
    height: SILHOUETTE_LAYER_SIZE,
    top: 7,
    left: 7,
  },
  silhouetteGlow: {
    width: '100%',
    height: '100%',
  },
  meshLayer: {
    position: 'absolute',
    width: SILHOUETTE_LAYER_SIZE,
    height: SILHOUETTE_LAYER_SIZE,
    top: 7,
    left: 7,
  },
  meshParticle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 7,
  },
  trailMask: {
    width: '100%',
    height: '100%',
  },
  trailSweep: {
    position: 'absolute',
    top: -46,
    left: 0,
    width: 68,
    height: 314,
  },
  trailGradient: {
    width: '100%',
    height: '100%',
  },
  glowMask: {
    backgroundColor: 'transparent',
    height: '100%',
    overflow: 'visible',
    width: '100%',
  },
  glowShape: {
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
  },
  imageShadow: {
    width: 222,
    height: 222,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    position: 'absolute',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockAura: {
    position: 'absolute',
    width: 38,
    height: 38,
    opacity: 0.82,
  },
  lockImage: {
    width: 34,
    height: 34,
    shadowColor: '#F8D26A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 5,
  },
});
