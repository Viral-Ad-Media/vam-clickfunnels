import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import crypto from "crypto";
import { buildAuthorizeUrl } from "@/lib/clickfunnels/oauth";
import { ensureUserId, getAppConfig } from "@/lib/clickfunnels/tokens";

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
    const uid = await ensureUserId();
    const cfg = await getAppConfig(uid);
    if (!cfg) {
      return NextResponse.redirect(new URL("/settings?error=missing_config", req.url));
    }

    const state = crypto.randomBytes(32).toString("hex");
    const cookies = await nextCookies();
    cookies.set("cf_oauth_state", state, {
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(req),
      path: "/",
    });

    const url = buildAuthorizeUrl({
      client_id: cfg.client_id,
      scope: SCOPE,
      state,
      baseUrl: requestBaseUrl(req),
    });

    return NextResponse.redirect(url);
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed to start OAuth";
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, req.url));
  }
}
