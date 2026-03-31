import { useState, useEffect } from 'react'
import axios from 'axios'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
const API_URL = import.meta.env.VITE_API_URL || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'default' | 'loading'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    setStatus(Notification.permission as PushStatus)
    navigator.serviceWorker.register('/sw.js').catch(console.warn)
  }, [])

  const subscribe = async (games: string[] = ['powerball', 'mega-millions']) => {
    if (!('serviceWorker' in navigator)) return false
    setStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return false
      }
      const reg = await navigator.serviceWorker.ready
      if (!VAPID_PUBLIC_KEY) {
        setStatus('granted')
        return true
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await axios.post(`${API_URL}/api/v1/notifications/push/subscribe`, {
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
        },
        games,
      })
      setSubscription(sub)
      setStatus('granted')
      return true
    } catch (e) {
      console.error('Push subscribe failed:', e)
      setStatus('default')
      return false
    }
  }

  const unsubscribe = async () => {
    if (subscription) {
      await subscription.unsubscribe()
      setSubscription(null)
      setStatus('default')
    }
  }

  return { status, subscription, subscribe, unsubscribe }
}
