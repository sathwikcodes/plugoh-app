import type { UserRole } from "@plugoh/contracts";

export type AuthUser = {
  id: string;
  email?: string;
};

export type HonoVariables = {
  requestId: string;
  user?: AuthUser;
  role?: UserRole;
};

export type AppEnv = {
  Variables: HonoVariables;
};
