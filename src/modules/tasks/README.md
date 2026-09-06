# Tasks Module

Tasks is TEA's first real, reusable module. It supports Personal, Household, and Business workspaces.

## v0.1 Scope

- Create a task with an optional category, priority, and due date.
- Complete or reopen a task, then archive a completed task without deleting it.
- Manage workspace-scoped categories and default category/priority settings.
- Report open, high-priority, medium-priority, and overdue task counts to the Dashboard. The module also supplies the Dashboard's item count and highest-priority signal.

When a task leaves category or priority blank, the server resolves that field from the workspace defaults. Existing tasks retain their resolved values if defaults later change.

## Permissions

- `tasks.items.view`
- `tasks.items.create`
- `tasks.items.complete`
- `tasks.items.archive`
- `tasks.settings.manage`

## Hosted setup

Apply `supabase/migrations/20260906000000_tasks_module.sql`, then run `supabase/bootstrap/enable-tasks-for-workspace.sql` in the SQL Editor after replacing `target_workspace_id`. The enablement script grants all current Tasks permissions to the workspace's `Owner` role and enables the module only for that workspace.
