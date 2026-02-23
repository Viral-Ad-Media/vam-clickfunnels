import "server-only";
import { getServerSupabase, getUserId } from "@/lib/clickfunnels/server";

export type OrgRole = "owner" | "admin" | "member";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export type OrganizationMembership = OrganizationSummary & {
  role: OrgRole;
};

type MembershipRow = {
  role: string | null;
  organization:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

function normalizeRole(value: string | null | undefined): OrgRole {
  if (value === "owner" || value === "admin" || value === "member") return value;
  return "member";
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return normalized || "workspace";
}

function withSuffix(base: string, attempt: number) {
  if (attempt === 0) return base;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function buildDefaultOrgName() {
  return "My Workspace";
}

function normalizeOrganization(value: MembershipRow["organization"]): OrganizationSummary | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    const first = value[0];
    if (!first) return null;
    return {
      id: first.id,
      name: first.name,
      slug: first.slug,
    };
  }

  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
  };
}

export function canManageOrganization(role: OrgRole) {
  return role === "owner" || role === "admin";
}

export async function requireAuthenticatedUserId() {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Not authenticated. Sign in to continue.");
  }
  return userId;
}

export async function listOrganizationsForUser(userId?: string): Promise<OrganizationMembership[]> {
  const uid = userId ?? (await requireAuthenticatedUserId());
  const sb = await getServerSupabase();

  const { data, error } = await sb
    .from("organization_members")
    .select("role, organization:organizations(id,name,slug)")
    .eq("user_id", uid)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load organizations: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as MembershipRow[];

  return rows
    .map((row) => {
      const organization = normalizeOrganization(row.organization);
      if (!organization) return null;
      return {
        ...organization,
        role: normalizeRole(row.role),
      };
    })
    .filter((entry): entry is OrganizationMembership => entry !== null);
}

async function ensureProfileExists(userId: string) {
  const sb = await getServerSupabase();
  const { error } = await sb.from("user_profiles").upsert(
    {
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to initialize user profile: ${error.message}`);
  }
}

async function createPersonalOrganization(userId: string): Promise<OrganizationSummary> {
  const sb = await getServerSupabase();
  const baseSlug = slugify(`workspace-${userId.slice(0, 8)}`);
  const name = buildDefaultOrgName();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = withSuffix(baseSlug, attempt);
    const { data, error } = await sb
      .from("organizations")
      .insert({
        name,
        slug,
        created_by: userId,
      })
      .select("id,name,slug")
      .single();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
      };
    }

    if (error && error.code === "23505") {
      continue;
    }

    throw new Error(`Failed to create default organization: ${error?.message ?? "unknown error"}`);
  }

  throw new Error("Failed to generate a unique organization slug.");
}

async function setActiveOrganizationRow(userId: string, organizationId: string) {
  const sb = await getServerSupabase();
  const { error } = await sb.from("user_profiles").upsert(
    {
      user_id: userId,
      active_organization_id: organizationId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to set active organization: ${error.message}`);
  }
}

export async function ensureActiveOrganizationForUser(userId?: string): Promise<OrganizationMembership> {
  const uid = userId ?? (await requireAuthenticatedUserId());
  await ensureProfileExists(uid);

  let memberships = await listOrganizationsForUser(uid);

  if (memberships.length === 0) {
    const org = await createPersonalOrganization(uid);
    memberships = [
      {
        ...org,
        role: "owner",
      },
    ];
  }

  const sb = await getServerSupabase();
  const { data: profile, error } = await sb
    .from("user_profiles")
    .select("active_organization_id")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active organization: ${error.message}`);
  }

  const activeId = profile?.active_organization_id as string | null | undefined;
  const activeMembership = memberships.find((membership) => membership.id === activeId) ?? memberships[0];

  if (!activeMembership) {
    throw new Error("No organization membership found for this account.");
  }

  if (activeMembership.id !== activeId) {
    await setActiveOrganizationRow(uid, activeMembership.id);
  }

  return activeMembership;
}

export async function setActiveOrganizationForUser(organizationId: string, userId?: string): Promise<OrganizationMembership> {
  const uid = userId ?? (await requireAuthenticatedUserId());
  const memberships = await listOrganizationsForUser(uid);
  const membership = memberships.find((entry) => entry.id === organizationId);

  if (!membership) {
    throw new Error("You are not a member of that organization.");
  }

  await setActiveOrganizationRow(uid, organizationId);
  return membership;
}

export async function getMembershipForOrganization(
  organizationId: string,
  userId?: string,
): Promise<OrganizationMembership | null> {
  const uid = userId ?? (await requireAuthenticatedUserId());
  const sb = await getServerSupabase();

  const { data, error } = await sb
    .from("organization_members")
    .select("role, organization:organizations(id,name,slug)")
    .eq("organization_id", organizationId)
    .eq("user_id", uid)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load organization membership: ${error.message}`);
  }

  const row = data as MembershipRow | null;
  if (!row) return null;

  const organization = normalizeOrganization(row.organization);
  if (!organization) return null;

  return {
    ...organization,
    role: normalizeRole(row.role),
  };
}

export async function createOrganizationForUser(name: string, userId?: string): Promise<OrganizationMembership> {
  const uid = userId ?? (await requireAuthenticatedUserId());
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    throw new Error("Organization name must be at least 2 characters.");
  }

  const baseSlug = slugify(trimmed);
  const sb = await getServerSupabase();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = withSuffix(baseSlug, attempt);

    const { data, error } = await sb
      .from("organizations")
      .insert({
        name: trimmed,
        slug,
        created_by: uid,
      })
      .select("id,name,slug")
      .single();

    if (!error && data) {
      await setActiveOrganizationRow(uid, data.id);
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        role: "owner",
      };
    }

    if (error && error.code === "23505") {
      continue;
    }

    throw new Error(`Failed to create organization: ${error?.message ?? "unknown error"}`);
  }

  throw new Error("Failed to create organization with a unique slug.");
}

export async function requireActiveOrganization(options?: { requireManager?: boolean }) {
  const userId = await requireAuthenticatedUserId();
  const organization = await ensureActiveOrganizationForUser(userId);

  if (options?.requireManager && !canManageOrganization(organization.role)) {
    throw new Error("Organization admin access is required for this action.");
  }

  return {
    userId,
    organization,
  };
}
