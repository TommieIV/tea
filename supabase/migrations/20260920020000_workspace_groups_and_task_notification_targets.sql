begin;

create type public.task_notification_target_type as enum ('everyone', 'member', 'group');

create table public.workspace_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

alter table public.memberships
add constraint memberships_workspace_id_id_key unique (workspace_id, id);

create table public.workspace_group_members (
  workspace_id uuid not null,
  group_id uuid not null,
  membership_id uuid not null,
  primary key (group_id, membership_id),
  foreign key (workspace_id, group_id) references public.workspace_groups (workspace_id, id) on delete cascade,
  foreign key (workspace_id, membership_id) references public.memberships (workspace_id, id) on delete cascade
);

alter table public.task_items
add constraint task_items_workspace_id_id_key unique (workspace_id, id);

create table public.task_notification_targets (
  task_id uuid primary key,
  workspace_id uuid not null,
  target_type public.task_notification_target_type not null,
  membership_id uuid,
  group_id uuid,
  created_at timestamptz not null default now(),
  check (
    (target_type = 'everyone' and membership_id is null and group_id is null)
    or (target_type = 'member' and membership_id is not null and group_id is null)
    or (target_type = 'group' and membership_id is null and group_id is not null)
  ),
  foreign key (workspace_id, task_id) references public.task_items (workspace_id, id) on delete cascade,
  foreign key (workspace_id, membership_id) references public.memberships (workspace_id, id) on delete restrict,
  foreign key (workspace_id, group_id) references public.workspace_groups (workspace_id, id) on delete restrict
);

create index workspace_group_members_membership_idx on public.workspace_group_members (membership_id);
create index task_notification_targets_workspace_idx on public.task_notification_targets (workspace_id);

alter table public.workspace_groups enable row level security;
alter table public.workspace_group_members enable row level security;
alter table public.task_notification_targets enable row level security;
revoke all on public.workspace_groups, public.workspace_group_members, public.task_notification_targets from anon, authenticated;
grant select on public.task_notification_targets to authenticated;

create policy "Task viewers can view task notification targets"
on public.task_notification_targets for select to authenticated
using (private.has_workspace_permission(workspace_id, 'tasks.items.view'));

insert into public.task_notification_targets (task_id, workspace_id, target_type, membership_id)
select task.id, task.workspace_id, 'member', membership.id
from public.task_items task
join public.memberships membership
  on membership.workspace_id = task.workspace_id
 and membership.user_id = task.created_by
 and membership.status = 'active'
on conflict (task_id) do nothing;

alter table public.task_push_notifications
drop constraint if exists task_push_notifications_task_id_user_id_kind_key;

alter table public.task_push_notifications
alter column user_id drop not null;

alter table public.task_push_notifications
add constraint task_push_notifications_task_id_kind_key unique (task_id, kind);

create or replace function private.queue_task_push_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_push_notifications (task_id, kind, scheduled_for)
  values (new.id, 'created', now())
  on conflict (task_id, kind) do nothing;

  if new.due_at is not null then
    insert into public.task_push_notifications (task_id, kind, scheduled_for)
    values (new.id, 'due', new.due_at)
    on conflict (task_id, kind) do nothing;
  end if;

  return new;
end;
$$;

drop function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz);

create function public.tasks_create_item(
  target_workspace_id uuid,
  task_title text,
  selected_category_id uuid default null,
  selected_priority public.task_priority default null,
  task_due_date date default null,
  task_due_at timestamptz default null,
  notification_target_type public.task_notification_target_type default null,
  notification_membership_id uuid default null,
  notification_group_id uuid default null
)
returns public.task_items
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_category_id uuid;
  resolved_priority public.task_priority;
  resolved_membership_id uuid;
  created_item public.task_items;
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.create') then
    raise exception 'You do not have permission to create tasks in this workspace.' using errcode = '42501';
  end if;
  if nullif(btrim(task_title), '') is null then raise exception 'A task title is required.' using errcode = '22023'; end if;
  if task_due_at is not null and task_due_date is null then raise exception 'A due time requires a due date.' using errcode = '22023'; end if;

  select coalesce(selected_category_id, settings.default_category_id), coalesce(selected_priority, settings.default_priority)
  into resolved_category_id, resolved_priority from public.task_settings settings where settings.workspace_id = target_workspace_id;
  resolved_category_id := coalesce(resolved_category_id, selected_category_id);
  resolved_priority := coalesce(resolved_priority, selected_priority);
  if resolved_category_id is not null and not exists (select 1 from public.task_categories category where category.id = resolved_category_id and category.workspace_id = target_workspace_id and not category.archived) then
    raise exception 'The selected task category is not available in this workspace.' using errcode = '22023';
  end if;

  if notification_target_type is null then
    notification_target_type := 'member';
    select id into notification_membership_id from public.memberships where workspace_id = target_workspace_id and user_id = (select auth.uid()) and status = 'active';
    notification_group_id := null;
  elsif not private.has_workspace_permission(target_workspace_id, 'tasks.items.assign') then
    raise exception 'You do not have permission to assign task notifications in this workspace.' using errcode = '42501';
  end if;

  if notification_target_type = 'everyone' and notification_membership_id is null and notification_group_id is null then
    null;
  elsif notification_target_type = 'member' and notification_group_id is null and exists (select 1 from public.memberships where id = notification_membership_id and workspace_id = target_workspace_id and status = 'active') then
    null;
  elsif notification_target_type = 'group' and notification_membership_id is null and exists (select 1 from public.workspace_groups where id = notification_group_id and workspace_id = target_workspace_id) then
    null;
  else
    raise exception 'The selected notification target is not available in this workspace.' using errcode = '22023';
  end if;

  insert into public.task_items (workspace_id, title, category_id, priority, due_date, due_at, created_by)
  values (target_workspace_id, btrim(task_title), resolved_category_id, resolved_priority, task_due_date, task_due_at, (select auth.uid())) returning * into created_item;
  insert into public.task_notification_targets (task_id, workspace_id, target_type, membership_id, group_id)
  values (created_item.id, target_workspace_id, notification_target_type, notification_membership_id, notification_group_id);
  return created_item;
end;
$$;

drop function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz);

create function public.tasks_update_item(
  target_workspace_id uuid, target_item_id uuid, task_title text, selected_category_id uuid, selected_priority public.task_priority, task_due_date date, task_due_at timestamptz,
  notification_target_type public.task_notification_target_type default null, notification_membership_id uuid default null, notification_group_id uuid default null
)
returns public.task_items
language plpgsql security definer set search_path = public
as $$
declare task_creator_id uuid; updated_item public.task_items;
begin
  select created_by into task_creator_id from public.task_items where id = target_item_id and workspace_id = target_workspace_id;
  if task_creator_id is null then raise exception 'The task was not found in this workspace.' using errcode = 'P0002'; end if;
  if task_creator_id = (select auth.uid()) then
    if not (private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-own') or private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-any')) then raise exception 'You do not have permission to edit tasks you created in this workspace.' using errcode = '42501'; end if;
  elsif not private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-any') then raise exception 'You do not have permission to edit tasks created by other members.' using errcode = '42501'; end if;
  if nullif(btrim(task_title), '') is null then raise exception 'A task title is required.' using errcode = '22023'; end if;
  if task_due_at is not null and task_due_date is null then raise exception 'A due time requires a due date.' using errcode = '22023'; end if;
  if selected_category_id is not null and not exists (select 1 from public.task_categories category where category.id = selected_category_id and category.workspace_id = target_workspace_id and not category.archived) then raise exception 'The selected task category is not available in this workspace.' using errcode = '22023'; end if;

  if notification_target_type is not null then
    if not private.has_workspace_permission(target_workspace_id, 'tasks.items.assign') then raise exception 'You do not have permission to assign task notifications in this workspace.' using errcode = '42501'; end if;
    if notification_target_type = 'everyone' and notification_membership_id is null and notification_group_id is null then null;
    elsif notification_target_type = 'member' and notification_group_id is null and exists (select 1 from public.memberships where id = notification_membership_id and workspace_id = target_workspace_id and status = 'active') then null;
    elsif notification_target_type = 'group' and notification_membership_id is null and exists (select 1 from public.workspace_groups where id = notification_group_id and workspace_id = target_workspace_id) then null;
    else raise exception 'The selected notification target is not available in this workspace.' using errcode = '22023'; end if;
    update public.task_notification_targets set target_type = notification_target_type, membership_id = notification_membership_id, group_id = notification_group_id where task_id = target_item_id;
  end if;

  update public.task_items set title = btrim(task_title), category_id = selected_category_id, priority = selected_priority, due_date = task_due_date, due_at = task_due_at, updated_at = now()
  where id = target_item_id and workspace_id = target_workspace_id returning * into updated_item;
  if task_due_at is null then delete from public.task_push_notifications where task_id = target_item_id and kind = 'due' and sent_at is null;
  else insert into public.task_push_notifications (task_id, kind, scheduled_for) values (target_item_id, 'due', task_due_at)
    on conflict (task_id, kind) do update set scheduled_for = excluded.scheduled_for, sent_at = null; end if;
  return updated_item;
end;
$$;

create function public.tasks_list_notification_targets(target_workspace_id uuid)
returns table (target_type public.task_notification_target_type, target_id uuid, label text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.assign') then raise exception 'You do not have permission to assign task notifications in this workspace.' using errcode = '42501'; end if;
  return query
  select 'member'::public.task_notification_target_type, membership.id, coalesce(membership.workspace_display_name, profile.display_name, 'Member')
  from public.memberships membership left join public.profiles profile on profile.id = membership.user_id
  where membership.workspace_id = target_workspace_id and membership.status = 'active'
  union all
  select 'group'::public.task_notification_target_type, workspace_group.id, workspace_group.name
  from public.workspace_groups workspace_group where workspace_group.workspace_id = target_workspace_id
  order by 1, 3;
end;
$$;

create function public.admin_list_workspace_groups(target_workspace_id uuid)
returns table (group_id uuid, group_name text, membership_ids uuid[])
language plpgsql stable security definer set search_path = public
as $$
begin
  if not private.has_workspace_permission(target_workspace_id, 'core.members.manage') then raise exception 'You do not have permission to manage workspace members.' using errcode = '42501'; end if;
  return query select workspace_group.id, workspace_group.name, coalesce(array_agg(group_member.membership_id) filter (where group_member.membership_id is not null), '{}')
  from public.workspace_groups workspace_group left join public.workspace_group_members group_member on group_member.group_id = workspace_group.id
  where workspace_group.workspace_id = target_workspace_id group by workspace_group.id, workspace_group.name order by workspace_group.name;
end;
$$;

create function public.admin_create_workspace_group(target_workspace_id uuid, new_group_name text, member_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_group_id uuid;
begin
  if not private.has_workspace_permission(target_workspace_id, 'core.members.manage') then raise exception 'You do not have permission to manage workspace members.' using errcode = '42501'; end if;
  if nullif(btrim(new_group_name), '') is null then raise exception 'A group name is required.' using errcode = '22023'; end if;
  if exists (select 1 from unnest(coalesce(member_ids, '{}')) id left join public.memberships membership on membership.id = id and membership.workspace_id = target_workspace_id and membership.status = 'active' where membership.id is null) then raise exception 'Every group member must be active in this workspace.' using errcode = '22023'; end if;
  insert into public.workspace_groups (workspace_id, name) values (target_workspace_id, btrim(new_group_name)) returning id into new_group_id;
  insert into public.workspace_group_members (workspace_id, group_id, membership_id) select target_workspace_id, new_group_id, id from unnest(coalesce(member_ids, '{}')) id;
  return new_group_id;
end;
$$;

create function public.admin_update_workspace_group(target_workspace_id uuid, target_group_id uuid, new_group_name text, member_ids uuid[] default '{}')
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not private.has_workspace_permission(target_workspace_id, 'core.members.manage') then raise exception 'You do not have permission to manage workspace members.' using errcode = '42501'; end if;
  if nullif(btrim(new_group_name), '') is null then raise exception 'A group name is required.' using errcode = '22023'; end if;
  if not exists (select 1 from public.workspace_groups where id = target_group_id and workspace_id = target_workspace_id) then raise exception 'The group was not found in this workspace.' using errcode = 'P0002'; end if;
  if exists (select 1 from unnest(coalesce(member_ids, '{}')) id left join public.memberships membership on membership.id = id and membership.workspace_id = target_workspace_id and membership.status = 'active' where membership.id is null) then raise exception 'Every group member must be active in this workspace.' using errcode = '22023'; end if;
  update public.workspace_groups set name = btrim(new_group_name) where id = target_group_id;
  delete from public.workspace_group_members where group_id = target_group_id;
  insert into public.workspace_group_members (workspace_id, group_id, membership_id) select target_workspace_id, target_group_id, id from unnest(coalesce(member_ids, '{}')) id;
end;
$$;

revoke all on function private.queue_task_push_notifications() from public;
revoke all on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid) from public;
revoke all on function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid) from public;
revoke all on function public.tasks_list_notification_targets(uuid) from public;
revoke all on function public.admin_list_workspace_groups(uuid) from public;
revoke all on function public.admin_create_workspace_group(uuid, text, uuid[]) from public;
revoke all on function public.admin_update_workspace_group(uuid, uuid, text, uuid[]) from public;
grant execute on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid) to authenticated;
grant execute on function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid) to authenticated;
grant execute on function public.tasks_list_notification_targets(uuid) to authenticated;
grant execute on function public.admin_list_workspace_groups(uuid) to authenticated;
grant execute on function public.admin_create_workspace_group(uuid, text, uuid[]) to authenticated;
grant execute on function public.admin_update_workspace_group(uuid, uuid, text, uuid[]) to authenticated;

insert into public.permissions (key, description)
values ('tasks.items.assign', 'Assign task notifications to workspace members, groups, or everyone.')
on conflict (key) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_key)
select role.id, 'tasks.items.assign' from public.roles role where role.name = 'Owner' on conflict do nothing;

commit;
