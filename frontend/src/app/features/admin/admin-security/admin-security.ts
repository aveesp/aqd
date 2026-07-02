import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

@Component({
  selector: 'app-admin-security',
  imports: [ReactiveFormsModule, AdminNavBar],
  templateUrl: './admin-security.html',
  styleUrl: './admin-security.scss',
})
export class AdminSecurity {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly enabled = signal(this.authService.currentUser()?.twoFactorEnabled ?? false);
  readonly settingUp = signal(false);
  readonly qrCodeDataUrl = signal<string | null>(null);
  readonly secret = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly confirmForm = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly disableForm = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  beginSetup(): void {
    this.settingUp.set(true);
    this.errorMessage.set(null);
    this.authService.beginTwoFactorSetup().subscribe({
      next: (res) => {
        this.qrCodeDataUrl.set(res.qrCodeDataUrl);
        this.secret.set(res.secret);
      },
      error: (err: HttpErrorResponse) => {
        this.settingUp.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not start 2FA setup.');
      },
    });
  }

  confirmSetup(): void {
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.authService.confirmTwoFactorSetup(this.confirmForm.getRawValue().token).subscribe({
      next: () => {
        this.submitting.set(false);
        this.settingUp.set(false);
        this.qrCodeDataUrl.set(null);
        this.secret.set(null);
        this.enabled.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Invalid code. Please try again.');
      },
    });
  }

  cancelSetup(): void {
    this.settingUp.set(false);
    this.qrCodeDataUrl.set(null);
    this.secret.set(null);
  }

  disable(): void {
    if (this.disableForm.invalid) {
      this.disableForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.authService.disableTwoFactor(this.disableForm.getRawValue().token).subscribe({
      next: () => {
        this.submitting.set(false);
        this.enabled.set(false);
        this.disableForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Invalid code. Please try again.');
      },
    });
  }
}
