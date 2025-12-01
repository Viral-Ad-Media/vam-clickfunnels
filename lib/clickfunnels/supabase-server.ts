// lib/clickfunnels/supabase-server.ts
import "server-only";
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (App Router).
 * We only need to READ cookies here; set/remove are no-ops in RSC.
 */
export function getServerSupabase(): SupabaseClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Call cookies() inline to avoid Promise vs. sync type headaches.
        get(name: string) {
          const store = (nextCookies as any)(); // supports both sync and promise-typed impls
          // If it were a promise-typed impl, at runtime it will still be sync in Node;
          // the optional chaining keeps TS happy either way.
          return store?.get?.(name)?.value;
        },
        set() { /* no-op */ },
        remove() { /* no-op */ },
      },
    }
  );
}

/** Convenience helper to fetch the current user id (or null). */
export async function getUserId(): Promise<string | null> {
  const sb = getServerSupabase();
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}
