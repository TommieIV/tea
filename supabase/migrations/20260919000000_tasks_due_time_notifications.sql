alter table public.task_items
add column due_at timestamptz;

alter table public.task_items
add constraint task_items_due_at_requires_date
check (due_at is null or due_date is not null);

create index task_items_due_at_open_idx
on public.task_items (due_at)
where completed_at is null and archived_at is null and due_at is not null;

drop function public.tasks_create_item(uuid, text, uuid, public.task_priority, date);

create function public.tasks_create_item(
  target_workspace_id uuid,
  task_title text,
  selected_category_id uuid default null,
  selected_priority public.task_priority default null,
  task_due_date date default null,
  task_due_at timestamptz default null
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

  if task_due_at is not null and task_due_date is null then
    raise exception 'A due time requires a due date.' using errcode = '22023';
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

  insert into public.task_items (workspace_id, title, category_id, priority, due_date, due_at, created_by)
  values (target_workspace_id, btrim(task_title), resolved_category_id, resolved_priority, task_due_date, task_due_at, (select auth.uid()))
  returning * into created_item;

  return created_item;
end;
$$;

revoke all on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz) from public;
grant execute on function public.tasks_create_item(uuid, text, uuid, public.task_priority, date, timestamptz) to authenticated;

create type public.task_push_notification_kind as enum ('created', 'due');

create table public.task_push_notifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.task_push_notification_kind not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, user_id, kind)
);

create index task_push_notifications_pending_idx
on public.task_push_notifications (scheduled_for)
where sent_at is null;

alter table public.task_push_notifications enable row level security;
revoke all on public.task_push_notifications from anon, authenticated;

create function private.queue_task_push_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_push_notifications (task_id, user_id, kind, scheduled_for)
  values (new.id, new.created_by, 'created', now())
  on conflict (task_id, user_id, kind) do nothing;

  if new.due_at is not null then
    insert into public.task_push_notifications (task_id, user_id, kind, scheduled_for)
    values (new.id, new.created_by, 'due', new.due_at)
    on conflict (task_id, user_id, kind) do nothing;
  end if;

  return new;
end;
$$;

create trigger queue_task_push_notifications_after_insert
after insert on public.task_items
for each row execute function private.queue_task_push_notifications();

revoke all on function private.queue_task_push_notifications() from public;
