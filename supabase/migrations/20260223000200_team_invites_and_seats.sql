-- Team onboarding by email + seat-based billing enforcement primitives.

alter table public.organization_billing
  add column if not exists seat_limit integer;

alter table public.organization_billing
  drop constraint if exists organization_billing_seat_limit_check;

alter table public.organization_billing
  add constraint organization_billing_seat_limit_check
  check (seat_limit is null or seat_limit > 0);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (length(trim(email)) > 3),
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references auth.users (id) on delete set null,
  token text not null unique check (length(trim(token)) > 20),
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_org_invites_org_id
  on public.organization_invites (organization_id);

create index if not exists idx_org_invites_email
  on public.organization_invites (lower(email));

create unique index if not exists idx_org_invites_unique_open
  on public.organization_invites (organization_id, lower(email))
  where accepted_at is null and revoked_at is null;

drop trigger if exists set_updated_at_on_organization_invites on public.organization_invites;
create trigger set_updated_at_on_organization_invites
before update on public.organization_invites
for each row execute function public.set_updated_at();

alter table public.organization_invites enable row level security;

drop policy if exists "Org admins can read organization invites" on public.organization_invites;
create policy "Org admins can read organization invites"
on public.organization_invites
for select
using (public.is_org_admin(organization_id));

drop policy if exists "Org admins can create organization invites" on public.organization_invites;
create policy "Org admins can create organization invites"
on public.organization_invites
for insert
with check (
  public.is_org_admin(organization_id)
  and invited_by = auth.uid()
);

drop policy if exists "Org admins can update organization invites" on public.organization_invites;
create policy "Org admins can update organization invites"
on public.organization_invites
for update
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "Org admins can delete organization invites" on public.organization_invites;
create policy "Org admins can delete organization invites"
on public.organization_invites
for delete
using (public.is_org_admin(organization_id));

revoke all on public.organization_invites from anon;
grant select, insert, update, delete on public.organization_invites to authenticated, service_role;
