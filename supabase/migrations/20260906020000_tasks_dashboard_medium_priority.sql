drop function if exists public.tasks_get_dashboard_report(uuid);

create function public.tasks_get_dashboard_report(target_workspace_id uuid)
returns table (open_count integer, high_priority_count integer, medium_priority_count integer, overdue_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where task.completed_at is null)::integer,
    count(*) filter (where task.completed_at is null and task.priority = 'high')::integer,
    count(*) filter (where task.completed_at is null and task.priority = 'medium')::integer,
    count(*) filter (where task.completed_at is null and task.due_date < current_date)::integer
  from public.task_items task
  where task.workspace_id = target_workspace_id
    and task.archived_at is null
    and private.has_workspace_permission(target_workspace_id, 'tasks.items.view');
$$;

revoke all on function public.tasks_get_dashboard_report(uuid) from public;
grant execute on function public.tasks_get_dashboard_report(uuid) to authenticated;
