import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/clickfunnels/server";
import {
  createOrganizationForUser,
  listOrganizationsForUser,
  requireActiveOrganization,
} from "@/lib/orgs/server";
import { getSeatSummaryForOrganization } from "@/lib/orgs/seats";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  return 400;
}

export async function GET() {
  try {
    const context = await requireActiveOrganization();
    const organizations = await listOrganizationsForUser(context.userId);

    const sb = await getServerSupabase();
    const [{ data: billing, error: billingError }, seatSummary] = await Promise.all([
      sb
        .from("organization_billing")
        .select(
          "stripe_customer_id,stripe_subscription_id,stripe_price_id,subscription_status,current_period_end,cancel_at_period_end,seat_limit",
        )
        .eq("organization_id", context.organization.id)
        .maybeSingle(),
      getSeatSummaryForOrganization(context.organization.id, { includePendingInvites: false }),
    ]);

    if (billingError) {
      throw new Error(`Failed to load billing details: ${billingError.message}`);
    }

    return NextResponse.json({
      ok: true,
      activeOrganizationId: context.organization.id,
      activeOrganization: context.organization,
      organizations,
      billing: billing ?? null,
      seatSummary,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);
    const name = String(body.name ?? "");

    const organization = await createOrganizationForUser(name);

    return NextResponse.json({
      ok: true,
      organization,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
