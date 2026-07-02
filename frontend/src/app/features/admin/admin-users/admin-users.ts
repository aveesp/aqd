import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminUserRow } from '../../../core/models/admin.model';
import { Role } from '../../../core/models/user.model';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

@Component({
  selector: 'app-admin-users',
  imports: [AdminNavBar],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);

  readonly users = signal<AdminUserRow[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly acting = signal<Record<string, boolean>>({});

  readonly canChangeStatus = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === Role.Admin || role === Role.SuperAdmin;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.listUsers().subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not load users.');
      },
    });
  }

  toggleStatus(user: AdminUserRow): void {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    this.acting.update((state) => ({ ...state, [user.id]: true }));
    this.adminService.setUserStatus(user.id, nextStatus).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.acting.update((state) => ({ ...state, [user.id]: false }));
        this.errorMessage.set(err.error?.message ?? 'Could not update user status.');
      },
    });
  }
}
