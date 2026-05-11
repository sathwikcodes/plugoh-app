import { router } from 'expo-router';
import { unregisterPush } from '@/lib/api/endpoints';
import { clearPendingBookingVerify } from '@/lib/payments/escrow-flow';
import { supabase } from '@/lib/supabase/client';

export async function logout() {
  try {
    await unregisterPush();
  } catch (error) {
    console.warn('Push unregister failed during logout', error);
  }

  await clearPendingBookingVerify();
  await supabase.auth.signOut();
  router.replace('/(auth)/login');
}
