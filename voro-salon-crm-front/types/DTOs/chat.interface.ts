import { MessageStatusEnum } from "../Enums/messageStatusEnum.enum"
import { ContactDto } from "./contact.interface"
import { GroupDto } from "./group.interface"
import { InstanceExtensionDto } from "./instance-extension.interface"
import type { MessageDto } from "./message.interface"

export interface ChatDto {
  id?: string
  remoteJid?: string
  isGroup?: boolean
  lastMessage?: string;
  lastMessageFromMe?: boolean;
  lastMessageStatus?: MessageStatusEnum;
  lastMessageAt?: Date;
  group?: GroupDto
  contact?: ContactDto
  messages?: MessageDto[]
  instanceExtensionId?: string
  instanceExtension?: InstanceExtensionDto
}
