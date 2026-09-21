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
  dueAt: string | null
  completedAt: string | null
  createdBy: string
  notificationTarget: TaskNotificationTarget | null
  notifyCreatorOnCompletion: boolean
}

export type TaskNotificationTarget = {
  type: 'everyone' | 'member' | 'group'
  membershipId: string | null
  groupId: string | null
}

export type TaskNotificationTargetOption = {
  type: 'member' | 'group'
  id: string
  label: string
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
