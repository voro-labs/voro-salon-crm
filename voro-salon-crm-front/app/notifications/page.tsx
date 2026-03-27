"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, BellOff, Calendar, Wallet, Users, Info } from "lucide-react"
import { useUserNotifications, type UserNotification } from "@/hooks/use-user-notifications.hook"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth.context"

function getNotificationIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "appointment":
    case "appointment_created":
    case "new_appointment":
    case "status_changed_confirmed":
    case "status_changed_cancelled":
    case "status_changed_completed":
      return Calendar
    case "payment":
    case "finance":
      return Wallet
    case "client":
      return Users
    case "system":
      return Info
    default:
      return Bell
  }
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "agora"
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffHour < 24) return `há ${diffHour}h`
  if (diffDay === 1) return "ontem"
  if (diffDay < 7) return `há ${diffDay} dias`
  return new Date(dateStr).toLocaleDateString("pt-BR")
}

function NotificationItem({
  item,
  onPress,
}: {
  item: UserNotification
  onPress: (item: UserNotification) => void
}) {
  const Icon = getNotificationIcon(item.type)

  return (
    <button
      onClick={() => onPress(item)}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        !item.isRead && "bg-blue-50/60 dark:bg-blue-950/20",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0",
          item.isRead ? "bg-zinc-100 dark:bg-zinc-800" : "bg-primary/10",
        )}
      >
        <Icon size={20} className={item.isRead ? "text-zinc-400" : "text-primary"} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm mb-0.5 truncate",
            item.isRead
              ? "font-medium text-zinc-700 dark:text-zinc-300"
              : "font-bold text-zinc-900 dark:text-zinc-100",
          )}
        >
          {item.title}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
          {item.body}
        </p>
        <p className="text-[10px] text-zinc-400 mt-1 font-medium">{getRelativeTime(item.createdAt)}</p>
      </div>

      {!item.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
    </button>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
    useUserNotifications()

  useEffect(() => {
    if (!loading && !user?.token) {
      router.replace("/admin/sign-in?redirect=/notifications")
    }
  }, [loading, user, router])

  if (loading || !user?.token) return null

  const handleItemPress = useCallback(
    async (item: UserNotification) => {
      if (!item.isRead) await markAsRead(item.id)
      if (item.relatedEntityId && item.type?.toLowerCase().includes("appointment")) {
        router.push(`/appointments/${item.relatedEntityId}`)
      }
    },
    [markAsRead, router],
  )

  return (
    <div className="flex flex-col h-full w-full mx-auto">
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Notificações</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary font-semibold">
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <BellOff size={48} className="text-zinc-200 dark:text-zinc-700 mb-3" />
          <p className="text-zinc-500 font-semibold text-base">Nenhuma notificação ainda</p>
          <p className="text-zinc-400 dark:text-zinc-600 text-sm mt-1 max-w-xs">
            Você verá aqui suas notificações quando chegarem
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {notifications.map((item) => (
            <NotificationItem key={item.id} item={item} onPress={handleItemPress} />
          ))}
          <div className="h-6" />
        </div>
      )}
    </div>
  )
}
