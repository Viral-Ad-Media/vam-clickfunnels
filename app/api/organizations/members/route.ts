import { NextResponse } from "next/server";
import { requireActiveOrganization } from "@/lib/orgs/server";
import { listMembersForOrganization } from "@/lib/orgs/members";
import { getSeatSummaryForOrganization } from "@/lib/orgs/seats";

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  if (lowered.includes("admin access")) return 403;
  return 400;
}

export async function GET() {
  try {
    const context = await requireActiveOrganization({ requireManager: true });

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
