import { useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { useBootstrap } from "@/hooks/use-marketplace";
import { resolveGateStatus } from "@/lib/auth/gate-status";

export function useGate() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const bootstrap = useBootstrap();

  return useMemo(() => {
    const status = resolveGateStatus({
      initialized,
      hasSession: Boolean(session),
      bootstrapLoading: bootstrap.isLoading,
      bootstrapError: bootstrap.isError,
      onboardingStage: bootstrap.data?.onboardingStage,
    });
    return { status, session, bootstrap };
  }, [bootstrap, initialized, session]);
}
