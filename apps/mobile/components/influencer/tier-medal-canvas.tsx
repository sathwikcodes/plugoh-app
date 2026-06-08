import { TierMedalScene } from '@/components/influencer/tier-medal-scene';
import type { TierBadgeCatalogItem } from '@/lib/influencer/home-tier';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type TierMedalCanvasProps = {
  item: TierBadgeCatalogItem;
  active: boolean;
};

type R3FNativeModule = typeof import('@react-three/fiber/native');

let native3DModule: R3FNativeModule | null | undefined;
let native3DModulePromise: Promise<R3FNativeModule | null> | null = null;

function loadNative3DModule() {
  if (native3DModule !== undefined) return Promise.resolve(native3DModule);
  native3DModulePromise ??= import('@react-three/fiber/native')
    .then((module) => {
      native3DModule = module;
      return module;
    })
    .catch(() => {
      native3DModule = null;
      return null;
    });
  return native3DModulePromise;
}

export function TierMedalCanvas({ item, active }: TierMedalCanvasProps) {
  const locked = !item.unlocked;
  const [r3fNative, setR3fNative] = useState<R3FNativeModule | null>(native3DModule ?? null);

  useEffect(() => {
    let mounted = true;

    void loadNative3DModule().then((module) => {
      if (mounted) setR3fNative(module);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const Canvas = r3fNative?.Canvas;
  const useFrame = r3fNative?.useFrame;

  return (
    <View
      style={styles.stage}
      accessibilityLabel={`${item.label} tier badge, ${locked ? 'locked' : 'unlocked'}`}
    >
      <LinearGradient
        colors={[
          `${item.visual.glow}${locked ? '18' : '36'}`,
          'rgba(255,255,255,0.035)',
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.42, 1]}
        style={styles.glow}
      />
      {Canvas && useFrame ? (
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 34 }}
          frameloop={active ? 'always' : 'demand'}
          gl={{ alpha: true, antialias: true }}
          pointerEvents="none"
          style={styles.canvas}
        >
          <TierMedalScene
            visual={item.visual}
            active={active}
            locked={locked}
            useFrame={useFrame}
          />
        </Canvas>
      ) : (
        <FallbackMedal item={item} />
      )}
    </View>
  );
}

function FallbackMedal({ item }: { item: TierBadgeCatalogItem }) {
  const locked = !item.unlocked;
  const id = `tier-${item.key}`;

  return (
    <View style={[styles.fallbackMedal, locked ? styles.fallbackLocked : null]}>
      <Svg width={210} height={210} viewBox="0 0 210 210">
        <Defs>
          <SvgLinearGradient id={`${id}-rim`} x1="32" y1="18" x2="176" y2="174">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.98" />
            <Stop offset="0.16" stopColor={item.visual.rim} stopOpacity="1" />
            <Stop offset="0.36" stopColor={item.visual.accent} stopOpacity="0.96" />
            <Stop offset="0.68" stopColor={item.visual.face} stopOpacity="1" />
            <Stop offset="1" stopColor={item.visual.shadow} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`${id}-edge`} x1="104" y1="36" x2="104" y2="190">
            <Stop offset="0" stopColor={item.visual.rim} stopOpacity="0.55" />
            <Stop offset="0.5" stopColor={item.visual.face} stopOpacity="0.94" />
            <Stop offset="1" stopColor={item.visual.shadow} stopOpacity="1" />
          </SvgLinearGradient>
          <RadialGradient id={`${id}-face`} cx="38%" cy="28%" r="72%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.82" />
            <Stop offset="0.22" stopColor={item.visual.glow} stopOpacity="0.9" />
            <Stop offset="0.58" stopColor={item.visual.face} stopOpacity="0.98" />
            <Stop offset="1" stopColor={item.visual.shadow} stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id={`${id}-center`} cx="36%" cy="25%" r="75%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.72" />
            <Stop offset="0.24" stopColor={item.visual.rim} stopOpacity="0.9" />
            <Stop offset="0.68" stopColor={item.visual.face} stopOpacity="0.96" />
            <Stop offset="1" stopColor={item.visual.shadow} stopOpacity="0.92" />
          </RadialGradient>
          <SvgLinearGradient id={`${id}-shine`} x1="42" y1="34" x2="142" y2="108">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.74" />
            <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`${id}-slash`} x1="54" y1="136" x2="154" y2="68">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.13" />
            <Stop offset="0.45" stopColor="#000000" stopOpacity="0.04" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.16" />
          </SvgLinearGradient>
        </Defs>

        <Ellipse cx="105" cy="181" rx="63" ry="13" fill={item.visual.shadow} opacity="0.36" />
        <Path
          d="M35 106 C35 58 66 24 106 24 C151 24 181 59 181 106 C181 151 153 183 106 186 C60 183 35 151 35 106Z"
          fill={`url(#${id}-edge)`}
          opacity="0.76"
        />
        <Circle cx="105" cy="96" r="83" fill={`url(#${id}-rim)`} />
        <Circle
          cx="105"
          cy="96"
          r="80"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.5"
          strokeWidth="1.4"
        />
        <Circle cx="105" cy="96" r="70" fill={`url(#${id}-face)`} />
        <Circle
          cx="105"
          cy="96"
          r="69"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.28"
          strokeWidth="1"
        />
        <Circle
          cx="105"
          cy="96"
          r="54"
          fill="none"
          stroke={item.visual.rim}
          strokeOpacity="0.34"
          strokeWidth="1.5"
        />
        <Circle
          cx="105"
          cy="96"
          r="39"
          fill="none"
          stroke={item.visual.accent}
          strokeOpacity="0.42"
          strokeWidth="1.2"
        />
        <G>
          <Circle cx="105" cy="96" r="31" fill={`url(#${id}-center)`} />
          <Circle
            cx="105"
            cy="96"
            r="30"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.32"
            strokeWidth="1"
          />
          <Circle cx="105" cy="96" r="18" fill={item.visual.shadow} opacity="0.1" />
        </G>
        <Path
          d="M54 137 C82 116 119 98 159 77 C142 116 101 145 54 137Z"
          fill={`url(#${id}-slash)`}
          opacity="0.55"
        />
        <Path
          d="M48 82 C55 52 85 34 119 39 C98 44 72 59 57 91 C53 89 50 86 48 82Z"
          fill={`url(#${id}-shine)`}
        />
        <Path
          d="M37 111 C42 151 72 174 110 176 C148 174 175 149 179 110"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.28"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Path
          d="M178 78 C189 118 173 162 136 179"
          fill="none"
          stroke={item.visual.shadow}
          strokeOpacity="0.32"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 236,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    width: 208,
    height: 208,
    borderRadius: 104,
    opacity: 0.92,
  },
  canvas: {
    width: 236,
    height: 236,
  },
  fallbackMedal: {
    width: 210,
    height: 210,
    transform: [{ perspective: 900 }, { rotateX: '7deg' }, { rotateZ: '-4deg' }],
  },
  fallbackLocked: {
    opacity: 0.62,
  },
});
