create type public.task_priority as enum ('low', 'medium', 'high');

create table public.task_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, id)
);

create table public.task_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  default_category_id uuid,
  default_priority public.task_priority,
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, default_category_id)
    references public.task_categories (workspace_id, id)
    on delete set null (default_category_id)
);

create table public.task_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  category_id uuid,
  priority public.task_priority,
  due_date date,
  completed_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, category_id)
    references public.task_categories (workspace_id, id)
    on delete set null
);

create index task_categories_workspace_idx on public.task_categories (workspace_id) where not archived;
create index task_items_workspace_open_idx on public.task_items (workspace_id, due_date) where completed_at is null;

alter table public.task_categories enable row level security;
alter table public.task_settings enable row level security;
alter table public.task_items enable row level security;

revoke all on public.task_categories, public.task_settings, public.task_items from anon, authenticated;
grant select, insert, update on public.task_categories, public.task_settings to authenticated;
grant select on public.task_items to authenticated;

create function private.has_workspace_permission(target_workspace_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships membership
    join public.role_permissions role_permission on role_permission.role_id = membership.role_id
    where membership.workspace_id = target_workspace_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and role_permission.permission_key = target_permission_key
  );
$$;

create policy "Task viewers can view workspace categories"
on public.task_categories for select to authenticated
using (
  private.has_workspace_permission(workspace_id, 'tasks.items.view')
  or private.has_workspace_permission(workspace_id, 'tasks.settings.manage')
);

create policy "Task settings managers can create categories"
on public.task_categories for insert to authenticated
with check (private.has_workspace_permission(workspace_id, 'tasks.settings.manage'));

create policy "Task settings managers can update categories"
on public.task_categories for update to authenticated
using (private.has_workspace_permission(workspace_id, 'tasks.settings.manage'))
with check (private.has_workspace_permission(workspace_id, 'tasks.settings.manage'));

create policy "Task creators can view workspace settings"
on public.task_settings for select to authenticated
using (
  private.has_workspace_permission(workspace_id, 'tasks.items.create')
  or private.has_workspace_permission(workspace_id, 'tasks.settings.manage')
);

create policy "Task settings managers can create settings"
on public.task_settings for insert to authenticated
with check (private.has_workspace_permission(workspace_id, 'tasks.settings.manage'));

create policy "Task settings managers can update settings"
on public.task_settings for update to authenticated
using (private.has_workspace_permission(workspace_id, 'tasks.settings.manage'))
with check (private.has_workspace_permission(workspace_id, 'tasks.settings.manage'));

create policy "Task viewers can view workspace tasks"
on public.task_items for select to authenticated
using (private.has_workspace_permission(workspace_id, 'tasks.items.view'));

create function public.tasks_create_item(
  target_workspace_id uuid,
  task_title text,
  selected_category_id uuid default null,
  selected_priority public.task_priority default null,
  task_due_date date default null
)
returns public.task_items
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_category_id uuid;
  resolved_priority public.task_priority;
  created_item public.task_items;
begin
  if not private.has_workspace_permission(target_workspace_id, 'tasks.items.create') then
    raise exception 'You do not have permission to create tasks in this workspace.' using errcode = '42501';
  end if;

  if nullif(btrim(task_title), '') is null then
    raise exception 'A task title is required.' using errcode = '22023';
  end if;

  select coalesce(selected_category_id, settings.default_category_id), coalesce(selected_priority, settings.default_priority)
  into resolved_category_id, resolved_priority
  from public.task_settings settings
  where settings.workspace_id = target_workspace_id;

  resolved_category_id := coalesce(resolved_category_id, selected_category_id);
  resolved_priority := coalesce(resolved_priority, selected_priority);

  if resolved_category_id is not null and not exists (
    select 1 from public.task_categories category
    where category.id = resolved_category_id
      and category.workspace_id = target_workspace_id
      and not category.archived
  ) then
    raise exception 'The selected task category is not available in this workspace.' using errcode = '22023';
  end if;

  insert into public.task_items (workspace_id, title, category_id, priority, due_date, created_by)
  values (target_workspace_id, btrim(task_title), resolved_category_id, resolved_priority, task_due_date, (select auth.uid()))
  returning * into created_item;

  return created_item;
end;
$$;

create function public.tasks_set_item_completed(target_workspace_id uuid, target_item_id uuid, is_completed boolean)
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
  returning * into updated_item;

  if updated_item.id is null then
    raise exception 'The task was not found in this workspace.' using errcode = 'P0002';
  end if;

  return updated_item;
end;
$$;

create function public.tasks_get_dashboard_report(target_workspace_id uuid)
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
    and private.has_workspace_permission(target_workspace_id, 'tasks.items.view');
$$;

revoke all on function private.has_workspace_permission(uuid, text) from public;
revoke all on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date) from public;
revoke all on function public.tasks_set_item_completed(uuid, uuid, boolean) from public;
revoke all on function public.tasks_get_dashboard_report(uuid) from public;
grant execute on function private.has_workspace_permission(uuid, text) to authenticated;
grant execute on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date) to authenticated;
grant execute on function public.tasks_set_item_completed(uuid, uuid, boolean) to authenticated;
grant execute on function public.tasks_get_dashboard_report(uuid) to authenticated;

insert into public.permissions (key, description)
values
  ('tasks.items.view', 'View tasks in a workspace.'),
  ('tasks.items.create', 'Create tasks in a workspace.'),
  ('tasks.items.complete', 'Complete and reopen tasks in a workspace.'),
  ('tasks.settings.manage', 'Manage task categories and defaults in a workspace.')
on conflict (key) do update set description = excluded.description;
