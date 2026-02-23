import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { exchangeCodeForToken } from "@/lib/clickfunnels/oauth";
import { ensureUserId, getAppConfig, upsertToken } from "@/lib/clickfunnels/tokens";
import { canManageOrganization, getMembershipForOrganization } from "@/lib/orgs/server";

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

  const cookies = await nextCookies();

  // Validate CSRF state.
  if (!state) return NextResponse.redirect(dashboardUrl(req, "error", "missing_state"));
  const storedState = cookies.get("cf_oauth_state")?.value;
  const organizationId = cookies.get("cf_oauth_org")?.value;

  if (!storedState || storedState !== state) {
    cookies.delete("cf_oauth_state");
    cookies.delete("cf_oauth_org");
    return NextResponse.redirect(dashboardUrl(req, "error", "invalid_state"));
  }

  cookies.delete("cf_oauth_state");
  cookies.delete("cf_oauth_org");

  if (!organizationId) return NextResponse.redirect(dashboardUrl(req, "error", "missing_org_context"));
  if (!code) return NextResponse.redirect(dashboardUrl(req, "error", "missing_code"));

  try {
    const uid = await ensureUserId();
    const membership = await getMembershipForOrganization(organizationId, uid);

    if (!membership) {
      return NextResponse.redirect(dashboardUrl(req, "error", "org_access_denied"));
    }

    if (!canManageOrganization(membership.role)) {
      return NextResponse.redirect(dashboardUrl(req, "error", "admin_required"));
    }

    const cfg = await getAppConfig(organizationId);
    if (!cfg) return NextResponse.redirect(dashboardUrl(req, "error", "missing_config"));

    const tok = await exchangeCodeForToken(code, cfg.client_id, cfg.client_secret, requestBaseUrl(req));
    await upsertToken(organizationId, uid, tok);

    return NextResponse.redirect(dashboardUrl(req, "connected", "1"));
  } catch (errorValue: unknown) {
    console.error("Token exchange failed:", errorValue);
    const message = errorValue instanceof Error ? errorValue.message : "token_failed";
    if (message.toLowerCase().includes("not authenticated")) {
      return NextResponse.redirect(new URL("/login?next=/clickfunnels", req.url));
    }
    return NextResponse.redirect(dashboardUrl(req, "error", message));
  }
}
