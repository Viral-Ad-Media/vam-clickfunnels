-- Multi-tenant SaaS schema: organizations, memberships, active organization profile,
-- and Stripe billing scaffold. Also scopes existing ClickFunnels tables to organizations.

create extension if not exists pgcrypto;

-- Existing helper from prior migration, recreated safely to keep migrations independent.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_organization_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 1),
  slug text not null unique check (length(trim(slug)) > 2),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create table if not exists public.organization_billing (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  subscription_status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_org_members_user_id
  on public.organization_members (user_id);

create index if not exists idx_org_members_org_role
  on public.organization_members (organization_id, role);

create index if not exists idx_user_profiles_active_org
  on public.user_profiles (active_organization_id);

create index if not exists idx_org_billing_customer
  on public.organization_billing (stripe_customer_id);

create index if not exists idx_org_billing_subscription
  on public.organization_billing (stripe_subscription_id);

alter table public.user_profiles
  add constraint user_profiles_active_org_fkey
  foreign key (active_organization_id)
  references public.organizations (id)
  on delete set null;

create or replace function public.create_org_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (organization_id, user_id)
  do update set
    role = 'owner',
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists create_org_owner_membership_on_insert on public.organizations;
create trigger create_org_owner_membership_on_insert
after insert on public.organizations
for each row execute function public.create_org_owner_membership();

-- Bootstrap profile + personal organization for all existing users.
insert into public.user_profiles (user_id)
select u.id
from auth.users u
on conflict (user_id) do nothing;

with users_without_org as (
  select
    u.id,
    coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'workspace') as name_base
  from auth.users u
  where not exists (
    select 1
    from public.organization_members m
    where m.user_id = u.id
  )
)
insert into public.organizations (name, slug, created_by)
select
  initcap(replace(name_base, '.', ' ')) || '''s Workspace',
  'org-' || substr(replace(id::text, '-', ''), 1, 12),
  id
from users_without_org
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select o.id, o.created_by, 'owner'
from public.organizations o
on conflict (organization_id, user_id) do nothing;

update public.user_profiles p
set
  active_organization_id = source.organization_id,
  updated_at = timezone('utc', now())
from (
  select distinct on (m.user_id)
    m.user_id,
    m.organization_id
  from public.organization_members m
  order by m.user_id, m.created_at asc
) as source
where p.user_id = source.user_id
  and p.active_organization_id is null;

-- Helper functions used by RLS policies.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_owner(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

-- Scope existing ClickFunnels tables to organization.
alter table public.clickfunnels_apps
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

alter table public.clickfunnels_tokens
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

update public.clickfunnels_apps apps
set organization_id = coalesce(
  (select p.active_organization_id from public.user_profiles p where p.user_id = apps.user_id),
  (
    select m.organization_id
    from public.organization_members m
    where m.user_id = apps.user_id
    order by
      case m.role
        when 'owner' then 0
        when 'admin' then 1
        else 2
      end,
      m.created_at asc
    limit 1
  )
)
where apps.organization_id is null;

update public.clickfunnels_tokens tokens
set organization_id = coalesce(
  (select p.active_organization_id from public.user_profiles p where p.user_id = tokens.user_id),
  (
    select m.organization_id
    from public.organization_members m
    where m.user_id = tokens.user_id
    order by
      case m.role
        when 'owner' then 0
        when 'admin' then 1
        else 2
      end,
      m.created_at asc
    limit 1
  )
)
where tokens.organization_id is null;

alter table public.clickfunnels_apps
  alter column organization_id set not null;

alter table public.clickfunnels_tokens
  alter column organization_id set not null;

alter table public.clickfunnels_apps
  drop constraint if exists clickfunnels_apps_pkey;

alter table public.clickfunnels_tokens
  drop constraint if exists clickfunnels_tokens_pkey;

alter table public.clickfunnels_apps
  add constraint clickfunnels_apps_pkey primary key (organization_id);

alter table public.clickfunnels_tokens
  add constraint clickfunnels_tokens_pkey primary key (organization_id);

create index if not exists idx_clickfunnels_apps_user_id
  on public.clickfunnels_apps (user_id);

create index if not exists idx_clickfunnels_tokens_user_id
  on public.clickfunnels_tokens (user_id);

-- Triggers for timestamps.
drop trigger if exists set_updated_at_on_user_profiles on public.user_profiles;
create trigger set_updated_at_on_user_profiles
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_organizations on public.organizations;
create trigger set_updated_at_on_organizations
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_organization_members on public.organization_members;
create trigger set_updated_at_on_organization_members
before update on public.organization_members
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_organization_billing on public.organization_billing;
create trigger set_updated_at_on_organization_billing
before update on public.organization_billing
for each row execute function public.set_updated_at();

-- RLS
alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_billing enable row level security;
alter table public.clickfunnels_apps enable row level security;
alter table public.clickfunnels_tokens enable row level security;

-- Replace old per-user ClickFunnels policies.
drop policy if exists "Users can select own clickfunnels_apps" on public.clickfunnels_apps;
drop policy if exists "Users can insert own clickfunnels_apps" on public.clickfunnels_apps;
drop policy if exists "Users can update own clickfunnels_apps" on public.clickfunnels_apps;
drop policy if exists "Users can delete own clickfunnels_apps" on public.clickfunnels_apps;

drop policy if exists "Users can select own clickfunnels_tokens" on public.clickfunnels_tokens;
drop policy if exists "Users can insert own clickfunnels_tokens" on public.clickfunnels_tokens;
drop policy if exists "Users can update own clickfunnels_tokens" on public.clickfunnels_tokens;
drop policy if exists "Users can delete own clickfunnels_tokens" on public.clickfunnels_tokens;

create policy "Members can read clickfunnels apps"
on public.clickfunnels_apps
for select
using (public.is_org_member(organization_id));

create policy "Org admins can write clickfunnels apps"
on public.clickfunnels_apps
for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy "Members can read clickfunnels tokens"
on public.clickfunnels_tokens
for select
using (public.is_org_member(organization_id));

create policy "Org admins can write clickfunnels tokens"
on public.clickfunnels_tokens
for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- User profile policies.
drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles
for insert
with check (
  auth.uid() = user_id
  and (
    active_organization_id is null
    or public.is_org_member(active_organization_id)
  )
);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    active_organization_id is null
    or public.is_org_member(active_organization_id)
  )
);

-- Organization policies.
drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations"
on public.organizations
for select
using (public.is_org_member(id));

drop policy if exists "Users can create organizations" on public.organizations;
create policy "Users can create organizations"
on public.organizations
for insert
with check (auth.uid() = created_by);

drop policy if exists "Org admins can update organizations" on public.organizations;
create policy "Org admins can update organizations"
on public.organizations
for update
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

drop policy if exists "Org owners can delete organizations" on public.organizations;
create policy "Org owners can delete organizations"
on public.organizations
for delete
using (public.is_org_owner(id));

-- Membership policies.
drop policy if exists "Members can read organization memberships" on public.organization_members;
create policy "Members can read organization memberships"
on public.organization_members
for select
using (public.is_org_member(organization_id));

drop policy if exists "Org admins can manage memberships" on public.organization_members;
create policy "Org admins can manage memberships"
on public.organization_members
for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- Billing policies.
drop policy if exists "Members can read organization billing" on public.organization_billing;
create policy "Members can read organization billing"
on public.organization_billing
for select
using (public.is_org_member(organization_id));

drop policy if exists "Org admins can manage organization billing" on public.organization_billing;
create policy "Org admins can manage organization billing"
on public.organization_billing
for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- Privileges
revoke all on public.user_profiles from anon;
revoke all on public.organizations from anon;
revoke all on public.organization_members from anon;
revoke all on public.organization_billing from anon;

grant select, insert, update, delete on public.user_profiles to authenticated, service_role;
grant select, insert, update, delete on public.organizations to authenticated, service_role;
grant select, insert, update, delete on public.organization_members to authenticated, service_role;
grant select, insert, update, delete on public.organization_billing to authenticated, service_role;

-- Keep ClickFunnels grants explicit for this migration file.
grant select, insert, update, delete on public.clickfunnels_apps to authenticated, service_role;
grant select, insert, update, delete on public.clickfunnels_tokens to authenticated, service_role;
