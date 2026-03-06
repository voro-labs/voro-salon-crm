import { RoleDto } from "./Identity/role.interface";

export interface AuthDto {
  userId?: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  roles?: RoleDto[];
  expiration?: Date;
  token: string;
  tenants?: { id: string, name: string, slug: string, logoUrl?: string }[];
}
