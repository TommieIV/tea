# Tasks Module

Tasks is TEA's first real, reusable module. It supports Personal, Household, and Business workspaces.

## v0.1 Scope

- Create a task with an optional category, priority, due date, and due time.
- Complete or reopen a task, then archive a completed task without deleting it. Archived tasks remain available in the archived view; members with `tasks.items.delete` can permanently delete a task after a confirmation.
- Edit a task by tapping it. Members with `tasks.items.edit-own` can edit tasks they created; `tasks.items.edit-any` permits editing every task in the workspace.
- Manage workspace-scoped categories and default category/priority settings.
- Report open, high-priority, medium-priority, and overdue task counts to the Dashboard. Only high-priority open tasks contribute to the shared Dashboard badge and attention glow.

When a task leaves category or priority blank, the server resolves that field from the workspace defaults. Existing tasks retain their resolved values if defaults later change.

Creating a task queues one notification for its creator. If a due time is set, it also queues one due notification for that creator. Delivery is handled by the shared push service and does not require TEA to be open. Tasks without a due time do not send a due notification.

## Permissions

- `tasks.items.view`
- `tasks.items.create`
- `tasks.items.complete`
- `tasks.items.archive`
- `tasks.items.delete`
- `tasks.items.edit-own`
- `tasks.items.edit-any`
- `tasks.settings.manage`

## Hosted setup

Apply `supabase/migrations/20260906000000_tasks_module.sql`, then run `supabase/bootstrap/enable-tasks-for-workspace.sql` in the SQL Editor after replacing `target_workspace_id`. The enablement script grants all current Tasks permissions to the workspace's `Owner` role and enables the module only for that workspace.
