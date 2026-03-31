import useSWR, { mutate as globalMutate } from "swr"
import { useCallback } from "react"
import { API_CONFIG, secureApiCall } from "lib/api"
import { fetcher } from "lib/fetcher"

export interface UserNotification {
  id: string
  title: string
  body: string
  type: string
  relatedEntityId: string | null
  isRead: boolean
  createdAt: string
}

export function useUserNotifications() {
  const {
    data: notifications,
    isLoading,
    mutate: mutateNotifications,
  } = useSWR<UserNotification[]>(API_CONFIG.ENDPOINTS.NOTIFICATIONS, fetcher, {
    shouldRetryOnError: false,
    refreshInterval: 30000,
  })

  const { data: unreadCountData, mutate: mutateUnreadCount } = useSWR<{ count: number } | number>(
    API_CONFIG.ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT,
    fetcher,
    {
      shouldRetryOnError: false,
      refreshInterval: 30000,
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
          // Atualiza a lista local sem re-fetch
          mutateNotifications(
            (prev) =>
              prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
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
        mutateUnreadCount((prev: any) =>
          typeof prev === "number" ? 0 : { ...prev, count: 0 },
          false,
        )
      }
    } catch (err) {
      console.error("Erro ao marcar todas as notificações como lidas:", err)
    }
  }, [mutateNotifications, mutateUnreadCount])

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        const result = await secureApiCall(API_CONFIG.ENDPOINTS.NOTIFICATIONS, {
          method: "DELETE",
          body: JSON.stringify([id]),
        })
        if (!result.hasError) {
          mutateNotifications((prev) => prev?.filter((n) => n.id !== id), false)
          mutateUnreadCount()
        }
      } catch (err) {
        console.error("Erro ao deletar notificação:", err)
      }
    },
    [mutateNotifications, mutateUnreadCount],
  )

  const deleteAllNotifications = useCallback(async () => {
    try {
      const result = await secureApiCall(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/delete-all`, {
        method: "DELETE",
      })
      if (!result.hasError) {
        mutateNotifications([], false)
        mutateUnreadCount((prev: any) =>
          typeof prev === "number" ? 0 : { ...prev, count: 0 },
          false,
        )
      }
    } catch (err) {
      console.error("Erro ao deletar todas as notificações:", err)
    }
  }, [mutateNotifications, mutateUnreadCount])

  const deleteMultipleNotifications = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
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
        console.error("Erro ao deletar notificações:", err)
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
    deleteNotification,
    deleteMultipleNotifications,
    deleteAllNotifications,
    isLoading,
    refresh,
  }
}
