// app/api/integrations/clickfunnels/config/route.ts
import { NextResponse } from "next/server";
import { ensureUserId, getAppConfig, upsertAppConfig } from "@/lib/clickfunnels/tokens";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function GET() {
  try {
    const uid = await ensureUserId();
    const cfg = await getAppConfig(uid);
    // Do NOT leak secrets back – just shape for UI
    return NextResponse.json({
      ok: true,
      config: cfg ? { client_id: "••••", workspace_url: cfg.workspace_url, has_secret: true } : null,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const uid = await ensureUserId();
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);

    const client_id = String(body.client_id ?? "").trim();
    const client_secret = String(body.client_secret ?? "").trim();
    const workspace_url = String(body.workspace_url ?? "").trim();

    if (!client_id || !client_secret || !workspace_url) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    let normalizedWorkspaceUrl: string;
    try {
      normalizedWorkspaceUrl = new URL(workspace_url).toString().replace(/\/+$/, "");
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid workspace_url" }, { status: 400 });
    }

    await upsertAppConfig(uid, {
      client_id,
      client_secret,
      workspace_url: normalizedWorkspaceUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
