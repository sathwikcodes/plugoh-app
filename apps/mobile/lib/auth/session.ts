import type { Session, Subscription } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type SessionHandler = (session: Session | null) => void;

type SessionBootstrapResult = {
  subscription: Subscription;
};

export async function bootstrapSession(onSession: SessionHandler): Promise<SessionBootstrapResult> {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSession(session ?? null);
  });

  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.warn("Supabase getSession failed", error);
    }
  } catch (error) {
    console.warn("Supabase getSession threw unexpectedly", error);
  }

  return {
    subscription: data.subscription,
  };
}
