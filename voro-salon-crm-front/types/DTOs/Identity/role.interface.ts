import { UserRoleDto } from "./user-role.interface";


export interface RoleDto {
  id: string;
  name: string;
  description?: string;
  userRoles?: UserRoleDto[];
}
