// lib/clickfunnels/tokens.ts
import "server-only";
import { getServerSupabase, getUserId } from "./supabase-server";

export type CfToken = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_at: number; // unix seconds
  scope?: string | null;
};

export async function getAppConfig(userId: string) {
  const sb = getServerSupabase();
  const { data } = await sb.from("clickfunnels_apps").select("*").eq("user_id", userId).single();
  return data as { user_id: string; client_id: string; client_secret: string; workspace_url: string } | null;
}

export async function upsertAppConfig(userId: string, cfg: { client_id: string; client_secret: string; workspace_url: string }) {
  const sb = getServerSupabase();
  await sb.from("clickfunnels_apps").upsert({ user_id: userId, ...cfg, updated_at: new Date().toISOString() });
}

export async function getTokenForUser(userId: string) {
  const sb = getServerSupabase();
  const { data } = await sb.from("clickfunnels_tokens").select("*").eq("user_id", userId).single();
  return data as (CfToken & { user_id: string }) | null;
}

export function isExpired(tok: CfToken | null) {
  if (!tok) return true;
  const skew = 60; // 1 min clock skew
  return Math.floor(Date.now() / 1000) >= (tok.expires_at - skew);
}

export async function upsertToken(userId: string, tok: CfToken) {
  const sb = getServerSupabase();
  await sb.from("clickfunnels_tokens").upsert({
    user_id: userId,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    token_type: tok.token_type ?? "Bearer",
    scope: tok.scope ?? null,
    expires_at: tok.expires_at,
    updated_at: new Date().toISOString(),
  });
}

export async function ensureUserId() {
  const uid = await getUserId();
  if (!uid) throw new Error("Not authenticated");
  return uid;
}
