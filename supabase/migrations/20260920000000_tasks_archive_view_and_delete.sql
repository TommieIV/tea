create function public.tasks_delete_item(target_workspace_id uuid, target_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.delete') then
    raise exception 'You do not have permission to delete tasks in this workspace.' using errcode = '42501';
  end if;

  delete from public.task_items
  where id = target_item_id
    and workspace_id = target_workspace_id;

  if not found then
    raise exception 'The task was not found in this workspace.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.tasks_delete_item(uuid, uuid) from public;
grant execute on function public.tasks_delete_item(uuid, uuid) to authenticated;

insert into public.permissions (key, description)
values ('tasks.items.delete', 'Permanently delete tasks in a workspace.')
on conflict (key) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_key)
select role.id, 'tasks.items.delete'
from public.roles role
where role.name = 'Owner'
on conflict do nothing;
