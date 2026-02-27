import type { ContactDto } from "./contact.interface"
import type { GroupDto } from "./group.interface"

export interface GroupMemberDto {
  id?: string
  groupId?: string
  group?: GroupDto
  contactId?: string
  contact?: ContactDto
  role?: string
  joinedAt?: string
}
