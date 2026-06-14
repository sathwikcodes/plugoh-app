import type { ConfigContext, ExpoConfig } from 'expo/config';
import { PREMIUM_MESH_CANVAS_HEX } from './constants/premium-mesh-canvas-hex.js';

const EAS_PROJECT_ID = 'f88efee0-4c94-48e4-916a-af5277b409f6';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: NonNullable<ExpoConfig['plugins']> = [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    ['expo-maps', { requestLocationPermission: false }],
    ['expo-web-browser', { experimentalLauncherActivity: false }],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: PREMIUM_MESH_CANVAS_HEX.deep,
      },
    ],
    'expo-font',
  ];

  return {
    ...config,
    name: 'plugoh-app',
    slug: 'plugoh',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'plugoh',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    extra: {
      ...config.extra,
      eas: {
        ...(config.extra?.eas as Record<string, unknown> | undefined),
        projectId: EAS_PROJECT_ID,
      },
    },
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'app.plugoh.mobile',
    },
    android: {
      ...config.android,
      package: config.android?.package ?? 'app.plugoh.mobile',
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey:
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
            process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
            process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      adaptiveIcon: {
        backgroundColor: '#000000',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      ...config.web,
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins,
    experiments: {
      ...config.experiments,
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
