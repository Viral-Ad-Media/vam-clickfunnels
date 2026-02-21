// app/api/clickfunnels/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { ensureUserId, getAppConfig, upsertToken } from "@/lib/clickfunnels/tokens";
import { exchangeCodeForToken } from "@/lib/clickfunnels/oauth";

function dashboardUrl(req: Request, key?: string, value?: string) {
  const url = new URL("/clickfunnels", req.url);
  if (key && value) url.searchParams.set(key, value);
  return url;
}

function requestBaseUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return NextResponse.redirect(dashboardUrl(req, "error", error));

  // Validate CSRF state
  if (!state) return NextResponse.redirect(dashboardUrl(req, "error", "missing_state"));
  const cookies = await nextCookies();
  const storedState = cookies.get("cf_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(dashboardUrl(req, "error", "invalid_state"));
  }
  cookies.delete("cf_oauth_state");

  if (!code) return NextResponse.redirect(dashboardUrl(req, "error", "missing_code"));

  try {
    const uid = await ensureUserId();
    const cfg = await getAppConfig(uid);
    if (!cfg) return NextResponse.redirect(dashboardUrl(req, "error", "missing_config"));

    const tok = await exchangeCodeForToken(code, cfg.client_id, cfg.client_secret, requestBaseUrl(req));
    await upsertToken(uid, tok);

    return NextResponse.redirect(dashboardUrl(req, "connected", "1"));
  } catch (errorValue: unknown) {
    console.error("Token exchange failed:", errorValue);
    const message = errorValue instanceof Error ? errorValue.message : "token_failed";
    return NextResponse.redirect(dashboardUrl(req, "error", message));
  }
}
