import { NextResponse } from "next/server";
import { requireActiveOrganization } from "@/lib/orgs/server";
import { resendInviteForOrganization } from "@/lib/orgs/invites";
import { getSeatSummaryForOrganization } from "@/lib/orgs/seats";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function requestBaseUrl(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  if (lowered.includes("admin access")) return 403;
  if (lowered.includes("seat limit reached")) return 409;
  if (lowered.includes("not found")) return 404;
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

    const resent = await resendInviteForOrganization({
      organizationId: context.organization.id,
      inviteId,
      invitedBy: context.userId,
      baseUrl: requestBaseUrl(req),
    });

    const seatSummary = await getSeatSummaryForOrganization(context.organization.id, { includePendingInvites: true });

    return NextResponse.json({
      ok: true,
      invite: {
        ...resent.invite,
        invite_url: resent.inviteUrl,
      },
      seatSummary,
      emailDispatched: resent.emailDispatched,
      emailError: resent.emailError,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
