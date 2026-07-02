import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

// Endpoints that must never trigger the auto-refresh-and-retry flow below —
// a 401 from any of these means "bad credentials" or "bad/expired refresh
// token", not "access token expired", so retrying after a refresh would be
// wrong (and for /auth/refresh itself, would infinite-loop).
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/admin/login'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(API_BASE_URL);
  const accessToken = tokenStorage.getAccessToken();
  const authReq = isApiRequest && accessToken ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : req;

  const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => req.url.includes(path));

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && isApiRequest && !isAuthEndpoint && tokenStorage.getRefreshToken()) {
        return authService.refresh().pipe(
          switchMap(() => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${tokenStorage.getAccessToken()}` },
            });
            return next(retried);
          }),
          catchError((refreshErr: unknown) => {
            authService.clearSession();
            void router.navigate(['/login']);
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
