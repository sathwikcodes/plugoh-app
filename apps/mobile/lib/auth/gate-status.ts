import type { OnboardingStage } from "@plugoh/contracts";

type GateInput = {
  initialized: boolean;
  hasSession: boolean;
  bootstrapLoading: boolean;
  bootstrapError: boolean;
  onboardingStage?: OnboardingStage | null;
};

export type GateStatus = "loading" | "unauthenticated" | "error" | OnboardingStage;

export function resolveGateStatus(input: GateInput): GateStatus {
  if (!input.initialized) return "loading";
  if (!input.hasSession) return "unauthenticated";
  if (input.bootstrapLoading) return "loading";
  if (input.bootstrapError) return "error";
  if (!input.onboardingStage) return "error";
  return input.onboardingStage;
}
