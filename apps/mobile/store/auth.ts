import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { bootstrapSession } from "@/lib/auth/session";

type AuthState = {
  initialized: boolean;
  session: Session | null;
  setSession: (session: Session | null) => void;
  setInitialized: (value: boolean) => void;
};

let authBootstrapped = false;
let authUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  session: null,
  setSession: (session) => {
    set({ session });
  },
  setInitialized: (initialized) => {
    set({ initialized });
  },
}));

export function initializeAuth() {
  if (authBootstrapped) return;
  authBootstrapped = true;
  const { setSession, setInitialized } = useAuthStore.getState();

  void bootstrapSession((session) => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().setInitialized(true);
  })
    .then(({ subscription }) => {
      authUnsubscribe = () => {
        subscription.unsubscribe();
      };
    })
    .catch((error: unknown) => {
      console.warn("Auth bootstrap failed", error);
      setSession(null);
      setInitialized(true);
    });
}

export function teardownAuth() {
  authUnsubscribe?.();
  authUnsubscribe = null;
  authBootstrapped = false;
}
