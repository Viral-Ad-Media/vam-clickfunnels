// lib/clickfunnels/server.ts
import "server-only";
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function validateEnv() {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

export async function getServerSupabase(): Promise<SupabaseClient> {
  validateEnv();
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Missing Supabase anon key");

  const cookieStore = await nextCookies(); // <-- await it

  // Read-only cookie store in RSC; no-ops for set/remove are fine for our use.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
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
  if (error) {
    const message = error.message.toLowerCase();
    const isMissingSession =
      message.includes("auth session missing") ||
      message.includes("session missing") ||
      message.includes("invalid jwt");

    if (isMissingSession) return null;
    throw new Error(`Failed to load authenticated user: ${error.message}`);
  }
  return data.user?.id ?? null;
}
