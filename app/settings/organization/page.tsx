"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Building2,
  CircleDollarSign,
  CreditCard,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

type Organization = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
};

type BillingSnapshot = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type ApiState = {
  activeOrganizationId: string;
  organizations: Organization[];
  billing: BillingSnapshot | null;
};

function isManager(role: Organization["role"] | undefined) {
  return role === "owner" || role === "admin";
}

function fmtDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString();
}

export default function OrganizationSettingsPage() {
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [billingLoading, setBillingLoading] = useState<"checkout" | "portal" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeOrganization = useMemo(() => {
    if (!state) return null;
    return state.organizations.find((entry) => entry.id === state.activeOrganizationId) ?? null;
  }, [state]);

  const canManageActiveOrganization = isManager(activeOrganization?.role);

  const loadOrganizations = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/organizations", { method: "GET" });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        activeOrganizationId?: string;
        organizations?: Organization[];
        billing?: BillingSnapshot | null;
      };

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to load organizations");
      }

      setState({
        activeOrganizationId: payload.activeOrganizationId ?? "",
        organizations: payload.organizations ?? [],
        billing: payload.billing ?? null,
      });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to load organizations",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();

    const params = new URLSearchParams(window.location.search);
    const billingState = params.get("billing");
    if (billingState === "checkout_success") {
      setMessage({ type: "success", text: "Stripe checkout completed. Billing status will update shortly." });
    } else if (billingState === "checkout_cancelled") {
      setMessage({ type: "error", text: "Stripe checkout was cancelled." });
    }
  }, []);

  const switchOrganization = async (organizationId: string) => {
    setSwitchingOrgId(organizationId);
    setMessage(null);

    try {
      const res = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId }),
      });

      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to switch organization");
      }

      await loadOrganizations();
      setMessage({ type: "success", text: "Active organization updated." });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to switch organization",
      });
    } finally {
      setSwitchingOrgId(null);
    }
  };

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
      });

      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to create organization");
      }

      setNewOrgName("");
      await loadOrganizations();
      setMessage({ type: "success", text: "Organization created and set as active." });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to create organization",
      });
    } finally {
      setCreating(false);
    }
  };

  const launchBilling = async (mode: "checkout" | "portal") => {
    setBillingLoading(mode);
    setMessage(null);

    try {
      const endpoint = mode === "checkout" ? "/api/billing/checkout" : "/api/billing/portal";
      const res = await fetch(endpoint, { method: "POST" });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; url?: string };

      if (!res.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error ?? `Failed to open ${mode}`);
      }

      window.location.href = payload.url;
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : `Failed to open ${mode}`,
      });
    } finally {
      setBillingLoading(null);
    }
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-6 py-10 sm:space-y-8 sm:py-12">
        <section className="surface-panel p-7 sm:p-9">
          <span className="info-chip">Organization & Billing</span>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Workspace Administration</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Manage multi-tenant organization context, team access roles, and Stripe billing workflows.
          </p>
        </section>

        {message && (
          <section
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {message.text}
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-panel p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Organizations</h2>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                {state?.organizations.length ?? 0} workspaces
              </span>
            </div>

            {loading ? (
              <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading organizations...
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(state?.organizations ?? []).map((organization) => {
                  const isActive = state?.activeOrganizationId === organization.id;
                  const switching = switchingOrgId === organization.id;

                  return (
                    <div key={organization.id} className="rounded-xl border border-border/80 bg-white/82 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{organization.name}</p>
                          <p className="text-xs text-muted-foreground">{organization.slug}</p>
                        </div>
                        <span className="rounded-md bg-primary/14 px-2 py-1 text-xs font-semibold capitalize text-primary">
                          {organization.role}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={isActive || switching}
                          onClick={() => void switchOrganization(organization.id)}
                          className="inline-flex h-9 items-center gap-1 rounded-md border border-border/80 bg-white px-3 text-xs font-semibold transition-colors hover:bg-white/80 disabled:opacity-60"
                        >
                          {switching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                          {isActive ? "Active" : "Switch"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={createOrganization} className="mt-6 space-y-3 rounded-xl border border-border/80 bg-accent/70 p-4">
              <label htmlFor="new-org-name" className="text-sm font-semibold">
                Create organization
              </label>
              <input
                id="new-org-name"
                value={newOrgName}
                onChange={(event) => setNewOrgName(event.target.value)}
                required
                minLength={2}
                placeholder="Acme Revenue Ops"
                className="h-10 w-full rounded-lg border border-border/80 bg-white/85 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? "Creating..." : "Create and switch"}
              </button>
            </form>
          </div>

          <aside className="surface-panel p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Billing</h2>
                <p className="mt-1 text-sm text-muted-foreground">Stripe subscription scaffold for the active organization.</p>
              </div>
              <CircleDollarSign className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-border/80 bg-white/84 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active org</span>
                <span className="font-semibold">{activeOrganization?.name ?? "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subscription</span>
                <span className="font-semibold capitalize">{state?.billing?.subscription_status ?? "Not started"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current period end</span>
                <span className="font-semibold">{fmtDate(state?.billing?.current_period_end ?? null)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stripe customer</span>
                <span className="font-mono text-xs">{state?.billing?.stripe_customer_id ?? "--"}</span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                disabled={billingLoading !== null || !canManageActiveOrganization}
                onClick={() => void launchBilling("checkout")}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
              >
                {billingLoading === "checkout" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Start checkout
              </button>

              <button
                type="button"
                disabled={billingLoading !== null || !canManageActiveOrganization || !state?.billing?.stripe_customer_id}
                onClick={() => void launchBilling("portal")}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-white px-4 text-sm font-semibold transition-colors hover:bg-white/80 disabled:opacity-60"
              >
                {billingLoading === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                Open billing portal
              </button>
            </div>

            {!canManageActiveOrganization && (
              <p className="mt-3 text-xs text-muted-foreground">
                Owner or admin role is required to manage billing actions.
              </p>
            )}

            <Link href="/settings" className="mt-5 inline-flex text-xs font-semibold text-primary hover:underline">
              Return to integration settings
            </Link>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
