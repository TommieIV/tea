import { supabase } from '../auth/supabase'

function requirePushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Push notifications are not supported by this browser.')
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function publicKeyBytes(value: string) {
  const base64 = `${value.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat((4 - value.length % 4) % 4)}`
  const binary = window.atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function pushPermission() {
  return 'Notification' in window ? Notification.permission : 'denied'
}

export async function enablePushNotifications() {
  const client = requirePushSupport()
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error('Push notifications have not been configured yet.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKeyBytes(publicKey) })
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('The browser did not return a complete push subscription.')

  const { error } = await client.rpc('save_my_push_subscription', { subscription_endpoint: json.endpoint, subscription_p256dh: json.keys.p256dh, subscription_auth: json.keys.auth })
  if (error) throw error
}

export async function disablePushNotifications() {
  const client = requirePushSupport()
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  const { error } = await client.rpc('delete_my_push_subscription', { subscription_endpoint: subscription.endpoint })
  if (error) throw error
  await subscription.unsubscribe()
}

export async function sendPushTest() {
  const client = requirePushSupport()
  const { error } = await client.functions.invoke('send-push-test')
  if (error) throw error
}
