alter type public.task_push_notification_kind add value if not exists 'completed';

alter table public.task_items
add column notify_creator_on_completion boolean not null default false;

drop function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid);

create function public.tasks_create_item(
  target_workspace_id uuid, task_title text, selected_category_id uuid default null, selected_priority public.task_priority default null, task_due_date date default null, task_due_at timestamptz default null,
  notification_target_type public.task_notification_target_type default null, notification_membership_id uuid default null, notification_group_id uuid default null, notify_creator_on_completion boolean default false
)
returns public.task_items
language plpgsql security definer set search_path = public
as $$
declare resolved_category_id uuid; resolved_priority public.task_priority; created_item public.task_items;
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.create') then raise exception 'You do not have permission to create tasks in this workspace.' using errcode = '42501'; end if;
  if nullif(btrim(task_title), '') is null then raise exception 'A task title is required.' using errcode = '22023'; end if;
  if task_due_at is not null and task_due_date is null then raise exception 'A due time requires a due date.' using errcode = '22023'; end if;
  select coalesce(selected_category_id, settings.default_category_id), coalesce(selected_priority, settings.default_priority) into resolved_category_id, resolved_priority from public.task_settings settings where settings.workspace_id = target_workspace_id;
  resolved_category_id := coalesce(resolved_category_id, selected_category_id); resolved_priority := coalesce(resolved_priority, selected_priority);
  if resolved_category_id is not null and not exists (select 1 from public.task_categories category where category.id = resolved_category_id and category.workspace_id = target_workspace_id and not category.archived) then raise exception 'The selected task category is not available in this workspace.' using errcode = '22023'; end if;
  if notification_target_type is null then notification_target_type := 'everyone'; notification_membership_id := null; notification_group_id := null;
  elsif not private.has_workspace_permission(target_workspace_id, 'tasks.items.assign') then raise exception 'You do not have permission to assign task notifications in this workspace.' using errcode = '42501'; end if;
  if notification_target_type = 'everyone' and notification_membership_id is null and notification_group_id is null then null;
  elsif notification_target_type = 'member' and notification_group_id is null and exists (select 1 from public.memberships where id = notification_membership_id and workspace_id = target_workspace_id and status = 'active') then null;
  elsif notification_target_type = 'group' and notification_membership_id is null and exists (select 1 from public.workspace_groups where id = notification_group_id and workspace_id = target_workspace_id) then null;
  else raise exception 'The selected notification target is not available in this workspace.' using errcode = '22023'; end if;
  insert into public.task_items (workspace_id, title, category_id, priority, due_date, due_at, created_by, notify_creator_on_completion)
  values (target_workspace_id, btrim(task_title), resolved_category_id, resolved_priority, task_due_date, task_due_at, (select auth.uid()), notify_creator_on_completion) returning * into created_item;
  insert into public.task_notification_targets (task_id, workspace_id, target_type, membership_id, group_id) values (created_item.id, target_workspace_id, notification_target_type, notification_membership_id, notification_group_id);
  return created_item;
end;
$$;

drop function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid);

create function public.tasks_update_item(
  target_workspace_id uuid, target_item_id uuid, task_title text, selected_category_id uuid, selected_priority public.task_priority, task_due_date date, task_due_at timestamptz,
  notification_target_type public.task_notification_target_type default null, notification_membership_id uuid default null, notification_group_id uuid default null, new_notify_creator_on_completion boolean default null
)
returns public.task_items
language plpgsql security definer set search_path = public
as $$
declare task_creator_id uuid; updated_item public.task_items;
begin
  select created_by into task_creator_id from public.task_items where id = target_item_id and workspace_id = target_workspace_id;
  if task_creator_id is null then raise exception 'The task was not found in this workspace.' using errcode = 'P0002'; end if;
  if task_creator_id = (select auth.uid()) then if not (private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-own') or private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-any')) then raise exception 'You do not have permission to edit tasks you created in this workspace.' using errcode = '42501'; end if;
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
  update public.task_items set title = btrim(task_title), category_id = selected_category_id, priority = selected_priority, due_date = task_due_date, due_at = task_due_at,
    notify_creator_on_completion = coalesce(new_notify_creator_on_completion, task_items.notify_creator_on_completion), updated_at = now()
  where id = target_item_id and workspace_id = target_workspace_id returning * into updated_item;
  if task_due_at is null then delete from public.task_push_notifications where task_id = target_item_id and kind = 'due' and sent_at is null;
  else insert into public.task_push_notifications (task_id, kind, scheduled_for) values (target_item_id, 'due', task_due_at) on conflict (task_id, kind) do update set scheduled_for = excluded.scheduled_for, sent_at = null; end if;
  return updated_item;
end;
$$;

create or replace function public.tasks_set_item_completed(target_workspace_id uuid, target_item_id uuid, is_completed boolean)
returns public.task_items
language plpgsql security definer set search_path = public
as $$
declare updated_item public.task_items;
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.complete') then raise exception 'You do not have permission to complete tasks in this workspace.' using errcode = '42501'; end if;
  update public.task_items set completed_at = case when is_completed then now() else null end, updated_at = now()
  where id = target_item_id and workspace_id = target_workspace_id and archived_at is null returning * into updated_item;
  if updated_item.id is null then raise exception 'The active task was not found in this workspace.' using errcode = 'P0002'; end if;
  if is_completed and updated_item.notify_creator_on_completion then
    insert into public.task_push_notifications (task_id, user_id, kind, scheduled_for)
    values (updated_item.id, updated_item.created_by, 'completed', now())
    on conflict (task_id, kind) do update set user_id = excluded.user_id, scheduled_for = excluded.scheduled_for, sent_at = null;
  end if;
  return updated_item;
end;
$$;

revoke all on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid, boolean) from public;
revoke all on function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid, boolean) from public;
revoke all on function public.tasks_set_item_completed(uuid, uuid, boolean) from public;
grant execute on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid, boolean) to authenticated;
grant execute on function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz, public.task_notification_target_type, uuid, uuid, boolean) to authenticated;
grant execute on function public.tasks_set_item_completed(uuid, uuid, boolean) to authenticated;
