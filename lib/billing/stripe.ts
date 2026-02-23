import "server-only";
import crypto from "crypto";

const STRIPE_API_BASE = "https://api.stripe.com";
const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
  subscription: string | null;
  metadata?: Record<string, string>;
};

export type StripeBillingPortalSession = {
  id: string;
  url: string;
};

export type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function stripeSecretKey() {
  return requiredEnv("STRIPE_SECRET_KEY");
}

export function stripeWebhookSecret() {
  return requiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function defaultStripePriceId() {
  return requiredEnv("STRIPE_PRICE_ID");
}

async function stripeRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const stripeError =
      typeof payload.error === "object" && payload.error !== null
        ? (payload.error as { message?: string }).message
        : undefined;
    throw new Error(stripeError ?? `Stripe request failed with status ${res.status}`);
  }

  return payload as T;
}

export async function createStripeCheckoutSession(params: {
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
  priceId?: string;
  customerId?: string | null;
  customerEmail?: string | null;
}): Promise<StripeCheckoutSession> {
  const body = new URLSearchParams();

  body.set("mode", "subscription");
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("line_items[0][price]", params.priceId ?? defaultStripePriceId());
  body.set("line_items[0][quantity]", "1");
  body.set("allow_promotion_codes", "true");
  body.set("metadata[organization_id]", params.organizationId);

  if (params.customerId) {
    body.set("customer", params.customerId);
  } else if (params.customerEmail) {
    body.set("customer_email", params.customerEmail);
  }

  return stripeRequest<StripeCheckoutSession>("/v1/checkout/sessions", body);
}

export async function createStripeBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<StripeBillingPortalSession> {
  const body = new URLSearchParams();
  body.set("customer", params.customerId);
  body.set("return_url", params.returnUrl);

  return stripeRequest<StripeBillingPortalSession>("/v1/billing_portal/sessions", body);
}

function parseStripeSignatureHeader(header: string) {
  const values = new Map<string, string[]>();

  for (const piece of header.split(",")) {
    const [rawKey, rawValue] = piece.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (!key || !value) continue;

    const existing = values.get(key) ?? [];
    existing.push(value);
    values.set(key, existing);
  }

  return values;
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyStripeWebhookSignature(payload: string, header: string | null | undefined) {
  if (!header) {
    throw new Error("Missing Stripe signature header.");
  }

  const parsed = parseStripeSignatureHeader(header);
  const timestamp = parsed.get("t")?.[0];
  const signatures = parsed.get("v1") ?? [];

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe signature header format.");
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) {
    throw new Error("Invalid Stripe signature timestamp.");
  }

  if (Math.abs(Date.now() - timestampMs) > DEFAULT_TOLERANCE_SECONDS * 1000) {
    throw new Error("Stripe signature timestamp is outside allowed tolerance.");
  }

  const expected = crypto
    .createHmac("sha256", stripeWebhookSecret())
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const matched = signatures.some((signature) => safeEqualHex(signature, expected));

  if (!matched) {
    throw new Error("Stripe signature verification failed.");
  }
}

export function parseStripeWebhookEvent(payload: string): StripeEvent {
  const parsed = JSON.parse(payload) as StripeEvent;

  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
    throw new Error("Invalid Stripe webhook payload.");
  }

  return parsed;
}
