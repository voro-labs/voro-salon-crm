import type { MessageStatusEnum } from "../Enums/messageStatusEnum.enum"
import type { MessageTypeEnum } from "../Enums/messageTypeEnum.enum"
import type { ChatDto } from "./chat.interface"
import type { ContactDto } from "./contact.interface"
import type { GroupDto } from "./group.interface"
import type { MessageReactionDto } from "./message-reaction.interface"

export interface MessageDto {
  id?: string
  remoteJid?: string
  messageId?: string
  fromMe?: boolean
  body?: string
  messageType?: string
  createdAt?: string
  messageReactions?: MessageReactionDto[]
  externalId?: string
  remoteFrom?: string
  remoteTo?: string
  base64?: string
  content: string
  rawJson?: string
  sentAt: Date
  isFromMe: boolean
  status: MessageStatusEnum
  updatedAt?: Date
  type?: MessageTypeEnum
  mimeType?: string
  fileUrl?: string
  fileLength?: number
  width?: number
  height?: number
  durationSeconds?: number
  thumbnail?: number[]
  chatId?: string
  chat?: ChatDto
  quotedMessageId?: string
  quotedMessage?: MessageDto
}
