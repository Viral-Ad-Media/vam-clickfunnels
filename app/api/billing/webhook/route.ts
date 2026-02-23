import { NextResponse } from "next/server";
import {
  parseStripeWebhookEvent,
  verifyStripeWebhookSignature,
} from "@/lib/billing/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SubscriptionDetails = {
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  seatLimit: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asPositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function parseCurrentPeriodEnd(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

async function resolveOrganizationId(params: {
  explicitOrganizationId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  if (params.explicitOrganizationId) {
    return params.explicitOrganizationId;
  }

  const admin = getSupabaseAdminClient();

  if (params.customerId) {
    const { data, error } = await admin
      .from("organization_billing")
      .select("organization_id")
      .eq("stripe_customer_id", params.customerId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve organization by customer: ${error.message}`);
    }

    if (data?.organization_id) {
      return data.organization_id as string;
    }
  }

  if (params.subscriptionId) {
    const { data, error } = await admin
      .from("organization_billing")
      .select("organization_id")
      .eq("stripe_subscription_id", params.subscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve organization by subscription: ${error.message}`);
    }

    if (data?.organization_id) {
      return data.organization_id as string;
    }
  }

  return null;
}

function parseCheckoutSessionBilling(object: Record<string, unknown>) {
  const metadata = asRecord(object.metadata);

  return {
    organizationId: asString(metadata?.organization_id),
    seatLimit: asPositiveInteger(metadata?.seat_quantity),
    customerId: asString(object.customer),
    subscriptionId: asString(object.subscription),
  };
}

function parseSubscriptionObject(object: Record<string, unknown>): SubscriptionDetails {
  const customerId = asString(object.customer);
  const subscriptionId = asString(object.id);
  const status = asString(object.status);

  const items = asRecord(object.items);
  const itemData = Array.isArray(items?.data) ? items?.data : [];
  const firstItem = asRecord(itemData[0]);
  const price = asRecord(firstItem?.price);
  const quantity = asPositiveInteger(firstItem?.quantity);

  return {
    customerId,
    subscriptionId,
    status,
    priceId: asString(price?.id),
    seatLimit: quantity,
    currentPeriodEnd: parseCurrentPeriodEnd(object.current_period_end),
    cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
  };
}

async function upsertOrganizationBillingRecord(params: {
  organizationId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: string | null;
  priceId?: string | null;
  seatLimit?: number | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const admin = getSupabaseAdminClient();

  const { error } = await admin.from("organization_billing").upsert(
    {
      organization_id: params.organizationId,
      stripe_customer_id: params.customerId ?? null,
      stripe_subscription_id: params.subscriptionId ?? null,
      subscription_status: params.status ?? null,
      stripe_price_id: params.priceId ?? null,
      seat_limit: params.seatLimit ?? null,
      current_period_end: params.currentPeriodEnd ?? null,
      cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    throw new Error(`Failed to update organization billing: ${error.message}`);
  }
}

async function handleCheckoutCompleted(object: Record<string, unknown>) {
  const parsed = parseCheckoutSessionBilling(object);
  const organizationId = await resolveOrganizationId({
    explicitOrganizationId: parsed.organizationId,
    customerId: parsed.customerId,
    subscriptionId: parsed.subscriptionId,
  });

  if (!organizationId) return;

  await upsertOrganizationBillingRecord({
    organizationId,
    customerId: parsed.customerId,
    subscriptionId: parsed.subscriptionId,
    status: "active",
    seatLimit: parsed.seatLimit,
  });
}

async function handleSubscriptionEvent(object: Record<string, unknown>) {
  const metadata = asRecord(object.metadata);
  const parsed = parseSubscriptionObject(object);

  const organizationId = await resolveOrganizationId({
    explicitOrganizationId: asString(metadata?.organization_id),
    customerId: parsed.customerId,
    subscriptionId: parsed.subscriptionId,
  });

  if (!organizationId) return;

  await upsertOrganizationBillingRecord({
    organizationId,
    customerId: parsed.customerId,
    subscriptionId: parsed.subscriptionId,
    status: parsed.status,
    priceId: parsed.priceId,
    seatLimit: parsed.seatLimit,
    currentPeriodEnd: parsed.currentPeriodEnd,
    cancelAtPeriodEnd: parsed.cancelAtPeriodEnd,
  });
}

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");

    verifyStripeWebhookSignature(payload, signature);
    const event = parseStripeWebhookEvent(payload);
    const object = asRecord(event.data?.object);

    if (!object) {
      throw new Error("Stripe webhook missing data.object payload.");
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(object);
        break;
      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
