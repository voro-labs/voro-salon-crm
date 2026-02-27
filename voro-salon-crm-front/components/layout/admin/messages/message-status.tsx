"use client";

import { cn } from '@/lib/utils';
import { MessageStatusEnum } from '@/types/Enums/messageStatusEnum.enum';
import { Check, CheckCheck, Clock } from 'lucide-react';

interface MessageStatusProps {
  status: MessageStatusEnum;
  className?: string;
}

export function MessageStatus({ status, className = "" }: MessageStatusProps) {
  switch (status) {
    case MessageStatusEnum.Created:
      return <Check className={cn("h-3.5 w-3.5", className)} />;
    case MessageStatusEnum.Sent:
      return <Check className={cn("h-3.5 w-3.5", className)} />;
    case MessageStatusEnum.Delivered:
      return <CheckCheck className={cn("h-3.5 w-3.5", className)} />;
    case MessageStatusEnum.Server:
      return <CheckCheck className={cn("h-3.5 w-3.5 text-blue-500!", className)} />;
    case MessageStatusEnum.Read:
      return <CheckCheck className={cn("h-3.5 w-3.5 text-blue-500!", className)} />;
    default:
      return null;
  }
}
