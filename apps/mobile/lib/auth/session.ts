import type { Session, Subscription } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type SessionHandler = (session: Session | null) => void;

type SessionBootstrapResult = {
  initialSession: Session | null;
  subscription: Subscription;
};

export async function bootstrapSession(onSession: SessionHandler): Promise<SessionBootstrapResult> {
  let initialSession: Session | null = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("Supabase getSession failed", error);
    } else {
      initialSession = data.session ?? null;
      onSession(initialSession);
    }
  } catch (error) {
    console.warn("Supabase getSession threw unexpectedly", error);
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSession(session ?? null);
  });

  return {
    initialSession,
    subscription: data.subscription,
  };
}
