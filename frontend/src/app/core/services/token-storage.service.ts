import { Injectable } from '@angular/core';

// Tokens are persisted in localStorage for simplicity during early
// development. The backend issues tokens as plain JSON (no httpOnly
// cookies), so this is a known XSS tradeoff — worth revisiting (e.g. moving
// the refresh token to an httpOnly cookie set by the backend) before
// production.
const ACCESS_TOKEN_KEY = 'aqd_access_token';
const REFRESH_TOKEN_KEY = 'aqd_refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
