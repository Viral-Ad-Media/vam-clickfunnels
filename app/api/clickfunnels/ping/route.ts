// app/api/clickfunnels/ping/route.ts
import { NextResponse } from "next/server";
import { fetchOrders } from "@/lib/clickfunnels/fetch";

function hasKey<K extends PropertyKey>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === "object" && obj !== null && key in obj;
}

export async function GET() {
  try {
    const res = await fetchOrders({ page: 1, per_page: 1 });

    const missingToken = hasKey(res, "missingToken") ? Boolean(res.missingToken) : false;
    const error = hasKey(res, "error") ? String(res.error) : null;

    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        url: res.url,
        missingToken,
        error,
      },
      { status: res.ok ? 200 : (res.status ?? 500) },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
