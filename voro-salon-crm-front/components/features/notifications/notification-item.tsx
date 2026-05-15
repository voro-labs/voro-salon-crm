"use client"

import { CheckSquare, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { type UserNotification } from "@/hooks/use-user-notifications.hook"
import { getNotificationIcon, getRelativeTime } from "./notification-utils"

interface NotificationItemProps {
  item: UserNotification
  selectionMode: boolean
  selected: boolean
  onPress: (item: UserNotification) => void
  onLongPress: (item: UserNotification) => void
}

export function NotificationItem({
  item,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: NotificationItemProps) {
  const Icon = getNotificationIcon(item.type)

  return (
    <button
      onClick={() => onPress(item)}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(item) }}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        !item.isRead && !selectionMode && "bg-blue-50/60 dark:bg-blue-950/20",
        selected && "bg-primary/10 dark:bg-primary/10",
      )}
    >
      {selectionMode && (
        <div className="shrink-0 mt-1">
          {selected
            ? <CheckSquare size={18} className="text-primary" />
            : <Square size={18} className="text-zinc-400" />}
        </div>
      )}

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

      {!item.isRead && !selectionMode && <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
    </button>
  )
}
