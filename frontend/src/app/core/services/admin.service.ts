import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Role } from '../models/user.model';
import { AuditLogResult, UserListResult, VerificationQueueResult } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly http: HttpClient) {}

  createStaff(email: string, password: string, role: Role): Observable<{ id: string; email: string; role: Role }> {
    return this.http.post<{ id: string; email: string; role: Role }>(`${API_BASE_URL}/admin/staff`, {
      email,
      password,
      role,
    });
  }

  listUsers(page = 1, limit = 20): Observable<UserListResult> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<UserListResult>(`${API_BASE_URL}/admin/users`, { params });
  }

  setUserStatus(userId: string, status: 'active' | 'suspended'): Observable<{ id: string; email: string; status: string }> {
    return this.http.patch<{ id: string; email: string; status: string }>(`${API_BASE_URL}/admin/users/${userId}/status`, {
      status,
    });
  }

  listVerificationQueue(page = 1, limit = 20): Observable<VerificationQueueResult> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<VerificationQueueResult>(`${API_BASE_URL}/admin/profiles/verification-queue`, { params });
  }

  decideVerification(profileId: string, decision: 'verified' | 'rejected'): Observable<Record<string, unknown>> {
    return this.http.patch<Record<string, unknown>>(`${API_BASE_URL}/admin/profiles/${profileId}/verification`, {
      decision,
    });
  }

  listAuditLogs(page = 1, limit = 50): Observable<AuditLogResult> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<AuditLogResult>(`${API_BASE_URL}/admin/audit-logs`, { params });
  }
}
