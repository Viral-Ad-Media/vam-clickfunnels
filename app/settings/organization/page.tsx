"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Building2,
  CircleDollarSign,
  Copy,
  CreditCard,
  Loader2,
  MailPlus,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
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
  seat_limit: number | null;
};

type SeatSummary = {
  subscriptionStatus: string | null;
  seatLimit: number | null;
  memberCount: number;
  pendingInviteCount: number;
  usedSeats: number;
  remainingSeats: number | null;
  enforced: boolean;
};

type InviteRole = "admin" | "member";

type InviteRecord = {
  id: string;
  email: string;
  role: InviteRole;
  expires_at: string;
  created_at: string;
  invite_url: string;
};

type MemberRecord = {
  user_id: string;
  email: string | null;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type ApiState = {
  activeOrganizationId: string;
  organizations: Organization[];
  billing: BillingSnapshot | null;
  seatSummary: SeatSummary | null;
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

function safeSeatQuantity(summary: SeatSummary | null | undefined) {
  const fallback = 1;
  if (!summary) return fallback;
  if (summary.seatLimit && summary.seatLimit > 0) return Math.max(summary.usedSeats, summary.seatLimit, 1);
  return Math.max(summary.usedSeats, 1);
}

export default function OrganizationSettingsPage() {
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [billingLoading, setBillingLoading] = useState<"checkout" | "portal" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [seatQuantity, setSeatQuantity] = useState("1");

  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);
  const [resendInviteId, setResendInviteId] = useState<string | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null);
  const [removingMemberUserId, setRemovingMemberUserId] = useState<string | null>(null);

  const inviteTokenHandled = useRef<string | null>(null);

  const activeOrganization = useMemo(() => {
    if (!state) return null;
    return state.organizations.find((entry) => entry.id === state.activeOrganizationId) ?? null;
  }, [state]);

  const canManageActiveOrganization = isManager(activeOrganization?.role);

  const applySeatSummary = useCallback((seatSummary: SeatSummary | null | undefined) => {
    if (!seatSummary) return;

    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        seatSummary,
      };
    });

    setSeatQuantity(String(safeSeatQuantity(seatSummary)));
  }, []);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/organizations", { method: "GET" });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        activeOrganizationId?: string;
        organizations?: Organization[];
        billing?: BillingSnapshot | null;
        seatSummary?: SeatSummary | null;
      };

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to load organizations");
      }

      const nextSeatSummary = payload.seatSummary ?? null;

      setState({
        activeOrganizationId: payload.activeOrganizationId ?? "",
        organizations: payload.organizations ?? [],
        billing: payload.billing ?? null,
        seatSummary: nextSeatSummary,
      });

      setSeatQuantity(String(safeSeatQuantity(nextSeatSummary)));
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to load organizations",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    if (!canManageActiveOrganization) {
      setInvites([]);
      return;
    }

    setInvitesLoading(true);

    try {
      const res = await fetch("/api/organizations/invites", { method: "GET" });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        invites?: InviteRecord[];
        seatSummary?: SeatSummary | null;
      };

      if (res.status === 403) {
        setInvites([]);
        return;
      }

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to load invites");
      }

      setInvites(payload.invites ?? []);
      applySeatSummary(payload.seatSummary);
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to load invites",
      });
    } finally {
      setInvitesLoading(false);
    }
  }, [applySeatSummary, canManageActiveOrganization]);

  const loadMembers = useCallback(async () => {
    if (!canManageActiveOrganization) {
      setMembers([]);
      setCurrentUserId(null);
      return;
    }

    setMembersLoading(true);

    try {
      const res = await fetch("/api/organizations/members", { method: "GET" });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        currentUserId?: string;
        members?: MemberRecord[];
        seatSummary?: SeatSummary | null;
      };

      if (res.status === 403) {
        setMembers([]);
        setCurrentUserId(null);
        return;
      }

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to load members");
      }

      setMembers(payload.members ?? []);
      setCurrentUserId(payload.currentUserId ?? null);
      applySeatSummary(payload.seatSummary);
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to load members",
      });
    } finally {
      setMembersLoading(false);
    }
  }, [applySeatSummary, canManageActiveOrganization]);

  const removeInviteTokenFromUrl = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("invite")) return;
    url.searchParams.delete("invite");
    const cleaned = `${url.pathname}${url.search}`;
    window.history.replaceState({}, "", cleaned);
  };

  const acceptInvite = useCallback(async (token: string) => {
    setAcceptingInvite(true);

    try {
      const res = await fetch("/api/organizations/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        organization?: { name?: string } | null;
        seatSummary?: SeatSummary | null;
      };

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to accept invite");
      }

      setMessage({
        type: "success",
        text: payload.organization?.name
          ? `Invite accepted. You joined ${payload.organization.name}.`
          : "Invite accepted successfully.",
      });

      removeInviteTokenFromUrl();
      await loadOrganizations();
      await loadInvites();
      await loadMembers();
      applySeatSummary(payload.seatSummary);
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to accept invite",
      });
    } finally {
      setAcceptingInvite(false);
    }
  }, [applySeatSummary, loadInvites, loadMembers, loadOrganizations]);

  useEffect(() => {
    void loadOrganizations();

    const params = new URLSearchParams(window.location.search);
    const billingState = params.get("billing");
    if (billingState === "checkout_success") {
      setMessage({ type: "success", text: "Stripe checkout completed. Billing status will update shortly." });
    } else if (billingState === "checkout_cancelled") {
      setMessage({ type: "error", text: "Stripe checkout was cancelled." });
    }

    const inviteToken = params.get("invite");
    if (inviteToken && inviteTokenHandled.current !== inviteToken) {
      inviteTokenHandled.current = inviteToken;
      void acceptInvite(inviteToken);
    }
  }, [acceptInvite, loadOrganizations]);

  useEffect(() => {
    if (!state?.activeOrganizationId) return;
    if (!canManageActiveOrganization) {
      setInvites([]);
      setMembers([]);
      setCurrentUserId(null);
      return;
    }

    void loadInvites();
    void loadMembers();
  }, [state?.activeOrganizationId, canManageActiveOrganization, loadInvites, loadMembers]);

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

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/organizations/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        invite?: InviteRecord;
        seatSummary?: SeatSummary | null;
        emailDispatched?: boolean;
        emailError?: string | null;
      };

      if (!res.ok || !payload.ok || !payload.invite) {
        throw new Error(payload.error ?? "Failed to send invite");
      }

      setInvites((prev) => [payload.invite!, ...prev]);
      setInviteEmail("");
      applySeatSummary(payload.seatSummary);

      if (payload.emailDispatched) {
        setMessage({ type: "success", text: `Invite sent to ${payload.invite.email}.` });
      } else {
        const errorText = payload.emailError ? ` ${payload.emailError}` : "";
        setMessage({
          type: "error",
          text: `Invite created but email dispatch failed.${errorText} Copy the invite link from the pending list.`,
        });
      }
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to send invite",
      });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setRevokeInviteId(inviteId);
    setMessage(null);

    try {
      const res = await fetch("/api/organizations/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        seatSummary?: SeatSummary | null;
      };

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to revoke invite");
      }

      setInvites((prev) => prev.filter((entry) => entry.id !== inviteId));
      applySeatSummary(payload.seatSummary);
      setMessage({ type: "success", text: "Invite revoked." });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to revoke invite",
      });
    } finally {
      setRevokeInviteId(null);
    }
  };

  const resendInvite = async (inviteId: string) => {
    setResendInviteId(inviteId);
    setMessage(null);

    try {
      const res = await fetch("/api/organizations/invites/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        invite?: InviteRecord;
        seatSummary?: SeatSummary | null;
        emailDispatched?: boolean;
        emailError?: string | null;
      };

      if (!res.ok || !payload.ok || !payload.invite) {
        throw new Error(payload.error ?? "Failed to resend invite");
      }

      setInvites((prev) => prev.map((entry) => (entry.id === inviteId ? payload.invite! : entry)));
      applySeatSummary(payload.seatSummary);

      if (payload.emailDispatched) {
        setMessage({ type: "success", text: `Invite re-sent to ${payload.invite.email}.` });
      } else {
        const errorText = payload.emailError ? ` ${payload.emailError}` : "";
        setMessage({
          type: "error",
          text: `Invite refreshed but email dispatch failed.${errorText} Copy the invite link manually.`,
        });
      }
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to resend invite",
      });
    } finally {
      setResendInviteId(null);
    }
  };

  const updateMemberRole = async (targetUserId: string, role: "admin" | "member") => {
    setRoleUpdatingUserId(targetUserId);
    setMessage(null);

    try {
      const res = await fetch("/api/organizations/members/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetUserId, role }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        currentUserId?: string;
        members?: MemberRecord[];
        seatSummary?: SeatSummary | null;
      };

      if (!res.ok || !payload.ok || !payload.members) {
        throw new Error(payload.error ?? "Failed to update member role");
      }

      setMembers(payload.members);
      if (payload.currentUserId) {
        setCurrentUserId(payload.currentUserId);
      }
      applySeatSummary(payload.seatSummary);
      setMessage({ type: "success", text: "Member role updated." });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to update member role",
      });
    } finally {
      setRoleUpdatingUserId(null);
    }
  };

  const removeMember = async (targetUserId: string) => {
    setRemovingMemberUserId(targetUserId);
    setMessage(null);

    try {
      const res = await fetch("/api/organizations/members/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetUserId }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        currentUserId?: string;
        members?: MemberRecord[];
        seatSummary?: SeatSummary | null;
      };

      if (!res.ok || !payload.ok || !payload.members) {
        throw new Error(payload.error ?? "Failed to remove member");
      }

      setMembers(payload.members);
      if (payload.currentUserId) {
        setCurrentUserId(payload.currentUserId);
      }
      applySeatSummary(payload.seatSummary);
      setMessage({ type: "success", text: "Member removed and seat usage rebalanced." });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to remove member",
      });
    } finally {
      setRemovingMemberUserId(null);
    }
  };

  const copyInviteLink = async (url: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard is not available in this browser.");
      }

      await navigator.clipboard.writeText(url);
      setMessage({ type: "success", text: "Invite link copied to clipboard." });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to copy invite link",
      });
    }
  };

  const launchBilling = async (mode: "checkout" | "portal") => {
    setBillingLoading(mode);
    setMessage(null);

    try {
      const endpoint = mode === "checkout" ? "/api/billing/checkout" : "/api/billing/portal";

      let body: string | undefined;
      if (mode === "checkout") {
        const parsed = Number(seatQuantity);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new Error("Seat quantity must be an integer greater than 0.");
        }

        body = JSON.stringify({ seat_quantity: parsed });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });

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

  const seatSummary = state?.seatSummary;
  const minimumSeatQuantity = Math.max(seatSummary?.usedSeats ?? 1, 1);
  const memberLabel = (member: MemberRecord) =>
    member.email ?? `User ${member.user_id.slice(0, 8)}...${member.user_id.slice(-4)}`;

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-6 py-10 sm:space-y-8 sm:py-12">
        <section className="surface-panel p-7 sm:p-9">
          <span className="info-chip">Organization & Billing</span>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Workspace Administration</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Manage multi-tenant organizations, invite teammates by email, and enforce purchased seat capacity.
          </p>
        </section>

        {(message || acceptingInvite) && (
          <section
            className={`rounded-xl border px-4 py-3 text-sm ${
              acceptingInvite
                ? "border-border/70 bg-white/82 text-muted-foreground"
                : message?.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {acceptingInvite ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Accepting invite...
              </span>
            ) : (
              message?.text
            )}
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
                <p className="mt-1 text-sm text-muted-foreground">
                  Seat quantity from Stripe checkout is enforced for team onboarding.
                </p>
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
                <span className="text-muted-foreground">Seat limit</span>
                <span className="font-semibold">{seatSummary?.enforced ? seatSummary.seatLimit : "Not enforced"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Seats in use</span>
                <span className="font-semibold">{seatSummary?.usedSeats ?? "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Seats remaining</span>
                <span className="font-semibold">{seatSummary?.remainingSeats ?? "Unlimited"}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border/80 bg-accent/70 p-4">
              <label htmlFor="seat-quantity" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Checkout seat quantity
              </label>
              <input
                id="seat-quantity"
                type="number"
                min={minimumSeatQuantity}
                step={1}
                value={seatQuantity}
                onChange={(event) => setSeatQuantity(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-border/80 bg-white/85 px-3 text-sm focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-2 text-xs text-muted-foreground">Minimum quantity is current seats in use ({minimumSeatQuantity}).</p>
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
              <p className="mt-3 text-xs text-muted-foreground">Owner or admin role is required to manage billing actions.</p>
            )}

            <Link href="/settings" className="mt-5 inline-flex text-xs font-semibold text-primary hover:underline">
              Return to integration settings
            </Link>
          </aside>
        </section>

        <section className="surface-panel p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Team Onboarding</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Invite teammates by email and reserve seats before they join the organization.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Seat-aware invites
            </span>
          </div>

          {canManageActiveOrganization ? (
            <>
              <form onSubmit={createInvite} className="mt-5 grid gap-3 sm:grid-cols-[1.4fr_0.7fr_auto]">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  className="h-10 rounded-lg border border-border/80 bg-white/85 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value === "admin" ? "admin" : "member")}
                  className="h-10 rounded-lg border border-border/80 bg-white/85 px-3 text-sm focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
                >
                  {inviteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                  {inviteSubmitting ? "Sending..." : "Send invite"}
                </button>
              </form>

              <div className="mt-5 rounded-xl border border-border/80 bg-white/84 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active members</span>
                  <span className="font-semibold">{seatSummary?.memberCount ?? "--"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Pending invites</span>
                  <span className="font-semibold">{seatSummary?.pendingInviteCount ?? invites.length}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Total seats in use</span>
                  <span className="font-semibold">{seatSummary?.usedSeats ?? "--"}</span>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold">Pending invites</h3>

                {invitesLoading ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading invites...
                  </div>
                ) : invites.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No pending invites for the active organization.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {invites.map((invite) => {
                      const revoking = revokeInviteId === invite.id;
                      const resending = resendInviteId === invite.id;

                      return (
                        <div key={invite.id} className="rounded-xl border border-border/80 bg-white/82 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{invite.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Role: {invite.role} • Expires: {fmtDate(invite.expires_at)}
                              </p>
                            </div>
                            <span className="rounded-md bg-secondary/14 px-2 py-1 text-xs font-semibold capitalize text-secondary-foreground">
                              {invite.role}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void copyInviteLink(invite.invite_url)}
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-border/80 bg-white px-3 text-xs font-semibold transition-colors hover:bg-white/80"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy link
                            </button>
                            <button
                              type="button"
                              disabled={resending}
                              onClick={() => void resendInvite(invite.id)}
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-border/80 bg-white px-3 text-xs font-semibold transition-colors hover:bg-white/80 disabled:opacity-60"
                            >
                              {resending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCcw className="h-3.5 w-3.5" />
                              )}
                              Resend
                            </button>
                            <button
                              type="button"
                              disabled={revoking}
                              onClick={() => void revokeInvite(invite.id)}
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 disabled:opacity-60"
                            >
                              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Revoke
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-7">
                <h3 className="text-sm font-semibold">Member access</h3>

                {membersLoading ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No members found for the active organization.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {members.map((member) => {
                      const updatingRole = roleUpdatingUserId === member.user_id;
                      const removingMember = removingMemberUserId === member.user_id;
                      const isSelf = currentUserId === member.user_id;
                      const isOwner = member.role === "owner";
                      const disableRoleControl = isOwner || isSelf || updatingRole || removingMember;
                      const disableRemoveControl = isOwner || isSelf || updatingRole || removingMember;

                      return (
                        <div key={member.user_id} className="rounded-xl border border-border/80 bg-white/82 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{memberLabel(member)}</p>
                              <p className="text-xs text-muted-foreground">
                                Joined: {fmtDate(member.created_at)} {isSelf ? "• You" : ""}
                              </p>
                            </div>
                            <span className="rounded-md bg-primary/14 px-2 py-1 text-xs font-semibold capitalize text-primary">
                              {member.role}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {isOwner ? (
                              <span className="inline-flex h-9 items-center rounded-md border border-border/80 bg-white px-3 text-xs font-semibold text-muted-foreground">
                                Owner role locked
                              </span>
                            ) : (
                              <select
                                value={member.role}
                                disabled={disableRoleControl}
                                onChange={(event) =>
                                  void updateMemberRole(
                                    member.user_id,
                                    event.target.value === "admin" ? "admin" : "member",
                                  )
                                }
                                className="h-9 rounded-md border border-border/80 bg-white px-3 text-xs font-semibold focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}

                            <button
                              type="button"
                              disabled={disableRemoveControl}
                              onClick={() => void removeMember(member.user_id)}
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 disabled:opacity-60"
                            >
                              {removingMember ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Remove
                            </button>

                            {updatingRole && (
                              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-border/80 bg-white px-3 text-xs font-semibold text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Updating role...
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-border/80 bg-white/82 p-4 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Owner or admin role is required to invite and manage team members.
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
