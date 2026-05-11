import type { UserRole } from '@plugoh/contracts';

let preferredRole: UserRole | null = null;

export function setPreferredRole(role: UserRole | null) {
  preferredRole = role;
}

export function getPreferredRole() {
  return preferredRole;
}
