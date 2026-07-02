import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ADMIN_PANEL_ROLES } from '../models/user.model';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (!user) {
    return router.createUrlTree(['/admin/login']);
  }
  if (!ADMIN_PANEL_ROLES.includes(user.role)) {
    // Authenticated, but as a regular user — not a staff account.
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};

// Prevents an already-logged-in staff member from seeing /admin/login again.
export const adminGuestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (user && ADMIN_PANEL_ROLES.includes(user.role)) {
    return router.createUrlTree(['/admin/users']);
  }
  return true;
};
