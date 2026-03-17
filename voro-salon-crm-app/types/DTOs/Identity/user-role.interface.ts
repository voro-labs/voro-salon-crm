import { RoleDto } from "./role.interface";
import { UserDto } from "./user.interface";

export interface UserRoleDto {
  userId: string;
  roleId: string;
  roleName?: string;
  userName?: string;
  role?: RoleDto;
  user?: UserDto;
}
