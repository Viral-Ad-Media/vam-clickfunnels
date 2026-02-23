import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import crypto from "crypto";
import { ensureOrganizationContext, getAppConfig } from "@/lib/clickfunnels/tokens";
import { buildAuthorizeUrl } from "@/lib/clickfunnels/oauth";

const SCOPE = "offline_access orders:read fulfillments:read";

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  if (lowered.includes("admin access")) return 403;
  return 400;
}

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
    if (!cfg) return NextResponse.json({ ok: false, error: "ClickFunnels config missing" }, { status: 400 });

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

    return NextResponse.json({ ok: true, url });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
