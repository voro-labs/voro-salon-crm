"use client"

import type { MessageReactionDto } from "@/types/DTOs/message-reaction.interface"
import { cn } from "@/lib/utils"

interface MessageReactionsProps {
  reactions?: MessageReactionDto[]
  isFromMe: boolean
}

export function MessageReactions({ reactions, isFromMe }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null

  // Group reactions by emoji
  const groupedReactions = reactions.reduce(
    (acc, reaction) => {
      const emoji = reaction.emoji || "👍"
      acc[emoji] = (acc[emoji] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", isFromMe ? "justify-end" : "justify-start")}>
      {Object.entries(groupedReactions).map(([emoji, count]) => (
        <div
          key={emoji}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/80 backdrop-blur-sm rounded-full text-xs border border-border"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </div>
      ))}
    </div>
  )
}
