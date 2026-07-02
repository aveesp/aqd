export enum Role {
  Guest = 'guest',
  User = 'user',
  Premium = 'premium',
  Vip = 'vip',
  SupportStaff = 'support_staff',
  MatchmakingStaff = 'matchmaking_staff',
  Admin = 'admin',
  SuperAdmin = 'super_admin',
}

export const ADMIN_PANEL_ROLES: Role[] = [
  Role.SupportStaff,
  Role.MatchmakingStaff,
  Role.Admin,
  Role.SuperAdmin,
];

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status?: string;
  emailVerifiedAt?: string | null;
  twoFactorEnabled?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  pendingToken: string;
}

export type AdminLoginResponse = LoginResponse | TwoFactorRequiredResponse;

export function isTwoFactorRequired(res: AdminLoginResponse): res is TwoFactorRequiredResponse {
  return (res as TwoFactorRequiredResponse).requiresTwoFactor === true;
}
