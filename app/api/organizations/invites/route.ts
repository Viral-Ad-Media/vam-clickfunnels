import { NextResponse } from "next/server";
import { createInviteForOrganization, inviteUrl, listPendingInvitesForOrganization } from "@/lib/orgs/invites";
import { requireActiveOrganization } from "@/lib/orgs/server";
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
  if (lowered.includes("already exists")) return 409;
  return 400;
}

export async function GET(req: Request) {
  try {
    const context = await requireActiveOrganization({ requireManager: true });
    const [invites, seatSummary] = await Promise.all([
      listPendingInvitesForOrganization(context.organization.id),
      getSeatSummaryForOrganization(context.organization.id, { includePendingInvites: true }),
    ]);

    const baseUrl = requestBaseUrl(req);

    return NextResponse.json({
      ok: true,
      invites: invites.map((entry) => ({
        ...entry,
        invite_url: inviteUrl(baseUrl, entry.token),
      })),
      seatSummary,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireActiveOrganization({ requireManager: true });
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);

    const email = String(body.email ?? "").trim();
    const role = String(body.role ?? "member").trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
    }

    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ ok: false, error: "role must be admin or member" }, { status: 400 });
    }

    const created = await createInviteForOrganization({
      organizationId: context.organization.id,
      invitedBy: context.userId,
      email,
      role,
      baseUrl: requestBaseUrl(req),
    });

    const seatSummary = await getSeatSummaryForOrganization(context.organization.id, { includePendingInvites: true });

    return NextResponse.json({
      ok: true,
      invite: {
        ...created.invite,
        invite_url: created.inviteUrl,
      },
      seatSummary,
      emailDispatched: created.emailDispatched,
      emailError: created.emailError,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
