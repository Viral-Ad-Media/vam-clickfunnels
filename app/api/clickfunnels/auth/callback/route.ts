// app/api/clickfunnels/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { ensureUserId, getAppConfig, upsertToken } from "@/lib/clickfunnels/tokens";
import { exchangeCodeForToken } from "@/lib/clickfunnels/oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const backTo = "/dashboard/clickfunnels";

  if (error) return NextResponse.redirect(new URL(`${backTo}?error=${encodeURIComponent(error)}`, req.url));

  // Validate CSRF state
  if (!state) return NextResponse.redirect(new URL(`${backTo}?error=missing_state`, req.url));
  const cookies = await nextCookies();
  const storedState = cookies.get("cf_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL(`${backTo}?error=invalid_state`, req.url));
  }
  cookies.delete("cf_oauth_state");

  if (!code) return NextResponse.redirect(new URL(`${backTo}?error=missing_code`, req.url));

  try {
    const uid = await ensureUserId();
    const cfg = await getAppConfig(uid);
    if (!cfg) return NextResponse.redirect(new URL(`${backTo}?error=missing_config`, req.url));

    const tok = await exchangeCodeForToken(code, cfg.client_id, cfg.client_secret);
    await upsertToken(uid, tok);

    return NextResponse.redirect(new URL(`${backTo}?connected=1`, req.url));
  } catch (e: any) {
    console.error("Token exchange failed:", e);
    return NextResponse.redirect(new URL(`${backTo}?error=${encodeURIComponent(e?.message || "token_failed")}`, req.url));
  }
}
