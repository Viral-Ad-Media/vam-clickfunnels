import { NextResponse } from "next/server";
import { requireActiveOrganization } from "@/lib/orgs/server";
import { listMembersForOrganization, updateOrganizationMemberRole } from "@/lib/orgs/members";
import { getSeatSummaryForOrganization } from "@/lib/orgs/seats";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  if (lowered.includes("admin access")) return 403;
  if (lowered.includes("not found")) return 404;
  if (lowered.includes("owner role")) return 400;
  if (lowered.includes("your own role")) return 400;
  return 400;
}

export async function POST(req: Request) {
  try {
    const context = await requireActiveOrganization({ requireManager: true });
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);

    const targetUserId = String(body.user_id ?? "").trim();
    const role = String(body.role ?? "").trim();

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: "user_id is required" }, { status: 400 });
    }

    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ ok: false, error: "role must be admin or member" }, { status: 400 });
    }

    await updateOrganizationMemberRole({
      organizationId: context.organization.id,
      targetUserId,
      role,
      actorUserId: context.userId,
    });

    const [members, seatSummary] = await Promise.all([
      listMembersForOrganization(context.organization.id),
      getSeatSummaryForOrganization(context.organization.id, { includePendingInvites: true }),
    ]);

    return NextResponse.json({
      ok: true,
      currentUserId: context.userId,
      members,
      seatSummary,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
