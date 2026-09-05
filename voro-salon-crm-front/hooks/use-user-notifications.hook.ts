"use client"

import useSWR from "swr"
import { useCallback } from "react"
import { API_CONFIG, secureApiCall } from "@/lib/api"
import { useAuth } from "@/contexts/auth.context"
import { fetcher } from "@/lib/fetcher"

export interface UserNotification {
  id: string
  title: string
  body: string
  type: string
  relatedEntityId: string | null
  isRead: boolean
  createdAt: string
}

const POLL_INTERVAL_MS = 30000

interface UseUserNotificationsOptions {
  /**
   * Liga o polling desta instância. Só quem está montado o tempo todo precisa
   * disso — hoje o `WebPushManager`, no layout raiz. As demais telas leem do
   * mesmo cache do SWR, atualizado por esse único poller, em vez de abrirem um
   * intervalo próprio para as mesmas duas chaves.
   */
  poll?: boolean
}

export function useUserNotifications({ poll = false }: UseUserNotificationsOptions = {}) {
  const { user } = useAuth()

  // sem usuário não há o que buscar: com a chave nula o SWR não requisita nada,
  // o que evita 401 em loop nas telas públicas (landing, agendamento)
  const notificationsKey = user ? API_CONFIG.ENDPOINTS.NOTIFICATIONS : null
  const unreadCountKey = user ? API_CONFIG.ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT : null
  const refreshInterval = poll ? POLL_INTERVAL_MS : 0

  const {
    data: notifications,
    isLoading,
    mutate: mutateNotifications,
  } = useSWR<UserNotification[]>(notificationsKey, fetcher, {
    shouldRetryOnError: false,
    refreshInterval,
  })

  const { data: unreadCountData, mutate: mutateUnreadCount } = useSWR<{ count: number } | number>(
    unreadCountKey,
    fetcher,
    {
      shouldRetryOnError: false,
      refreshInterval,
    },
  )

  const unreadCount =
    typeof unreadCountData === "number"
      ? unreadCountData
      : (unreadCountData as any)?.count ?? 0

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const result = await secureApiCall(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${id}/read`, {
          method: "PATCH",
        })
        if (!result.hasError) {
          mutateNotifications(
            (prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
            false,
          )
          mutateUnreadCount()
        }
      } catch (err) {
        console.error("Erro ao marcar notificação como lida:", err)
      }
    },
    [mutateNotifications, mutateUnreadCount],
  )

  const markAllAsRead = useCallback(async () => {
    try {
      const result = await secureApiCall(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/read-all`, {
        method: "PATCH",
      })
      if (!result.hasError) {
        mutateNotifications(
          (prev) => prev?.map((n) => ({ ...n, isRead: true })),
          false,
        )
        mutateUnreadCount(() => 0, false)
      }
    } catch (err) {
      console.error("Erro ao marcar todas as notificações como lidas:", err)
    }
  }, [mutateNotifications, mutateUnreadCount])

  const deleteMany = useCallback(
    async (ids: string[]) => {
      try {
        const result = await secureApiCall(API_CONFIG.ENDPOINTS.NOTIFICATIONS, {
          method: "DELETE",
          body: JSON.stringify(ids),
        })
        if (!result.hasError) {
          mutateNotifications((prev) => prev?.filter((n) => !ids.includes(n.id)), false)
          mutateUnreadCount()
        }
      } catch (err) {
        console.error("Erro ao excluir notificações:", err)
      }
    },
    [mutateNotifications, mutateUnreadCount],
  )

  const refresh = useCallback(async () => {
    await Promise.all([mutateNotifications(), mutateUnreadCount()])
  }, [mutateNotifications, mutateUnreadCount])

  return {
    notifications: notifications ?? [],
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteMany,
    isLoading,
    refresh,
  }
}
