import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  AdminLoginResponse,
  AuthUser,
  LoginResponse,
  TokenPair,
  isTwoFactorRequired,
} from '../models/user.model';
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

  verifyEmail(email: string, otp: string): Observable<{ verified: true }> {
    return this.http.post<{ verified: true }>(`${API_BASE_URL}/auth/verify-email`, { email, otp });
  }

  resendVerification(email: string): Observable<{ sent: true }> {
    return this.http.post<{ sent: true }>(`${API_BASE_URL}/auth/resend-verification`, { email });
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
  // rejects staff credentials. If the account has 2FA enabled, this
  // resolves to a TwoFactorRequiredResponse instead of full tokens — the
  // caller must then call verifyTwoFactorLogin() with the pendingToken.
  adminLogin(email: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${API_BASE_URL}/admin/login`, { email, password }).pipe(
      tap((res) => {
        if (!isTwoFactorRequired(res)) {
          this.tokenStorage.setTokens(res.accessToken, res.refreshToken);
          this.currentUserSignal.set(res.user);
        }
      }),
    );
  }

  verifyTwoFactorLogin(pendingToken: string, token: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/admin/login/2fa`, { pendingToken, token }).pipe(
      tap((res) => {
        this.tokenStorage.setTokens(res.accessToken, res.refreshToken);
        this.currentUserSignal.set(res.user);
      }),
    );
  }

  beginTwoFactorSetup(): Observable<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
    return this.http.post<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>(
      `${API_BASE_URL}/admin/2fa/setup`,
      {},
    );
  }

  confirmTwoFactorSetup(token: string): Observable<{ enabled: true }> {
    return this.http.post<{ enabled: true }>(`${API_BASE_URL}/admin/2fa/confirm`, { token });
  }

  disableTwoFactor(token: string): Observable<{ enabled: false }> {
    return this.http.post<{ enabled: false }>(`${API_BASE_URL}/admin/2fa/disable`, { token });
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
