begin;

create or replace function public.tasks_update_item(
  target_workspace_id uuid,
  target_item_id uuid,
  task_title text,
  selected_category_id uuid,
  selected_priority public.task_priority,
  task_due_date date,
  task_due_at timestamptz
)
returns public.task_items
language plpgsql
security definer
set search_path = public
as $$
declare
  task_creator_id uuid;
  updated_item public.task_items;
begin
  select created_by into task_creator_id
  from public.task_items
  where id = target_item_id and workspace_id = target_workspace_id;

  if task_creator_id is null then
    raise exception 'The task was not found in this workspace.' using errcode = 'P0002';
  end if;

  if task_creator_id = (select auth.uid()) then
    if not (
      private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-own')
      or private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-any')
    ) then
      raise exception 'You do not have permission to edit tasks you created in this workspace.' using errcode = '42501';
    end if;
  elsif not private.has_workspace_permission(target_workspace_id, 'tasks.items.edit-any') then
    raise exception 'You do not have permission to edit tasks created by other members.' using errcode = '42501';
  end if;

  if nullif(btrim(task_title), '') is null then
    raise exception 'A task title is required.' using errcode = '22023';
  end if;

  if task_due_at is not null and task_due_date is null then
    raise exception 'A due time requires a due date.' using errcode = '22023';
  end if;

  if selected_category_id is not null and not exists (
    select 1 from public.task_categories category
    where category.id = selected_category_id
      and category.workspace_id = target_workspace_id
      and not category.archived
  ) then
    raise exception 'The selected task category is not available in this workspace.' using errcode = '22023';
  end if;

  update public.task_items
  set title = btrim(task_title),
      category_id = selected_category_id,
      priority = selected_priority,
      due_date = task_due_date,
      due_at = task_due_at,
      updated_at = now()
  where id = target_item_id and workspace_id = target_workspace_id
  returning * into updated_item;

  if task_due_at is null then
    delete from public.task_push_notifications
    where task_id = target_item_id and user_id = task_creator_id and kind = 'due' and sent_at is null;
  else
    insert into public.task_push_notifications (task_id, user_id, kind, scheduled_for, sent_at)
    values (target_item_id, task_creator_id, 'due', task_due_at, null)
    on conflict (task_id, user_id, kind) do update
    set scheduled_for = excluded.scheduled_for,
        sent_at = null;
  end if;

  return updated_item;
end;
$$;

revoke all on function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz) from public;
grant execute on function public.tasks_update_item(uuid, uuid, text, uuid, public.task_priority, date, timestamptz) to authenticated;

insert into public.permissions (key, description)
values
  ('tasks.items.edit-own', 'Edit tasks the member created in a workspace.'),
  ('tasks.items.edit-any', 'Edit any task in a workspace.')
on conflict (key) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_key)
select role.id, permission.key
from public.roles role
cross join (values ('tasks.items.edit-own'), ('tasks.items.edit-any')) as permission(key)
where role.name = 'Owner'
on conflict do nothing;

commit;
