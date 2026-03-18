import type { UserDto } from "./Identity/user.interface"
import type { ContactDto } from "./contact.interface"
import type { StudentDto } from "./student.interface"
import type { InstanceDto } from "./instance.interface"

export interface UserExtensionDto {
  userId?: string
  user?: UserDto
  contact?: ContactDto
  student?: StudentDto
  instances?: InstanceDto[]
}
