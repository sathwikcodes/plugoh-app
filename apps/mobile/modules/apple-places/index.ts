import { requireOptionalNativeModule } from 'expo';

export type AppleCompletion = {
  id: number;
  title: string;
  subtitle: string;
};

export type ApplePlace = {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
};

type ApplePlacesNativeModule = {
  getCompletions(query: string): Promise<AppleCompletion[]>;
  resolveCompletion(id: number): Promise<ApplePlace>;
};

// Optional: absent on Android / Expo Go, present in iOS dev/release builds.
const ApplePlaces = requireOptionalNativeModule<ApplePlacesNativeModule>('ApplePlaces');

export const isApplePlacesAvailable = ApplePlaces != null;

/** Stream Apple Maps-style autocomplete suggestions for a query fragment. */
export async function getCompletions(query: string): Promise<AppleCompletion[]> {
  if (!ApplePlaces) return [];
  return ApplePlaces.getCompletions(query);
}

/** Resolve a chosen suggestion (by id from getCompletions) into coordinates + address. */
export async function resolveCompletion(id: number): Promise<ApplePlace | null> {
  if (!ApplePlaces) return null;
  return ApplePlaces.resolveCompletion(id);
}
