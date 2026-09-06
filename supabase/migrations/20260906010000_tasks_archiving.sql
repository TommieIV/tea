alter table public.task_items
add column archived_at timestamptz;

create index task_items_workspace_active_idx
on public.task_items (workspace_id, due_date)
where completed_at is null and archived_at is null;

create or replace function public.tasks_set_item_completed(target_workspace_id uuid, target_item_id uuid, is_completed boolean)
returns public.task_items
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_item public.task_items;
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.complete') then
    raise exception 'You do not have permission to complete tasks in this workspace.' using errcode = '42501';
  end if;

  update public.task_items
  set completed_at = case when is_completed then now() else null end,
      updated_at = now()
  where id = target_item_id
    and workspace_id = target_workspace_id
    and archived_at is null
  returning * into updated_item;

  if updated_item.id is null then
    raise exception 'The active task was not found in this workspace.' using errcode = 'P0002';
  end if;

  return updated_item;
end;
$$;

create function public.tasks_archive_item(target_workspace_id uuid, target_item_id uuid)
returns public.task_items
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_item public.task_items;
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.archive') then
    raise exception 'You do not have permission to archive tasks in this workspace.' using errcode = '42501';
  end if;

  update public.task_items
  set archived_at = now(),
      updated_at = now()
  where id = target_item_id
    and workspace_id = target_workspace_id
    and completed_at is not null
    and archived_at is null
  returning * into archived_item;

  if archived_item.id is null then
    raise exception 'Only completed active tasks can be archived.' using errcode = 'P0002';
  end if;

  return archived_item;
end;
$$;

create or replace function public.tasks_get_dashboard_report(target_workspace_id uuid)
returns table (open_count integer, high_priority_count integer, overdue_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where task.completed_at is null)::integer,
    count(*) filter (where task.completed_at is null and task.priority = 'high')::integer,
    count(*) filter (where task.completed_at is null and task.due_date < current_date)::integer
  from public.task_items task
  where task.workspace_id = target_workspace_id
    and task.archived_at is null
    and private.has_workspace_permission(target_workspace_id, 'tasks.items.view');
$$;

revoke all on function public.tasks_archive_item(uuid, uuid) from public;
grant execute on function public.tasks_archive_item(uuid, uuid) to authenticated;

insert into public.permissions (key, description)
values ('tasks.items.archive', 'Archive completed tasks in a workspace.')
on conflict (key) do update set description = excluded.description;
