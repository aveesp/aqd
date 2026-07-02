import { Role } from './user.model';

export interface AdminUserRow {
  id: string;
  email: string;
  role: Role;
  status: string;
  createdAt: string;
}

export interface UserListResult {
  users: AdminUserRow[];
  page: number;
  limit: number;
  total: number;
}

export interface VerificationQueueResult {
  profiles: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number;
}

export interface AuditLogEntry {
  _id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogResult {
  logs: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
}
