import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useWorkspace } from '../../core/workspaces/useWorkspace'
import { archiveTask, createTask, loadCategories, loadTaskSettings, loadTasks, setTaskCompleted } from './tasksApi'
import type { TaskCategory, TaskItem, TaskPriority, TaskSettings } from './types'

const priorities: TaskPriority[] = ['low', 'medium', 'high']

function formatDueDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export default function TasksModulePage() {
  const { activeWorkspace } = useWorkspace()
  const canCreate = activeWorkspace?.permissionKeys.includes('tasks.items.create') ?? false
  const canComplete = activeWorkspace?.permissionKeys.includes('tasks.items.complete') ?? false
  const canArchive = activeWorkspace?.permissionKeys.includes('tasks.items.archive') ?? false
  const canManageSettings = activeWorkspace?.permissionKeys.includes('tasks.settings.manage') ?? false
  const [items, setItems] = useState<TaskItem[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [settings, setSettings] = useState<TaskSettings | null>(null)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!activeWorkspace) return
    const [nextItems, nextCategories, nextSettings] = await Promise.all([
      loadTasks(activeWorkspace.workspaceId),
      loadCategories(activeWorkspace.workspaceId),
      canCreate ? loadTaskSettings(activeWorkspace.workspaceId) : Promise.resolve(null),
    ])
    setItems(nextItems)
    setCategories(nextCategories.filter((category) => !category.archived))
    setSettings(nextSettings)
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    void refresh().catch(() => setError('Tasks could not be loaded. Check that the Tasks migration has been applied and the module is enabled.')).finally(() => setLoading(false))
  // The active workspace and permission set determine every module query.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.workspaceId, canCreate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeWorkspace || !canCreate) return
    setSubmitting(true)
    setError(null)
    try {
      await createTask(activeWorkspace.workspaceId, title, categoryId || null, (priority || null) as TaskPriority | null, dueDate || null)
      setTitle('')
      setCategoryId('')
      setPriority('')
      setDueDate('')
      await refresh()
    } catch {
      setError('The task could not be saved. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCompletion(item: TaskItem) {
    if (!activeWorkspace || !canComplete) return
    setError(null)
    try {
      await setTaskCompleted(activeWorkspace.workspaceId, item.id, !item.completedAt)
      await refresh()
    } catch {
      setError('The task status could not be updated. Please try again.')
    }
  }

  async function handleArchive(item: TaskItem) {
    if (!activeWorkspace || !canArchive) return
    setError(null)
    try {
      await archiveTask(activeWorkspace.workspaceId, item.id)
      await refresh()
    } catch {
      setError('The completed task could not be archived. Please try again.')
    }
  }

  return (
    <>
      <section className="page-heading task-heading">
        <div><div className="eyebrow">Tasks</div><h1>Keep work moving</h1><p className="lede">Tasks belong to the current workspace and stay focused on what needs attention.</p></div>
        <div className="task-actions"><Link className="button button-secondary" to="/dashboard">Back to Dashboard</Link>{canManageSettings && <Link className="button button-secondary" to="/modules/tasks/settings">Task settings</Link>}</div>
      </section>

      {canCreate && <>
        <button className="button button-secondary task-composer-toggle" type="button" aria-expanded={isComposerOpen} onClick={() => setIsComposerOpen((open) => !open)}><Plus size={18} aria-hidden />{isComposerOpen ? 'Close new task' : 'New task'}</button>
        {isComposerOpen && <form className="task-form" onSubmit={handleSubmit}>
        <label className="field task-title-field">Task<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={500} placeholder="What needs to be done?" required /></label>
        <label className="field">Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Use default{settings?.defaultCategoryId ? ` (${categories.find((category) => category.id === settings.defaultCategoryId)?.name ?? 'none'})` : ''}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="field">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Use default{settings?.defaultPriority ? ` (${settings.defaultPriority})` : ''}</option>{priorities.map((itemPriority) => <option key={itemPriority} value={itemPriority}>{itemPriority}</option>)}</select></label>
        <label className="field">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        <button className="button button-primary task-submit" type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add task'}</button>
        </form>}
      </>}

      {error && <p className="notice error" role="alert">{error}</p>}
      {loading ? <div className="page-loading">Loading tasks…</div> : (
        <section className="task-list" aria-label="Tasks">
          {items.length === 0 ? <div className="empty-state">No tasks yet. Add one to get started.</div> : items.map((item) => {
            const category = categories.find((candidate) => candidate.id === item.categoryId)
            return <article className={`task-item${item.completedAt ? ' completed' : ''}`} key={item.id}>
              <input aria-label={`Mark ${item.title} ${item.completedAt ? 'open' : 'complete'}`} checked={Boolean(item.completedAt)} disabled={!canComplete} onChange={() => void handleCompletion(item)} type="checkbox" />
              <div className="task-item-copy"><h2>{item.title}</h2><div className="task-meta">{category && <span>{category.name}</span>}{item.priority && <span className={`priority priority-${item.priority}`}>{item.priority}</span>}{formatDueDate(item.dueDate) && <span>Due {formatDueDate(item.dueDate)}</span>}</div></div>
              {item.completedAt && canArchive && <button className="button button-quiet task-archive" type="button" onClick={() => void handleArchive(item)}>Archive</button>}
            </article>
          })}
        </section>
      )}
    </>
  )
}
