"use client";

import { Download, File, MapPin, Pause, Play, User } from 'lucide-react';
import Image from "next/image";
import { useState } from "react";
import { MessageTypeEnum } from '@/types/Enums/messageTypeEnum.enum';
import { MessageDto } from '@/types/DTOs/message.interface';
import { Button } from '@/components/ui/button';

interface MessageContentProps {
  message: MessageDto;
  isFromMe: boolean;
}

export function MessageContent({ message, isFromMe }: MessageContentProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const renderMediaContent = () => {
    switch (message.type) {
      case MessageTypeEnum.Image:
        return (
          <div className="relative rounded-lg overflow-hidden mb-2">
            <Image
              src={message.base64 ? `data:${message.mimeType};base64,${message.base64}` : "/placeholder.svg?height=300&width=400"}
              alt="Image message"
              width={400}
              height={300}
              className="max-w-full h-auto"
            />
          </div>
        );

      case MessageTypeEnum.Video:
        return (
          <div className="relative rounded-lg overflow-hidden mb-2">
            <video
              src={`data:video/mp4;base64,${message.base64}`}
              controls
              className="max-w-full h-auto rounded-lg"
              poster={message.thumbnail
                ? `data:image/jpeg;base64,${message.thumbnail}`
                : ""}
            >
              Seu navegador não suporta vídeos.
            </video>
          </div>
        );

      case MessageTypeEnum.Audio:
        return (
          <div className="flex items-center gap-3 min-w-[200px] py-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/3" />
              </div>
            </div>
            <span className="text-xs">
              {message.durationSeconds ? `${Math.floor(message.durationSeconds / 60)}:${String(message.durationSeconds % 60).padStart(2, "0")}` : "0:00"}
            </span>
          </div>
        );

      case MessageTypeEnum.Document:
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Documento {/* {message.fileName || "Documento"} */}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.fileLength ? `${(message.fileLength / 1024).toFixed(1)} KB` : "Tamanho desconhecido"}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      case MessageTypeEnum.Location:
        return (
          <div className="space-y-2">
            <div className="relative h-40 bg-muted rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="text-xs text-center">
              {/* {message.latitude?.toFixed(6)}, {message.longitude?.toFixed(6)} */}
            </p>
          </div>
        );

      case MessageTypeEnum.Contact:
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{message.content}</p>
              <p className="text-xs text-muted-foreground">Contato</p>
            </div>
          </div>
        );

      case MessageTypeEnum.Sticker:
        return (
          <div className="relative w-32 h-32">
            <Image
              src={message.fileUrl || "/placeholder.svg?height=128&width=128"}
              alt="Sticker"
              width={128}
              height={128}
              className="object-contain"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {message.quotedMessage && (
        <div className={`mb-2 pl-3 border-l-2 ${isFromMe ? 'border-primary-foreground/50' : 'border-primary/50'} py-1`}>
          <p className={`text-xs font-medium ${isFromMe ? 'text-primary-foreground/80' : 'text-primary'}`}>
            {message.quotedMessage.isFromMe ? "Você" : message.quotedMessage.chat?.contact?.displayName || "Contato"}
          </p>
          <p className={`text-xs ${isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'} truncate`}>
            {message.quotedMessage.content}
          </p>
        </div>
      )}
      
      {renderMediaContent()}
      
      {message.content && message.type !== MessageTypeEnum.Contact && (
        <p className="text-sm leading-relaxed wrap-break-word">{message.content}</p>
      )}
    </div>
  );
}
