import { ChatDto } from "./chat.interface"
import type { ContactIdentifierDto } from "./contact-identifier.interface"
import type { GroupMemberDto } from "./group-member.interface"

export interface ContactDto {
  id?: string
  remoteJid?: string
  displayName?: string
  number?: string
  profilePictureUrl?: string
  lastMessage?: string
  lastMessageAt?: string
  lastMessageFromMe?: boolean
  unread?: number
  lastKnownPresence?: boolean
  identifiers?: ContactIdentifierDto[]
  groupMemberships?: GroupMemberDto[]
  chats?: ChatDto[]
}
