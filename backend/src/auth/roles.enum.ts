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

// Intentionally no "agent" role: matchmaking staff act through the Admin
// Panel under RBAC, not a standalone agent-facing login/portal.
export const ADMIN_PANEL_ROLES: Role[] = [
  Role.SupportStaff,
  Role.MatchmakingStaff,
  Role.Admin,
  Role.SuperAdmin,
];
