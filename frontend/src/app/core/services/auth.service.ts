import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthUser, LoginResponse, TokenPair } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<AuthUser | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService,
  ) {}

  register(email: string, password: string): Observable<{ id: string; email: string }> {
    return this.http.post<{ id: string; email: string }>(`${API_BASE_URL}/auth/register`, { email, password });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, password }).pipe(
      tap((res) => {
        this.tokenStorage.setTokens(res.accessToken, res.refreshToken);
        this.currentUserSignal.set(res.user);
      }),
    );
  }

  // Staff-only counterpart to login() — hits the backend's separate
  // /admin/login, which rejects regular-user credentials the way /auth/login
  // rejects staff credentials.
  adminLogin(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/admin/login`, { email, password }).pipe(
      tap((res) => {
        this.tokenStorage.setTokens(res.accessToken, res.refreshToken);
        this.currentUserSignal.set(res.user);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/auth/logout`, {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearSession()),
    );
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.currentUserSignal.set(null);
  }

  refresh(): Observable<TokenPair> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    return this.http
      .post<TokenPair>(`${API_BASE_URL}/auth/refresh`, {}, { headers: { Authorization: `Bearer ${refreshToken}` } })
      .pipe(tap((tokens) => this.tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)));
  }

  // Called once at app bootstrap: if a token was persisted from a previous
  // session, fetch the current user to rehydrate `currentUser` (the access
  // token itself isn't decoded client-side).
  restoreSession(): Observable<AuthUser | null> {
    if (!this.tokenStorage.getAccessToken()) {
      return of(null);
    }
    return this.http.get<AuthUser>(`${API_BASE_URL}/users/me`).pipe(
      tap((user) => this.currentUserSignal.set(user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }
}
