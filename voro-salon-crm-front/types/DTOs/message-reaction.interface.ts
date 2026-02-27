import type { MessageDto } from "./message.interface"

export interface MessageReactionDto {
  id?: string
  emoji?: string
  reactorRemoteJid?: string
  messageId?: string
  // [JsonIgnore]
  message?: MessageDto
}
