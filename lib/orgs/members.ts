import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/clickfunnels/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrgRole } from "@/lib/orgs/server";

export type OrganizationMember = {
  user_id: string;
  role: OrgRole;
  email: string | null;
  created_at: string;
};

type MemberRow = {
  user_id: string;
  role: string;
  created_at: string;
};

function normalizeRole(value: string): OrgRole {
  if (value === "owner" || value === "admin" || value === "member") return value;
  return "member";
}

function validateManagedRole(value: string): Extract<OrgRole, "admin" | "member"> {
  if (value === "admin" || value === "member") return value;
  throw new Error("Role must be admin or member.");
}

async function getMemberRow(
  client: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<MemberRow | null> {
  const { data, error } = await client
    .from("organization_members")
    .select("user_id,role,created_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load organization member: ${error.message}`);
  }

  if (!data) return null;

  return {
    user_id: String(data.user_id),
    role: String(data.role),
    created_at: String(data.created_at),
  };
}

async function loadUserEmails(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .schema("auth")
    .from("users")
    .select("id,email")
    .in("id", userIds);

  if (error) {
    throw new Error(`Failed to load member emails: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const id = String((row as { id?: string }).id ?? "");
    const email = (row as { email?: string | null }).email ?? null;
    if (id && email) {
      map.set(id, email);
    }
  }

  return map;
}

export async function listMembersForOrganization(
  organizationId: string,
  options?: { client?: SupabaseClient },
): Promise<OrganizationMember[]> {
  const client = options?.client ?? (await getServerSupabase());
  const { data, error } = await client
    .from("organization_members")
    .select("user_id,role,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load organization members: ${error.message}`);
  }

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    user_id: String(row.user_id ?? ""),
    role: String(row.role ?? "member"),
    created_at: String(row.created_at ?? ""),
  }));

  const userIds = rows.map((entry) => entry.user_id).filter(Boolean);
  const emailByUserId = await loadUserEmails(userIds);

  return rows.map((row) => ({
    user_id: row.user_id,
    role: normalizeRole(row.role),
    email: emailByUserId.get(row.user_id) ?? null,
    created_at: row.created_at,
  }));
}

async function updateFallbackActiveOrganizationForRemovedUser(organizationId: string, userId: string) {
  const admin = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("active_organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load removed member profile: ${profileError.message}`);
  }

  const activeOrganizationId = (profile?.active_organization_id as string | null | undefined) ?? null;
  if (activeOrganizationId !== organizationId) {
    return;
  }

  const { data: nextMembership, error: nextMembershipError } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextMembershipError) {
    throw new Error(`Failed to load fallback organization for removed member: ${nextMembershipError.message}`);
  }

  const nextOrganizationId = (nextMembership?.organization_id as string | null | undefined) ?? null;
  const { error: upsertError } = await admin.from("user_profiles").upsert(
    {
      user_id: userId,
      active_organization_id: nextOrganizationId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    throw new Error(`Failed to update removed member active organization: ${upsertError.message}`);
  }
}

export async function updateOrganizationMemberRole(params: {
  organizationId: string;
  targetUserId: string;
  role: string;
  actorUserId: string;
}) {
  const targetRole = validateManagedRole(params.role);
  const client = await getServerSupabase();

  const targetMembership = await getMemberRow(client, params.organizationId, params.targetUserId);
  if (!targetMembership) {
    throw new Error("Organization member not found.");
  }

  if (targetMembership.role === "owner") {
    throw new Error("Owner role cannot be changed from this action.");
  }

  if (targetMembership.user_id === params.actorUserId) {
    throw new Error("You cannot change your own role with this action.");
  }

  const { error } = await client
    .from("organization_members")
    .update({
      role: targetRole,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("user_id", params.targetUserId);

  if (error) {
    throw new Error(`Failed to update organization member role: ${error.message}`);
  }

  return {
    user_id: params.targetUserId,
    role: targetRole,
  };
}

export async function removeOrganizationMember(params: {
  organizationId: string;
  targetUserId: string;
  actorUserId: string;
}) {
  const client = await getServerSupabase();

  const targetMembership = await getMemberRow(client, params.organizationId, params.targetUserId);
  if (!targetMembership) {
    throw new Error("Organization member not found.");
  }

  if (targetMembership.role === "owner") {
    throw new Error("Owners cannot be removed from organization membership.");
  }

  if (targetMembership.user_id === params.actorUserId) {
    throw new Error("You cannot remove yourself with this action.");
  }

  const { error } = await client
    .from("organization_members")
    .delete()
    .eq("organization_id", params.organizationId)
    .eq("user_id", params.targetUserId);

  if (error) {
    throw new Error(`Failed to remove organization member: ${error.message}`);
  }

  await updateFallbackActiveOrganizationForRemovedUser(params.organizationId, params.targetUserId);

  return {
    user_id: params.targetUserId,
  };
}
