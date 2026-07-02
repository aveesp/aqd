import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { isTwoFactorRequired } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly totpForm = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingToken = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();
    this.authService.adminLogin(email, password).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (isTwoFactorRequired(res)) {
          this.pendingToken.set(res.pendingToken);
          return;
        }
        void this.router.navigate(['/admin/users']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Login failed. This login is for staff accounts only.');
      },
    });
  }

  submitTotp(): void {
    const pendingToken = this.pendingToken();
    if (this.totpForm.invalid || !pendingToken) {
      this.totpForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.authService.verifyTwoFactorLogin(pendingToken, this.totpForm.getRawValue().token).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/admin/users']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Invalid authentication code.');
      },
    });
  }
}
