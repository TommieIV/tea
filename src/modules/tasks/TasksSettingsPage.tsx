import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../../core/workspaces/useWorkspace'
import { archiveCategory, createCategory, loadCategories, loadTaskSettings, saveTaskSettings } from './tasksApi'
import type { TaskCategory, TaskPriority } from './types'

const priorities: TaskPriority[] = ['low', 'medium', 'high']

export default function TasksSettingsPage() {
  const { activeWorkspace } = useWorkspace()
  const canManage = activeWorkspace?.permissionKeys.includes('tasks.settings.manage') ?? false
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const [defaultPriority, setDefaultPriority] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!activeWorkspace) return
    const [nextCategories, nextSettings] = await Promise.all([loadCategories(activeWorkspace.workspaceId), loadTaskSettings(activeWorkspace.workspaceId)])
    setCategories(nextCategories)
    setDefaultCategoryId(nextSettings?.defaultCategoryId ?? '')
    setDefaultPriority(nextSettings?.defaultPriority ?? '')
  }

  useEffect(() => {
    setLoading(true)
    void refresh().catch(() => setError('Task settings could not be loaded.')).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.workspaceId])

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeWorkspace || !canManage) return
    setError(null)
    try {
      await createCategory(activeWorkspace.workspaceId, categoryName)
      setCategoryName('')
      await refresh()
    } catch {
      setError('That category could not be added. Category names must be unique in this workspace.')
    }
  }

  async function saveDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeWorkspace || !canManage) return
    setError(null)
    try {
      await saveTaskSettings(activeWorkspace.workspaceId, defaultCategoryId || null, (defaultPriority || null) as TaskPriority | null)
    } catch {
      setError('The defaults could not be saved. Please try again.')
    }
  }

  async function archive(category: TaskCategory) {
    if (!activeWorkspace || !canManage) return
    setError(null)
    try {
      await archiveCategory(activeWorkspace.workspaceId, category.id)
      if (defaultCategoryId === category.id) setDefaultCategoryId('')
      await refresh()
    } catch {
      setError('The category could not be archived. Please try again.')
    }
  }

  if (!canManage) return <div className="empty-state">You do not have permission to manage Task settings.</div>

  const activeCategories = categories.filter((category) => !category.archived)
  return (
    <>
      <section className="page-heading task-heading"><div><div className="eyebrow">Tasks</div><h1>Task settings</h1><p className="lede">Categories and defaults apply only to this workspace.</p></div><Link className="button button-secondary" to="/modules/tasks">Back to Tasks</Link></section>
      {error && <p className="notice error" role="alert">{error}</p>}
      {loading ? <div className="page-loading">Loading task settings…</div> : <div className="settings-grid">
        <section className="settings-card"><h2>Defaults</h2><p>Used when a new task leaves category or priority blank.</p><form onSubmit={saveDefaults}><label className="field">Default category<select value={defaultCategoryId} onChange={(event) => setDefaultCategoryId(event.target.value)}><option value="">No default category</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="field">Default priority<select value={defaultPriority} onChange={(event) => setDefaultPriority(event.target.value)}><option value="">No default priority</option>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><button className="button button-primary" type="submit">Save defaults</button></form></section>
        <section className="settings-card"><h2>Categories</h2><p>Categories are available to everyone creating tasks in this workspace.</p><form className="category-form" onSubmit={addCategory}><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={80} placeholder="New category" required /><button className="button button-secondary" type="submit">Add</button></form><ul className="category-list">{activeCategories.map((category) => <li key={category.id}><span>{category.name}</span><button className="button button-quiet" type="button" onClick={() => void archive(category)}>Archive</button></li>)}</ul></section>
      </div>}
    </>
  )
}
