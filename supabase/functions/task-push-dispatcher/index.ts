import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type PendingNotification = {
  id: string
  task_id: string
  user_id: string
  kind: 'created' | 'due'
  task_items: { title: string; completed_at: string | null; archived_at: string | null } | null
}

function requireSecret(request: Request) {
  const configuredSecret = Deno.env.get('TASK_PUSH_CRON_SECRET')
  if (!configuredSecret || request.headers.get('x-tea-cron-secret') !== configuredSecret) throw new Error('Unauthorized.')
}

function notificationFor(item: PendingNotification) {
  const title = item.kind === 'due' ? 'Task due' : 'Task created'
  const body = item.kind === 'due' ? `"${item.task_items?.title ?? 'A task'}" is due now.` : `"${item.task_items?.title ?? 'A task'}" was added to your tasks.`
  return JSON.stringify({ title, body, url: '/modules/tasks', tag: `tea-task-${item.task_id}-${item.kind}` })
}

Deno.serve(async (request) => {
  try {
    requireSecret(request)
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT')
    if (!publicKey || !privateKey || !subject) throw new Error('Push notifications have not been configured on the server.')
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const admin = createClient(url, serviceRoleKey)
    const { data, error } = await admin
      .from('task_push_notifications')
      .select('id, task_id, user_id, kind, task_items!inner(title, completed_at, archived_at)')
      .is('sent_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .limit(100)
    if (error) throw error

    let sent = 0
    for (const item of (data ?? []) as PendingNotification[]) {
      const isInactiveDueTask = item.kind === 'due' && (!item.task_items || item.task_items.completed_at !== null || item.task_items.archived_at !== null)
      if (isInactiveDueTask) {
        const { error: dismissError } = await admin.from('task_push_notifications').update({ sent_at: new Date().toISOString() }).eq('id', item.id)
        if (dismissError) throw dismissError
        continue
      }

      const { data: subscriptions, error: subscriptionsError } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', item.user_id)
      if (subscriptionsError) throw subscriptionsError

      try {
        await Promise.all((subscriptions ?? []).map(async (subscription) => {
          try {
            await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, notificationFor(item))
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode
            if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id)
            else throw error
          }
        }))
        const { error: markSentError } = await admin.from('task_push_notifications').update({ sent_at: new Date().toISOString() }).eq('id', item.id)
        if (markSentError) throw markSentError
        sent += 1
      } catch (error) {
        console.error(`Task push ${item.id} failed. It will be retried.`, error)
      }
    }

    return Response.json({ ok: true, sent })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Task push dispatch failed.' }, { status: 401 })
  }
})
