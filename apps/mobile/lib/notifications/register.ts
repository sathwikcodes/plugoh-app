import { registerPush } from '@/lib/api/endpoints';
import Constants, { AppOwnership } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Push notifications are not supported in Expo Go (SDK 53+); only set up in real builds
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
  });
}

export function isPushRegistrationSupported(): boolean {
  return Device.isDevice && !isExpoGo;
}

export async function registerForPushNotificationsAsync() {
  if (!isPushRegistrationSupported()) return null;

  type PermStatus = { granted: boolean };
  const existing = (await Notifications.getPermissionsAsync()) as unknown as PermStatus;
  if (!existing.granted) {
    const result = (await Notifications.requestPermissionsAsync()) as unknown as PermStatus;
    if (!result.granted) return null;
  }

  type EasConfig = { projectId?: string };
  const projectId =
    (Constants.expoConfig?.extra as { eas?: EasConfig } | undefined)?.eas?.projectId ??
    (Constants.easConfig as EasConfig | undefined)?.projectId;

  if (!projectId) return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPush({
    expo_push_token: token.data,
    platform: Device.osName?.toLowerCase() === 'android' ? 'android' : 'ios',
  });
  return token.data;
}
