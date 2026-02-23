import { NextResponse } from "next/server";
import { setActiveOrganizationForUser } from "@/lib/orgs/server";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  if (lowered.includes("not a member")) return 403;
  return 400;
}

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);
    const organizationId = String(body.organization_id ?? "").trim();

    if (!organizationId) {
      return NextResponse.json({ ok: false, error: "organization_id is required" }, { status: 400 });
    }

    const organization = await setActiveOrganizationForUser(organizationId);
    return NextResponse.json({ ok: true, organization });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
