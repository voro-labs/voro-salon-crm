import { InstanceStatusEnum } from "../Enums/instanceStatusEnum.enum"
import type { ChatDto } from "./chat.interface"

export interface InstanceExtensionDto {
  id?: string
  phoneNumber?: string
  profileName?: string
  profilePictureUrl?: string
  status?: InstanceStatusEnum
  base64?: string
  connectedAt?: string
  chats?: ChatDto[]
}
