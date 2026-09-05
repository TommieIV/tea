create type public.workspace_type as enum ('personal', 'household', 'business');
create type public.membership_status as enum ('active', 'invited', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  type public.workspace_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.permissions (
  key text primary key check (key ~ '^[a-z0-9-]+(\.[a-z0-9-]+){2,}$'),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);

create table public.workspace_modules (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  module_id text not null check (module_id ~ '^[a-z0-9-]+$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (workspace_id, module_id)
);

create index memberships_user_workspace_idx on public.memberships (user_id, workspace_id) where status = 'active';
create index workspace_modules_workspace_idx on public.workspace_modules (workspace_id) where enabled;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.workspace_modules enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.workspaces, public.roles, public.permissions, public.role_permissions, public.memberships, public.workspace_modules to authenticated;

create schema if not exists private;

create function private.is_active_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create function public.get_my_workspace_contexts()
returns table (
  workspace_id uuid,
  workspace_name text,
  workspace_type public.workspace_type,
  role_name text,
  permission_keys text[],
  enabled_module_ids text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    workspace.id,
    workspace.name,
    workspace.type,
    role.name,
    coalesce(array_agg(distinct role_permission.permission_key) filter (where role_permission.permission_key is not null), '{}') as permission_keys,
    coalesce(array_agg(distinct workspace_module.module_id) filter (where workspace_module.enabled), '{}') as enabled_module_ids
  from public.memberships membership
  join public.workspaces workspace on workspace.id = membership.workspace_id
  join public.roles role on role.id = membership.role_id
  left join public.role_permissions role_permission on role_permission.role_id = role.id
  left join public.workspace_modules workspace_module on workspace_module.workspace_id = workspace.id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
  group by workspace.id, workspace.name, workspace.type, role.name
  order by workspace.name;
$$;

revoke all on function public.get_my_workspace_contexts() from public;
grant execute on function public.get_my_workspace_contexts() to authenticated;

create policy "Profiles are visible to their owner"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Profiles are editable by their owner"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Members can view their workspaces"
on public.workspaces for select to authenticated
using (private.is_active_workspace_member(id));

create policy "Members can view their own memberships"
on public.memberships for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members can view roles in their workspaces"
on public.roles for select to authenticated
using (private.is_active_workspace_member(workspace_id));

create policy "Authenticated users can view permission definitions"
on public.permissions for select to authenticated
using (true);

create policy "Members can view role permissions in their workspaces"
on public.role_permissions for select to authenticated
using (exists (
  select 1 from public.roles
  where roles.id = role_permissions.role_id
    and private.is_active_workspace_member(roles.workspace_id)
));

create policy "Members can view enabled modules in their workspaces"
on public.workspace_modules for select to authenticated
using (private.is_active_workspace_member(workspace_id));

