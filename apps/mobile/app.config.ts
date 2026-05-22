import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: NonNullable<ExpoConfig['plugins']> = [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    ['expo-web-browser', { experimentalLauncherActivity: false }],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
    'expo-font',
  ];

  return {
    ...config,
    name: 'plugoh-app',
    slug: 'plugoh-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'plugoh',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'app.plugoh.mobile',
    },
    android: {
      ...config.android,
      package: config.android?.package ?? 'app.plugoh.mobile',
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
