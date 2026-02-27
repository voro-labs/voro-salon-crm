import { UserRoleDto } from "./user-role.interface";

export interface UserDto {
  id?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  birthDate?: Date;
  countryCode?: string;
  phoneNumber?: string;
  isActive?: boolean;
  userRoles?: UserRoleDto[];
}
