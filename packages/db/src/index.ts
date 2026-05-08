import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

export type { Database } from './database.types.js';

export function createServerClient(url: string, serviceRoleKey: string) {
  return createClient<Database>(url, serviceRoleKey);
}

export function createUserClient(url: string, anonKey: string, jwt: string) {
  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}
