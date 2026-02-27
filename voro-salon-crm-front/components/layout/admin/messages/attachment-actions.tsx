"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Paperclip, Image, FileText, File, FileArchive, Film, Mic } from "lucide-react";

interface AttachmentActionsProps {
  onSendImage?: () => void;
  onSendDocument?: () => void;
  onSendPdf?: () => void;
  onSendZip?: () => void;
  onSendVideo?: () => void;
  onSendAudio?: () => void;
}

export function AttachmentActions({
  onSendImage,
  onSendDocument,
  onSendPdf,
  onSendZip,
  onSendVideo,
  onSendAudio,
}: AttachmentActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon">
          <Paperclip className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => onSendImage?.()}>
          <Image className="h-4 w-4 mr-2" />
          Foto / Imagem
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onSendDocument?.()}>
          <FileText className="h-4 w-4 mr-2" />
          Documento
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onSendPdf?.()}>
          <File className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onSendZip?.()}>
          <FileArchive className="h-4 w-4 mr-2" />
          ZIP / RAR
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onSendVideo?.()}>
          <Film className="h-4 w-4 mr-2" />
          Vídeo
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onSendAudio?.()}>
          <Mic className="h-4 w-4 mr-2" />
          Áudio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
