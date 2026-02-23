import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/clickfunnels/server";
import { requireActiveOrganization } from "@/lib/orgs/server";
import { createStripeCheckoutSession } from "@/lib/billing/stripe";
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
  return 400;
}

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);
    const explicitPriceId = typeof body.price_id === "string" ? body.price_id.trim() : undefined;
    const rawSeatQuantity = body.seat_quantity;

    let requestedSeatQuantity: number | undefined;
    if (rawSeatQuantity !== undefined) {
      const parsed = Number(rawSeatQuantity);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return NextResponse.json({ ok: false, error: "seat_quantity must be an integer greater than 0" }, { status: 400 });
      }
      requestedSeatQuantity = parsed;
    }

    const context = await requireActiveOrganization({ requireManager: true });
    const sb = await getServerSupabase();
    const seatSummary = await getSeatSummaryForOrganization(context.organization.id, { includePendingInvites: true });

    const minSeatQuantity = Math.max(seatSummary.usedSeats, 1);
    if (requestedSeatQuantity !== undefined && requestedSeatQuantity < minSeatQuantity) {
      return NextResponse.json(
        { ok: false, error: `seat_quantity cannot be less than seats already in use (${minSeatQuantity})` },
        { status: 400 },
      );
    }

    const checkoutQuantity = requestedSeatQuantity ?? minSeatQuantity;

    const { data: billingRow, error: billingError } = await sb
      .from("organization_billing")
      .select("stripe_customer_id")
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (billingError) {
      throw new Error(`Failed to load organization billing record: ${billingError.message}`);
    }

    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser();

    if (userError) {
      throw new Error(`Failed to load authenticated user: ${userError.message}`);
    }

    const baseUrl = requestBaseUrl(req);
    const session = await createStripeCheckoutSession({
      organizationId: context.organization.id,
      successUrl: `${baseUrl}/settings/organization?billing=checkout_success`,
      cancelUrl: `${baseUrl}/settings/organization?billing=checkout_cancelled`,
      priceId: explicitPriceId,
      customerId: (billingRow?.stripe_customer_id as string | null | undefined) ?? null,
      customerEmail: user?.email ?? null,
      quantity: checkoutQuantity,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
