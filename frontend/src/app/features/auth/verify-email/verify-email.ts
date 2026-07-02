import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly form = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly success = signal(false);
  readonly resending = signal(false);
  readonly resent = signal(false);

  ngOnInit(): void {
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
  }

  submit(): void {
    if (this.form.invalid || !this.email()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.authService.verifyEmail(this.email(), this.form.getRawValue().otp).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        setTimeout(() => void this.router.navigate(['/login']), 1200);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Verification failed. Please try again.');
      },
    });
  }

  resend(): void {
    if (!this.email()) return;
    this.resending.set(true);
    this.resent.set(false);
    this.authService.resendVerification(this.email()).subscribe({
      next: () => {
        this.resending.set(false);
        this.resent.set(true);
      },
      error: () => {
        this.resending.set(false);
      },
    });
  }
}
