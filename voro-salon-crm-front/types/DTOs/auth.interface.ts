import { RoleDto } from "./Identity/role.interface";

export interface AuthDto {
  userId?: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  roles?: RoleDto[];
  token?: string;
  refreshToken?: string;
  tenants?: { id: string, name: string, slug: string, logoUrl?: string }[];
  twoFactorEnabled?: boolean;
  requiresTwoFactor?: boolean;
  twoFactorPendingToken?: string;
  requiresPasswordChange?: boolean;
  requiresTermsAcceptance?: boolean;
  requiresProfileCompletion?: boolean;
}
