"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth.context"
import { useBrowserNotifications } from "@/contexts/browser-notifications.context"
import { useUserNotifications } from "@/hooks/use-user-notifications.hook"

export function WebPushManager() {
  const { user } = useAuth()
  const { requestPermission, notify, isSupported } = useBrowserNotifications()
  const prevCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (user) {
      requestPermission()
    } else {
      prevCountRef.current = null
    }
  }, [user, requestPermission])

  // único poller de notificações do app: este componente fica montado no layout
  // raiz, e as demais telas (sidebar, /notifications) consomem o mesmo cache
  const { unreadCount } = useUserNotifications({ poll: true })

  useEffect(() => {
    if (!isSupported() || !user) return

    if (prevCountRef.current === null) {
      prevCountRef.current = unreadCount
      return
    }

    if (unreadCount > prevCountRef.current) {
      const diff = unreadCount - prevCountRef.current
      notify(diff === 1 ? "Nova notificação" : `${diff} novas notificações`, {
        body: "Toque para ver no Voro Salon CRM",
        tag: "new-notification",
      })
    }

    prevCountRef.current = unreadCount
  }, [unreadCount, notify, isSupported, user])

  return null
}
