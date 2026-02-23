import { NextResponse } from "next/server";
import { requireActiveOrganization } from "@/lib/orgs/server";
import { revokeInviteForOrganization } from "@/lib/orgs/invites";
import { getSeatSummaryForOrganization } from "@/lib/orgs/seats";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  if (lowered.includes("admin access")) return 403;
  return 400;
}

export async function POST(req: Request) {
  try {
    const context = await requireActiveOrganization({ requireManager: true });
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);

    const inviteId = String(body.invite_id ?? "").trim();
    if (!inviteId) {
      return NextResponse.json({ ok: false, error: "invite_id is required" }, { status: 400 });
    }

    await revokeInviteForOrganization({
      organizationId: context.organization.id,
      inviteId,
    });

    const seatSummary = await getSeatSummaryForOrganization(context.organization.id, { includePendingInvites: true });

    return NextResponse.json({ ok: true, seatSummary });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
