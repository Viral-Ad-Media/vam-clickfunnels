import "server-only";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/clickfunnels/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertSeatCapacityForOrganization, getSeatSummaryForOrganization } from "@/lib/orgs/seats";

export type InviteRole = "admin" | "member";

export type OrganizationInvite = {
  id: string;
  organization_id: string;
  email: string;
  role: InviteRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(value: string): InviteRole {
  return value === "admin" ? "admin" : "member";
}

function inviteExpiryDays() {
  const raw = Number(process.env.INVITE_EXPIRY_DAYS ?? "7");
  if (!Number.isFinite(raw)) return 7;
  return Math.max(1, Math.min(30, Math.floor(raw)));
}

function inviteExpirationDate() {
  const expiresInMs = inviteExpiryDays() * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + expiresInMs).toISOString();
}

function inviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

function isTimestampExpired(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() < Date.now();
}

function asInvite(row: Record<string, unknown>): OrganizationInvite {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    email: String(row.email),
    role: normalizeRole(String(row.role ?? "member")),
    token: String(row.token),
    invited_by: row.invited_by ? String(row.invited_by) : null,
    expires_at: String(row.expires_at),
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    created_at: String(row.created_at),
  };
}

function dispatchInviteEmail(params: {
  invite: OrganizationInvite;
  baseUrl: string;
}) {
  const redirectTo = inviteEmailRedirectUrl(params.baseUrl, params.invite.token);
  const admin = getSupabaseAdminClient();

  return admin.auth.admin.inviteUserByEmail(params.invite.email, {
    redirectTo,
    data: {
      organization_id: params.invite.organization_id,
      invite_token: params.invite.token,
      invite_role: params.invite.role,
    },
  });
}

async function getOpenInviteById(params: { organizationId: string; inviteId: string }) {
  const client = await getServerSupabase();
  const { data, error } = await client
    .from("organization_invites")
    .select("id,organization_id,email,role,token,invited_by,expires_at,accepted_at,revoked_at,created_at")
    .eq("organization_id", params.organizationId)
    .eq("id", params.inviteId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load organization invite: ${error.message}`);
  }

  if (!data) {
    throw new Error("Invite not found or no longer active.");
  }

  return asInvite(data as Record<string, unknown>);
}

function invitePath(token: string) {
  return `/settings/organization?invite=${encodeURIComponent(token)}`;
}

function inviteEmailRedirectUrl(baseUrl: string, token: string) {
  const nextPath = invitePath(token);
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export function inviteUrl(baseUrl: string, token: string) {
  return `${baseUrl}${invitePath(token)}`;
}

export async function listPendingInvitesForOrganization(
  organizationId: string,
  options?: { client?: SupabaseClient },
): Promise<OrganizationInvite[]> {
  const client = options?.client ?? (await getServerSupabase());

  const { data, error } = await client
    .from("organization_invites")
    .select("id,organization_id,email,role,token,invited_by,expires_at,accepted_at,revoked_at,created_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load organization invites: ${error.message}`);
  }

  return (data ?? []).map((row) => asInvite(row as Record<string, unknown>));
}

export async function createInviteForOrganization(params: {
  organizationId: string;
  invitedBy: string;
  email: string;
  role: InviteRole;
  baseUrl: string;
}) {
  const email = normalizeEmail(params.email);
  if (!email || !email.includes("@")) {
    throw new Error("A valid invite email is required.");
  }

  await assertSeatCapacityForOrganization(params.organizationId, { reserve: 1 });

  const client = await getServerSupabase();
  const token = inviteToken();

  const { data, error } = await client
    .from("organization_invites")
    .insert({
      organization_id: params.organizationId,
      email,
      role: normalizeRole(params.role),
      invited_by: params.invitedBy,
      token,
      expires_at: inviteExpirationDate(),
    })
    .select("id,organization_id,email,role,token,invited_by,expires_at,accepted_at,revoked_at,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("An open invite already exists for this email in the active organization.");
    }
    throw new Error(`Failed to create organization invite: ${error.message}`);
  }

  const invite = asInvite(data as Record<string, unknown>);
  const { error: inviteEmailError } = await dispatchInviteEmail({
    invite,
    baseUrl: params.baseUrl,
  });

  return {
    invite,
    inviteUrl: inviteUrl(params.baseUrl, invite.token),
    emailDispatched: !inviteEmailError,
    emailError: inviteEmailError?.message ?? null,
  };
}

export async function resendInviteForOrganization(params: {
  organizationId: string;
  inviteId: string;
  invitedBy: string;
  baseUrl: string;
}) {
  const currentInvite = await getOpenInviteById({
    organizationId: params.organizationId,
    inviteId: params.inviteId,
  });

  await assertSeatCapacityForOrganization(params.organizationId, {
    reserve: 1,
    ignoreInviteId: currentInvite.id,
    includePendingInvites: true,
  });

  const client = await getServerSupabase();
  const nextToken = inviteToken();
  const nextExpiry = inviteExpirationDate();
  const { data, error } = await client
    .from("organization_invites")
    .update({
      token: nextToken,
      expires_at: nextExpiry,
      invited_by: params.invitedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.inviteId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id,organization_id,email,role,token,invited_by,expires_at,accepted_at,revoked_at,created_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resend organization invite: ${error.message}`);
  }

  if (!data) {
    throw new Error("Invite not found or no longer active.");
  }

  const invite = asInvite(data as Record<string, unknown>);
  const { error: inviteEmailError } = await dispatchInviteEmail({
    invite,
    baseUrl: params.baseUrl,
  });

  return {
    invite,
    inviteUrl: inviteUrl(params.baseUrl, invite.token),
    emailDispatched: !inviteEmailError,
    emailError: inviteEmailError?.message ?? null,
  };
}

export async function revokeInviteForOrganization(params: {
  organizationId: string;
  inviteId: string;
  client?: SupabaseClient;
}) {
  const client = params.client ?? (await getServerSupabase());

  const { error } = await client
    .from("organization_invites")
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.inviteId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Failed to revoke invite: ${error.message}`);
  }
}

export async function acceptInviteToken(params: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const token = params.token.trim();
  if (!token) {
    throw new Error("Invite token is required.");
  }

  const userEmail = normalizeEmail(params.userEmail);
  if (!userEmail) {
    throw new Error("Your account email is required to accept an invite.");
  }

  const admin = getSupabaseAdminClient();
  const { data: inviteRow, error: inviteError } = await admin
    .from("organization_invites")
    .select("id,organization_id,email,role,token,invited_by,expires_at,accepted_at,revoked_at,created_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError) {
    throw new Error(`Failed to load invite: ${inviteError.message}`);
  }

  if (!inviteRow) {
    throw new Error("Invite link is invalid.");
  }

  const invite = asInvite(inviteRow as Record<string, unknown>);

  if (invite.revoked_at) {
    throw new Error("This invite has been revoked.");
  }

  if (invite.accepted_at) {
    throw new Error("This invite has already been accepted.");
  }

  if (isTimestampExpired(invite.expires_at)) {
    throw new Error("This invite has expired. Ask an admin to send a new invite.");
  }

  if (normalizeEmail(invite.email) !== userEmail) {
    throw new Error("This invite is for a different email address than your signed-in account.");
  }

  const { data: existingMembership, error: existingMembershipError } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", invite.organization_id)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingMembershipError) {
    throw new Error(`Failed to load membership state: ${existingMembershipError.message}`);
  }

  await assertSeatCapacityForOrganization(invite.organization_id, {
    client: admin,
    reserve: existingMembership ? 0 : 1,
    ignoreInviteId: invite.id,
    includePendingInvites: true,
  });

  if (!existingMembership) {
    const { error: memberInsertError } = await admin.from("organization_members").insert({
      organization_id: invite.organization_id,
      user_id: params.userId,
      role: invite.role,
    });

    if (memberInsertError && memberInsertError.code !== "23505") {
      throw new Error(`Failed to add user to organization: ${memberInsertError.message}`);
    }
  }

  const nowIso = new Date().toISOString();
  const { error: inviteUpdateError } = await admin
    .from("organization_invites")
    .update({
      accepted_at: nowIso,
      accepted_by: params.userId,
      updated_at: nowIso,
    })
    .eq("id", invite.id)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (inviteUpdateError) {
    throw new Error(`Failed to mark invite as accepted: ${inviteUpdateError.message}`);
  }

  const { error: profileUpsertError } = await admin.from("user_profiles").upsert(
    {
      user_id: params.userId,
      active_organization_id: invite.organization_id,
      updated_at: nowIso,
    },
    { onConflict: "user_id" },
  );

  if (profileUpsertError) {
    throw new Error(`Failed to switch active organization: ${profileUpsertError.message}`);
  }

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id,name,slug")
    .eq("id", invite.organization_id)
    .maybeSingle();

  if (orgError) {
    throw new Error(`Failed to load organization details: ${orgError.message}`);
  }

  const seatSummary = await getSeatSummaryForOrganization(invite.organization_id, {
    client: admin,
    includePendingInvites: true,
  });

  return {
    organization: organization
      ? {
          id: String(organization.id),
          name: String(organization.name),
          slug: String(organization.slug),
        }
      : null,
    seatSummary,
  };
}
