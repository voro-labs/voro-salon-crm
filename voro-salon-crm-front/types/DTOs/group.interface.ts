import type { GroupMemberDto } from "./group-member.interface"

export interface GroupDto {
  id?: string
  remoteJid?: string
  name?: string
  profilePictureUrl?: string
  createdAt?: string
  // [JsonIgnore]
  groupMemberships?: GroupMemberDto[]
}
