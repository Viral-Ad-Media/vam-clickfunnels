import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/clickfunnels/server";
import { requireActiveOrganization } from "@/lib/orgs/server";
import { createStripeBillingPortalSession } from "@/lib/billing/stripe";

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
  if (lowered.includes("no stripe customer")) return 400;
  return 400;
}

export async function POST(req: Request) {
  try {
    const context = await requireActiveOrganization({ requireManager: true });
    const sb = await getServerSupabase();

    const { data: billingRow, error } = await sb
      .from("organization_billing")
      .select("stripe_customer_id")
      .eq("organization_id", context.organization.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load organization billing record: ${error.message}`);
    }

    const customerId = (billingRow?.stripe_customer_id as string | null | undefined) ?? null;
    if (!customerId) {
      throw new Error("No Stripe customer exists for this organization yet.");
    }

    const session = await createStripeBillingPortalSession({
      customerId,
      returnUrl: `${requestBaseUrl(req)}/settings/organization`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
