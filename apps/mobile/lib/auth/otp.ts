import { supabase } from '@/lib/supabase/client';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sendEmailOtp(email: string) {
  const cleaned = normalizeEmail(email);
  const { error } = await supabase.auth.signInWithOtp({
    email: cleaned,
    options: { shouldCreateUser: true },
  });

  if (error) throw error;
  return cleaned;
}
