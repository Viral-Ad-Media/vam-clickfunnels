import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import crypto from "crypto";
import { buildAuthorizeUrl } from "@/lib/clickfunnels/oauth";
import { ensureOrganizationContext, getAppConfig } from "@/lib/clickfunnels/tokens";

const SCOPE = "offline_access orders:read fulfillments:read";

function requestBaseUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function shouldUseSecureCookie(req: Request) {
  return new URL(req.url).protocol === "https:" || process.env.NODE_ENV === "production";
}

export async function GET(req: Request) {
  try {
    const context = await ensureOrganizationContext({ requireManager: true });
    const cfg = await getAppConfig(context.organizationId);
    if (!cfg) {
      return NextResponse.redirect(new URL("/settings?error=missing_config", req.url));
    }

    const state = crypto.randomBytes(32).toString("hex");
    const cookies = await nextCookies();
    const cookieOptions = {
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax" as const,
      secure: shouldUseSecureCookie(req),
      path: "/",
    };

    cookies.set("cf_oauth_state", state, cookieOptions);
    cookies.set("cf_oauth_org", context.organizationId, cookieOptions);

    const url = buildAuthorizeUrl({
      client_id: cfg.client_id,
      scope: SCOPE,
      state,
      baseUrl: requestBaseUrl(req),
    });

    return NextResponse.redirect(url);
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed to start OAuth";
    const lowered = message.toLowerCase();
    if (lowered.includes("not authenticated")) {
      return NextResponse.redirect(new URL("/login?next=/settings", req.url));
    }
    if (lowered.includes("admin access")) {
      return NextResponse.redirect(new URL("/settings?error=admin_required", req.url));
    }
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, req.url));
  }
}
