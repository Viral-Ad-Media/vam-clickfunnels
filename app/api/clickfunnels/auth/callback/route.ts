// app/api/clickfunnels/auth/callback/route.ts
import { NextResponse } from "next/server";
import { ensureUserId, getAppConfig, upsertToken } from "@/lib/clickfunnels/tokens";
import { exchangeCodeForToken } from "@/lib/clickfunnels/oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const backTo = "/dashboard/clickfunnels"; // overview page

  if (error) return NextResponse.redirect(new URL(`${backTo}?error=${encodeURIComponent(error)}`, req.url));
  if (!code) return NextResponse.redirect(new URL(`${backTo}?error=missing_code`, req.url));

  try {
    const uid = await ensureUserId();
    const cfg = await getAppConfig(uid);
    if (!cfg) return NextResponse.redirect(new URL(`${backTo}?error=missing_config`, req.url));

    const tok = await exchangeCodeForToken(code, cfg.client_id, cfg.client_secret);
    await upsertToken(uid, tok);

    return NextResponse.redirect(new URL(`${backTo}?connected=1`, req.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`${backTo}?error=${encodeURIComponent(e?.message || "token_failed")}`, req.url));
  }
}
