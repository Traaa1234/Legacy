import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/** Service-role client for server actions / route handlers that need full access. */
export function getServiceSupabase() {
  return createServerClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/** Anon client tied to the request's cookies. RLS will apply once enabled. */
export async function getRequestSupabase() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        for (const c of toSet) store.set(c.name, c.value, c.options);
      },
    },
  });
}
