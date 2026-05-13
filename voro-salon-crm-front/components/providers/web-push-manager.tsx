"use client"

import { useEffect, useRef } from "react"
import useSWR from "swr"
import { useAuth } from "@/contexts/auth.context"
import { useBrowserNotifications } from "@/contexts/browser-notifications.context"
import { API_CONFIG } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"

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

  const { data: unreadCountData } = useSWR<{ count: number } | number>(
    user ? API_CONFIG.ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT : null,
    fetcher,
    { refreshInterval: 30000, shouldRetryOnError: false },
  )

  const unreadCount =
    typeof unreadCountData === "number"
      ? unreadCountData
      : (unreadCountData as any)?.count ?? 0

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
