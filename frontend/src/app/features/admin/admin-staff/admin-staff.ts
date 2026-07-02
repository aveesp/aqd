import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Role } from '../../../core/models/user.model';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

@Component({
  selector: 'app-admin-staff',
  imports: [ReactiveFormsModule, AdminNavBar],
  templateUrl: './admin-staff.html',
  styleUrl: './admin-staff.scss',
})
export class AdminStaff {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: [Role.SupportStaff, Validators.required],
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly created = signal<{ email: string; role: Role } | null>(null);

  readonly assignableRoles = [Role.SupportStaff, Role.MatchmakingStaff, Role.Admin];

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.created.set(null);
    const { email, password, role } = this.form.getRawValue();
    this.adminService.createStaff(email, password, role).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.created.set({ email: res.email, role: res.role });
        this.form.reset({ email: '', password: '', role: Role.SupportStaff });
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not create this staff account.');
      },
    });
  }
}
