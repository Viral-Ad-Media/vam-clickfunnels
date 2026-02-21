-- ClickFunnels integration schema for Supabase
-- Creates app configuration + OAuth token storage tables used by the Next.js server layer.

-- Keep updated_at synchronized on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.clickfunnels_apps (
  user_id uuid primary key references auth.users (id) on delete cascade,
  client_id text not null check (length(trim(client_id)) > 0),
  client_secret text not null check (length(trim(client_secret)) > 0),
  workspace_url text not null check (workspace_url ~ '^https?://'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clickfunnels_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null check (length(trim(access_token)) > 0),
  refresh_token text not null check (length(trim(refresh_token)) > 0),
  token_type text not null default 'Bearer',
  scope text,
  expires_at integer not null check (expires_at > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_clickfunnels_tokens_expires_at
  on public.clickfunnels_tokens (expires_at);

-- Auto-update timestamps.
drop trigger if exists set_updated_at_on_clickfunnels_apps on public.clickfunnels_apps;
create trigger set_updated_at_on_clickfunnels_apps
before update on public.clickfunnels_apps
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_clickfunnels_tokens on public.clickfunnels_tokens;
create trigger set_updated_at_on_clickfunnels_tokens
before update on public.clickfunnels_tokens
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.clickfunnels_apps enable row level security;
alter table public.clickfunnels_tokens enable row level security;

drop policy if exists "Users can select own clickfunnels_apps" on public.clickfunnels_apps;
create policy "Users can select own clickfunnels_apps"
on public.clickfunnels_apps
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own clickfunnels_apps" on public.clickfunnels_apps;
create policy "Users can insert own clickfunnels_apps"
on public.clickfunnels_apps
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own clickfunnels_apps" on public.clickfunnels_apps;
create policy "Users can update own clickfunnels_apps"
on public.clickfunnels_apps
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own clickfunnels_apps" on public.clickfunnels_apps;
create policy "Users can delete own clickfunnels_apps"
on public.clickfunnels_apps
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own clickfunnels_tokens" on public.clickfunnels_tokens;
create policy "Users can select own clickfunnels_tokens"
on public.clickfunnels_tokens
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own clickfunnels_tokens" on public.clickfunnels_tokens;
create policy "Users can insert own clickfunnels_tokens"
on public.clickfunnels_tokens
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own clickfunnels_tokens" on public.clickfunnels_tokens;
create policy "Users can update own clickfunnels_tokens"
on public.clickfunnels_tokens
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own clickfunnels_tokens" on public.clickfunnels_tokens;
create policy "Users can delete own clickfunnels_tokens"
on public.clickfunnels_tokens
for delete
using (auth.uid() = user_id);

-- Privileges
revoke all on public.clickfunnels_apps from anon;
revoke all on public.clickfunnels_tokens from anon;

grant select, insert, update, delete on public.clickfunnels_apps to authenticated, service_role;
grant select, insert, update, delete on public.clickfunnels_tokens to authenticated, service_role;
