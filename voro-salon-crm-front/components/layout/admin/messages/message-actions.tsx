"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Reply, Forward, Copy, Trash2, Smile } from 'lucide-react';
import { MessageDto } from "@/types/DTOs/message.interface";

interface MessageActionsProps {
  message: MessageDto;
  onReply?: (message: MessageDto) => void;
  onForward?: (message: MessageDto) => void;
  onDelete?: (message: MessageDto) => void;
  onReact?: (message: MessageDto, emoji: string) => void;
  onCopy?: (content: string) => void;
}

export function MessageActions({
  message,
  onReply,
  onForward,
  onDelete,
  onReact,
  onCopy,
}: MessageActionsProps) {
  const quickReactions = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Smile className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto">
          <div className="flex gap-1 p-1">
            {quickReactions.map((emoji) => (
              <DropdownMenuItem
                key={emoji}
                className="h-8 w-8 p-0 text-lg flex items-center justify-center cursor-pointer"
                onClick={() => onReact?.(message, emoji)}
              >
                {emoji}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onReply?.(message)}>
            <Reply className="h-4 w-4 mr-2" />
            Responder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onForward?.(message)}>
            <Forward className="h-4 w-4 mr-2" />
            Encaminhar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCopy?.(message.content)}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </DropdownMenuItem>
          {message.isFromMe && (
            <DropdownMenuItem
              onClick={() => onDelete?.(message)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
