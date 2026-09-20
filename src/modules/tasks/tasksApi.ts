import { supabase } from '../../core/auth/supabase'
import type { TaskCategory, TaskItem, TaskNotificationTarget, TaskNotificationTargetOption, TaskPriority, TaskSettings, TasksDashboardReport } from './types'

type TaskRow = {
  id: string
  title: string
  category_id: string | null
  priority: TaskPriority | null
  due_date: string | null
  due_at: string | null
  completed_at: string | null
  created_by: string
  task_notification_targets: { target_type: TaskNotificationTarget['type']; membership_id: string | null; group_id: string | null }[]
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function mapTask(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    priority: row.priority,
    dueDate: row.due_date,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    notificationTarget: row.task_notification_targets[0] ? { type: row.task_notification_targets[0].target_type, membershipId: row.task_notification_targets[0].membership_id, groupId: row.task_notification_targets[0].group_id } : null,
  }
}

export async function loadTasks(workspaceId: string, archived = false): Promise<TaskItem[]> {
  const client = requireSupabase()
  let query = client
    .from('task_items')
    .select('id, title, category_id, priority, due_date, due_at, completed_at, created_by, task_notification_targets(target_type, membership_id, group_id)')
    .eq('workspace_id', workspaceId)
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('due_at', { ascending: true, nullsFirst: false })

  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  const { data, error } = await query

  if (error) throw error
  return (data as TaskRow[]).map(mapTask)
}

export async function loadCategories(workspaceId: string): Promise<TaskCategory[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('task_categories')
    .select('id, name, archived')
    .eq('workspace_id', workspaceId)
    .order('name')

  if (error) throw error
  return (data as TaskCategory[])
}

export async function loadTaskSettings(workspaceId: string): Promise<TaskSettings | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('task_settings')
    .select('default_category_id, default_priority')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return { defaultCategoryId: data.default_category_id, defaultPriority: data.default_priority }
}

export async function createTask(workspaceId: string, title: string, categoryId: string | null, priority: TaskPriority | null, dueDate: string | null, dueAt: string | null, notificationTarget: TaskNotificationTarget | null) {
  const client = requireSupabase()
  const { error } = await client.rpc('tasks_create_item', {
    target_workspace_id: workspaceId,
    task_title: title,
    selected_category_id: categoryId,
    selected_priority: priority,
    task_due_date: dueDate,
    task_due_at: dueAt,
    notification_target_type: notificationTarget?.type ?? null,
    notification_membership_id: notificationTarget?.membershipId ?? null,
    notification_group_id: notificationTarget?.groupId ?? null,
  })
  if (error) throw error
}

export async function setTaskCompleted(workspaceId: string, taskId: string, completed: boolean) {
  const client = requireSupabase()
  const { error } = await client.rpc('tasks_set_item_completed', {
    target_workspace_id: workspaceId,
    target_item_id: taskId,
    is_completed: completed,
  })
  if (error) throw error
}

export async function archiveTask(workspaceId: string, taskId: string) {
  const client = requireSupabase()
  const { error } = await client.rpc('tasks_archive_item', {
    target_workspace_id: workspaceId,
    target_item_id: taskId,
  })
  if (error) throw error
}

export async function deleteTask(workspaceId: string, taskId: string) {
  const client = requireSupabase()
  const { error } = await client.rpc('tasks_delete_item', {
    target_workspace_id: workspaceId,
    target_item_id: taskId,
  })
  if (error) throw error
}

export async function updateTask(workspaceId: string, taskId: string, title: string, categoryId: string | null, priority: TaskPriority | null, dueDate: string | null, dueAt: string | null, notificationTarget: TaskNotificationTarget | null) {
  const client = requireSupabase()
  const { error } = await client.rpc('tasks_update_item', {
    target_workspace_id: workspaceId,
    target_item_id: taskId,
    task_title: title,
    selected_category_id: categoryId,
    selected_priority: priority,
    task_due_date: dueDate,
    task_due_at: dueAt,
    notification_target_type: notificationTarget?.type ?? null,
    notification_membership_id: notificationTarget?.membershipId ?? null,
    notification_group_id: notificationTarget?.groupId ?? null,
  })
  if (error) throw error
}

export async function loadTaskNotificationTargetOptions(workspaceId: string): Promise<TaskNotificationTargetOption[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('tasks_list_notification_targets', { target_workspace_id: workspaceId })
  if (error) throw error
  return (data ?? []).map((target: { target_type: string; target_id: string; label: string }) => ({ type: target.target_type as TaskNotificationTargetOption['type'], id: target.target_id, label: target.label }))
}

export async function createCategory(workspaceId: string, name: string) {
  const client = requireSupabase()
  const { error } = await client.from('task_categories').insert({ workspace_id: workspaceId, name: name.trim() })
  if (error) throw error
}

export async function archiveCategory(workspaceId: string, categoryId: string) {
  const client = requireSupabase()
  const { error } = await client.from('task_categories').update({ archived: true }).eq('workspace_id', workspaceId).eq('id', categoryId)
  if (error) throw error
  const { error: settingsError } = await client.from('task_settings').update({ default_category_id: null }).eq('workspace_id', workspaceId).eq('default_category_id', categoryId)
  if (settingsError) throw settingsError
}

export async function saveTaskSettings(workspaceId: string, defaultCategoryId: string | null, defaultPriority: TaskPriority | null) {
  const client = requireSupabase()
  const { error } = await client.from('task_settings').upsert({
    workspace_id: workspaceId,
    default_category_id: defaultCategoryId,
    default_priority: defaultPriority,
  }, { onConflict: 'workspace_id' })
  if (error) throw error
}

export async function loadTasksDashboardReport(workspaceId: string): Promise<TasksDashboardReport> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('tasks_get_dashboard_report', { target_workspace_id: workspaceId }).single()
  if (error) throw error
  const report = data as { open_count: number; high_priority_count: number; medium_priority_count: number; overdue_count: number }
  return {
    openCount: report.open_count,
    highPriorityCount: report.high_priority_count,
    mediumPriorityCount: report.medium_priority_count ?? 0,
    overdueCount: report.overdue_count,
  }
}

export async function loadTasksDashboardSignal(workspaceId: string) {
  const report = await loadTasksDashboardReport(workspaceId)
  return tasksDashboardSignal(report)
}

export function tasksDashboardSignal(report: TasksDashboardReport) {
  return {
    itemCount: report.highPriorityCount,
    severity: report.highPriorityCount > 0 ? 'high' as const : 'none' as const,
  }
}
