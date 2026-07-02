import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-nav-bar.html',
  styleUrl: './admin-nav-bar.scss',
})
export class AdminNavBar {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly canManageAudit = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === Role.Admin || role === Role.SuperAdmin;
  });

  readonly canManageStaff = computed(() => this.authService.currentUser()?.role === Role.SuperAdmin);

  logout(): void {
    this.authService.logout().subscribe(() => void this.router.navigate(['/admin/login']));
  }
}
