// app/api/integrations/clickfunnels/config/route.ts
import { NextResponse } from "next/server";
import { ensureUserId, getAppConfig, upsertAppConfig } from "@/lib/clickfunnels/tokens";

export async function GET() {
  try {
    const uid = await ensureUserId();
    const cfg = await getAppConfig(uid);
    // Do NOT leak secrets back – just shape for UI
    return NextResponse.json({
      ok: true,
      config: cfg ? { client_id: "••••", workspace_url: cfg.workspace_url, has_secret: true } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const uid = await ensureUserId();
    const body = await req.json().catch(() => ({}));
    const client_id = String(body.client_id || "").trim();
    const client_secret = String(body.client_secret || "").trim();
    const workspace_url = String(body.workspace_url || "").trim();

    if (!client_id || !client_secret || !workspace_url) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    await upsertAppConfig(uid, { client_id, client_secret, workspace_url });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 });
  }
}
