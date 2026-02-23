import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/clickfunnels/server";

const ENFORCED_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export type SeatSummary = {
  subscriptionStatus: string | null;
  seatLimit: number | null;
  memberCount: number;
  pendingInviteCount: number;
  usedSeats: number;
  remainingSeats: number | null;
  enforced: boolean;
};

function shouldEnforceSeats(subscriptionStatus: string | null, seatLimit: number | null) {
  return typeof seatLimit === "number" && seatLimit > 0 && ENFORCED_SUBSCRIPTION_STATUSES.has(subscriptionStatus ?? "");
}

async function countOrganizationMembers(client: SupabaseClient, organizationId: string) {
  const { count, error } = await client
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to load organization member count: ${error.message}`);
  }

  return count ?? 0;
}

async function countPendingOrganizationInvites(
  client: SupabaseClient,
  organizationId: string,
  options?: { ignoreInviteId?: string },
) {
  let query = client
    .from("organization_invites")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  if (options?.ignoreInviteId) {
    query = query.neq("id", options.ignoreInviteId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to load pending invites count: ${error.message}`);
  }

  return count ?? 0;
}

async function loadBillingSeatLimit(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("organization_billing")
    .select("subscription_status, seat_limit")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load organization billing record: ${error.message}`);
  }

  return {
    subscriptionStatus: (data?.subscription_status as string | null | undefined) ?? null,
    seatLimit: (data?.seat_limit as number | null | undefined) ?? null,
  };
}

export async function getSeatSummaryForOrganization(
  organizationId: string,
  options?: {
    client?: SupabaseClient;
    includePendingInvites?: boolean;
    ignoreInviteId?: string;
  },
): Promise<SeatSummary> {
  const client = options?.client ?? (await getServerSupabase());
  const includePendingInvites = options?.includePendingInvites ?? true;

  const [{ subscriptionStatus, seatLimit }, memberCount, pendingInviteCount] = await Promise.all([
    loadBillingSeatLimit(client, organizationId),
    countOrganizationMembers(client, organizationId),
    includePendingInvites
      ? countPendingOrganizationInvites(client, organizationId, { ignoreInviteId: options?.ignoreInviteId })
      : Promise.resolve(0),
  ]);

  const enforced = shouldEnforceSeats(subscriptionStatus, seatLimit);
  const usedSeats = memberCount + pendingInviteCount;
  const remainingSeats = enforced && seatLimit ? Math.max(seatLimit - usedSeats, 0) : null;

  return {
    subscriptionStatus,
    seatLimit,
    memberCount,
    pendingInviteCount,
    usedSeats,
    remainingSeats,
    enforced,
  };
}

export async function assertSeatCapacityForOrganization(
  organizationId: string,
  options?: {
    client?: SupabaseClient;
    reserve?: number;
    ignoreInviteId?: string;
    includePendingInvites?: boolean;
  },
) {
  const reserve = options?.reserve ?? 0;

  if (reserve < 0) {
    throw new Error("reserve cannot be negative");
  }

  const summary = await getSeatSummaryForOrganization(organizationId, {
    client: options?.client,
    includePendingInvites: options?.includePendingInvites,
    ignoreInviteId: options?.ignoreInviteId,
  });

  if (!summary.enforced || !summary.seatLimit) {
    return summary;
  }

  const projected = summary.usedSeats + reserve;
  if (projected > summary.seatLimit) {
    throw new Error(
      `Seat limit reached (${summary.usedSeats}/${summary.seatLimit}). Increase seats in billing before adding more teammates.`,
    );
  }

  return summary;
}
