import "server-only";
import {
  canManageOrganization,
  ensureActiveOrganizationForUser,
  type OrgRole,
} from "@/lib/orgs/server";
import { getServerSupabase, getUserId } from "./server";

type AppConfig = {
  organization_id: string;
  user_id: string;
  client_id: string;
  client_secret: string;
  workspace_url: string;
};

export type CfToken = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_at: number; // unix seconds
  scope?: string | null;
};

export type OrganizationContext = {
  userId: string;
  organizationId: string;
  organizationRole: OrgRole;
};

export async function ensureUserId() {
  const uid = await getUserId();
  if (!uid) {
    throw new Error("Not authenticated. Sign in to Supabase before using ClickFunnels routes.");
  }
  return uid;
}

export async function ensureOrganizationContext(options?: { requireManager?: boolean }): Promise<OrganizationContext> {
  const userId = await ensureUserId();
  const organization = await ensureActiveOrganizationForUser(userId);

  if (options?.requireManager && !canManageOrganization(organization.role)) {
    throw new Error("Organization admin access is required for this action.");
  }

  return {
    userId,
    organizationId: organization.id,
    organizationRole: organization.role,
  };
}

export async function getAppConfig(organizationId: string) {
  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from("clickfunnels_apps")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load ClickFunnels config: ${error.message}`);
  return data as AppConfig | null;
}

export async function upsertAppConfig(
  organizationId: string,
  userId: string,
  cfg: { client_id: string; client_secret: string; workspace_url: string },
) {
  const sb = await getServerSupabase();
  const { error } = await sb.from("clickfunnels_apps").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      ...cfg,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) throw new Error(`Failed to save ClickFunnels config: ${error.message}`);
}

export async function getTokenForOrganization(organizationId: string) {
  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from("clickfunnels_tokens")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load ClickFunnels token: ${error.message}`);
  return data as (CfToken & { organization_id: string; user_id: string }) | null;
}

export function isExpired(tok: CfToken | null) {
  if (!tok) return true;
  const skew = 60; // 1 min clock skew
  return Math.floor(Date.now() / 1000) >= tok.expires_at - skew;
}

export async function upsertToken(organizationId: string, userId: string, tok: CfToken) {
  const sb = await getServerSupabase();
  const { error } = await sb.from("clickfunnels_tokens").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      token_type: tok.token_type ?? "Bearer",
      scope: tok.scope ?? null,
      expires_at: tok.expires_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) throw new Error(`Failed to save ClickFunnels token: ${error.message}`);
}
