import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly resending = signal(false);
  readonly resent = signal(false);

  logout(): void {
    this.authService.logout().subscribe(() => void this.router.navigate(['/login']));
  }

  resendVerification(): void {
    const email = this.authService.currentUser()?.email;
    if (!email) return;
    this.resending.set(true);
    this.authService.resendVerification(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.resent.set(true);
      },
      error: () => this.resending.set(false),
    });
  }
}
