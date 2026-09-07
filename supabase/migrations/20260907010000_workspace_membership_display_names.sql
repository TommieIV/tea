alter table public.memberships
add column workspace_display_name text
check (workspace_display_name is null or char_length(btrim(workspace_display_name)) between 1 and 80);

drop function if exists public.get_my_workspace_contexts();

create function public.get_my_workspace_contexts()
returns table (
  workspace_id uuid,
  workspace_name text,
  workspace_type public.workspace_type,
  role_name text,
  workspace_display_name text,
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
    membership.workspace_display_name,
    coalesce((
      select array_agg(permission.key order by permission.key)
      from public.permissions permission
      where private.has_workspace_permission(workspace.id, permission.key)
    ), '{}'),
    coalesce(array_agg(distinct workspace_module.module_id) filter (where workspace_module.enabled), '{}')
  from public.memberships membership
  join public.workspaces workspace on workspace.id = membership.workspace_id
  join public.roles role on role.id = membership.role_id
  left join public.workspace_modules workspace_module on workspace_module.workspace_id = workspace.id
  where membership.user_id = (select auth.uid()) and membership.status = 'active'
  group by workspace.id, workspace.name, workspace.type, role.name, membership.workspace_display_name
  order by workspace.name;
$$;

create function public.update_my_workspace_display_name(target_workspace_id uuid, new_workspace_display_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_active_workspace_member(target_workspace_id) then
    raise exception 'You are not an active member of this workspace.' using errcode = '42501';
  end if;
  update public.memberships
  set workspace_display_name = nullif(btrim(new_workspace_display_name), '')
  where workspace_id = target_workspace_id and user_id = (select auth.uid());
end;
$$;

drop function if exists public.admin_list_workspace_members(uuid);

create function public.admin_list_workspace_members(target_workspace_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  workspace_display_name text,
  email text,
  role_id uuid,
  role_name text,
  status public.membership_status,
  permission_overrides jsonb,
  effective_permission_keys text[]
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    membership.id,
    membership.user_id,
    coalesce(profile.display_name, auth_user.email),
    membership.workspace_display_name,
    auth_user.email,
    role.id,
    role.name,
    membership.status,
    coalesce(jsonb_object_agg(override.permission_key, override.effect) filter (where override.permission_key is not null), '{}'::jsonb),
    coalesce((
      select array_agg(permission.key order by permission.key)
      from public.permissions permission
      where private.membership_has_permission(membership.id, permission.key)
    ), '{}')
  from public.memberships membership
  join public.roles role on role.id = membership.role_id
  left join public.profiles profile on profile.id = membership.user_id
  left join auth.users auth_user on auth_user.id = membership.user_id
  left join public.membership_permission_overrides override on override.membership_id = membership.id
  where membership.workspace_id = target_workspace_id
    and private.has_workspace_permission(target_workspace_id, 'core.members.manage')
  group by membership.id, membership.user_id, profile.display_name, membership.workspace_display_name, auth_user.email, role.id, role.name, membership.status
  order by coalesce(membership.workspace_display_name, profile.display_name, auth_user.email);
$$;

revoke all on function public.get_my_workspace_contexts() from public;
revoke all on function public.update_my_workspace_display_name(uuid, text) from public;
revoke all on function public.admin_list_workspace_members(uuid) from public;
grant execute on function public.get_my_workspace_contexts() to authenticated;
grant execute on function public.update_my_workspace_display_name(uuid, text) to authenticated;
grant execute on function public.admin_list_workspace_members(uuid) to authenticated;
