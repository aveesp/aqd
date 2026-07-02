import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard, adminGuestGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./features/profile-edit/profile-edit').then((m) => m.ProfileEdit),
    canActivate: [authGuard],
  },
  {
    path: 'profile/:id',
    loadComponent: () => import('./features/profile-view/profile-view').then((m) => m.ProfileView),
    canActivate: [authGuard],
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
    canActivate: [authGuard],
  },
  {
    path: 'matches',
    loadComponent: () => import('./features/matches/matches').then((m) => m.Matches),
    canActivate: [authGuard],
  },
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/chat').then((m) => m.Chat),
    canActivate: [authGuard],
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/admin-login/admin-login').then((m) => m.AdminLogin),
    canActivate: [adminGuestGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./features/admin/admin-users/admin-users').then((m) => m.AdminUsers),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/verification',
    loadComponent: () =>
      import('./features/admin/admin-verification/admin-verification').then((m) => m.AdminVerification),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/staff',
    loadComponent: () => import('./features/admin/admin-staff/admin-staff').then((m) => m.AdminStaff),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/audit-log',
    loadComponent: () => import('./features/admin/admin-audit-log/admin-audit-log').then((m) => m.AdminAuditLog),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
