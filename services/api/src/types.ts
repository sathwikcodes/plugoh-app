import type { UserRole } from '@plugoh/contracts';
import type { Logger } from 'pino';

export type AuthUser = {
  id: string;
  email?: string;
  app_metadata?: {
    role?: UserRole;
  };
};

export type HonoVariables = {
  requestId: string;
  user?: AuthUser;
  role?: UserRole;
  authToken?: string;
  log?: Logger;
  requestStartMs?: number;
};

export type AppEnv = {
  Variables: HonoVariables;
};
