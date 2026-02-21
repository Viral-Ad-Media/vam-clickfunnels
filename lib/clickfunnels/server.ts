// lib/clickfunnels/server.ts
import "server-only";
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function validateEnv() {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

export async function getServerSupabase(): Promise<SupabaseClient> {
  validateEnv();
  const cookieStore = await nextCookies(); // <-- await it

  // Read-only cookie store in RSC; no-ops for set/remove are fine for our use.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          /* no-op in RSC */
        },
        remove() {
          /* no-op in RSC */
        },
      },
    }
  );
}

export async function getUserId(): Promise<string | null> {
  const sb = await getServerSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error) throw new Error(`Failed to load authenticated user: ${error.message}`);
  return data.user?.id ?? null;
}
