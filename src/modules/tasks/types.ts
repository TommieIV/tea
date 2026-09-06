export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskCategory = {
  id: string
  name: string
  archived: boolean
}

export type TaskItem = {
  id: string
  title: string
  categoryId: string | null
  priority: TaskPriority | null
  dueDate: string | null
  completedAt: string | null
}

export type TaskSettings = {
  defaultCategoryId: string | null
  defaultPriority: TaskPriority | null
}

export type TasksDashboardReport = {
  openCount: number
  highPriorityCount: number
  mediumPriorityCount: number
  overdueCount: number
}
