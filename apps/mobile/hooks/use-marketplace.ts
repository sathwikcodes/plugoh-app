/**
 * Barrel shim — marketplace hooks now live under `hooks/marketplace/` split by
 * domain. This re-export keeps the established `@/hooks/use-marketplace` import
 * path working; prefer importing from `@/hooks/marketplace` in new code.
 */
export * from './marketplace';
