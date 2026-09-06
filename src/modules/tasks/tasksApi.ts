import { supabase } from '../../core/auth/supabase'
import type { TaskCategory, TaskItem, TaskPriority, TaskSettings, TasksDashboardReport } from './types'

type TaskRow = {
  id: string
  title: string
  category_id: string | null
  priority: TaskPriority | null
  due_date: string | null
  completed_at: string | null
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
    completedAt: row.completed_at,
  }
}

export async function loadTasks(workspaceId: string): Promise<TaskItem[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('task_items')
    .select('id, title, category_id, priority, due_date, completed_at')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('due_date', { ascending: true, nullsFirst: false })

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

export async function createTask(workspaceId: string, title: string, categoryId: string | null, priority: TaskPriority | null, dueDate: string | null) {
  const client = requireSupabase()
  const { error } = await client.rpc('tasks_create_item', {
    target_workspace_id: workspaceId,
    task_title: title,
    selected_category_id: categoryId,
    selected_priority: priority,
    task_due_date: dueDate,
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
  const report = data as { open_count: number; high_priority_count: number; overdue_count: number }
  return {
    openCount: report.open_count,
    highPriorityCount: report.high_priority_count,
    overdueCount: report.overdue_count,
  }
}
