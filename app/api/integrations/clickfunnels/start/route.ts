// app/api/integrations/clickfunnels/start/route.ts
import { NextResponse } from "next/server";
import { ensureUserId, getAppConfig } from "@/lib/clickfunnels/tokens";
import { buildAuthorizeUrl } from "@/lib/clickfunnels/oauth";

const SCOPE = "offline_access orders:read fulfillments:read";

export async function GET() {
  try {
    const uid = await ensureUserId();
    const cfg = await getAppConfig(uid);
    if (!cfg) return NextResponse.json({ ok: false, error: "ClickFunnels config missing" }, { status: 400 });

    const url = buildAuthorizeUrl({ client_id: cfg.client_id, scope: SCOPE });
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 });
  }
}
