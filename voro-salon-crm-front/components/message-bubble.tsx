import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Bot, User } from "lucide-react"

interface MessageBubbleProps {
  message: string
  timestamp: string
  type: "sent" | "received"
  isAutomatic?: boolean
}

export function MessageBubble({ message, timestamp, type, isAutomatic }: MessageBubbleProps) {
  const isSent = type === "sent"

  return (
    <div className={cn("flex gap-3 mb-4", isSent && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isSent ? "bg-primary" : "bg-muted",
        )}
      >
        {isSent ? (
          <User className={cn("h-4 w-4", isSent && "text-primary-foreground")} />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[70%]", isSent && "items-end")}>
        <div className={cn("rounded-2xl px-4 py-2", isSent ? "bg-primary text-primary-foreground" : "bg-muted")}>
          <p className="text-sm leading-relaxed wrap-break-word">{message}</p>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">{timestamp}</span>
          {isAutomatic && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1 h-5">
              <Bot className="h-3 w-3" />
              Automática
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
