import "server-only";
import {
  CfToken,
  ensureOrganizationContext,
  getAppConfig,
  getTokenForOrganization,
  isExpired,
  upsertToken,
} from "./tokens";

function normalizeBaseUrl(base: string): string {
  return base.replace(/\/+$/, "");
}

function appUrl(fallbackUrl?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? fallbackUrl;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return normalizeBaseUrl(base);
}

export function clickfunnelsRedirectUri(baseUrl?: string): string {
  return `${appUrl(baseUrl)}/api/clickfunnels/auth/callback`;
}

export function buildAuthorizeUrl(params: {
  client_id: string;
  scope: string;
  state?: string;
  baseUrl?: string;
}) {
  const redirect_uri = clickfunnelsRedirectUri(params.baseUrl);
  const base = "https://accounts.myclickfunnels.com/oauth/authorize";
  const url = new URL(base);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.client_id);
  url.searchParams.set("redirect_uri", redirect_uri);
  url.searchParams.set("scope", params.scope);
  if (params.state) url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
  client_id: string,
  client_secret: string,
  baseUrl?: string,
): Promise<CfToken> {
  const redirect_uri = clickfunnelsRedirectUri(baseUrl);

  const res = await fetch("https://accounts.myclickfunnels.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id,
      client_secret,
      redirect_uri,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const j = await res.json();

  const expiresIn = Number(j.expires_in ?? 3600);

  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    token_type: j.token_type ?? "Bearer",
    expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
    scope: j.scope ?? null,
  };
}

export async function refreshToken(current: {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  baseUrl?: string;
}): Promise<CfToken> {
  const redirect_uri = clickfunnelsRedirectUri(current.baseUrl);

  const res = await fetch("https://accounts.myclickfunnels.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: current.refresh_token,
      client_id: current.client_id,
      client_secret: current.client_secret,
      redirect_uri,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  const j = await res.json();

  const expiresIn = Number(j.expires_in ?? 3600);

  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? current.refresh_token,
    token_type: j.token_type ?? "Bearer",
    expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
    scope: j.scope ?? null,
  };
}

/**
 * Ensure the active organization has a valid ClickFunnels token (refreshing if needed).
 */
export async function getValidTokenForCurrentUser(): Promise<{
  token: CfToken;
  workspace_url: string;
}> {
  const context = await ensureOrganizationContext();
  const cfg = await getAppConfig(context.organizationId);
  if (!cfg) throw new Error("ClickFunnels is not configured for the active organization.");

  const existing = await getTokenForOrganization(context.organizationId);
  if (!existing) throw new Error("No token found; connect ClickFunnels first.");

  let tok = existing;

  if (isExpired(tok)) {
    const newTok = await refreshToken({
      refresh_token: tok.refresh_token,
      client_id: cfg.client_id,
      client_secret: cfg.client_secret,
    });

    await upsertToken(context.organizationId, context.userId, newTok);
    tok = { ...tok, ...newTok, refresh_token: newTok.refresh_token };
  }

  return { token: tok, workspace_url: cfg.workspace_url };
}
