import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

interface QueueProfile {
  _id: string;
  personal: { firstName: string; lastName: string; gender: string; dob: string };
  verificationStatus: string;
}

@Component({
  selector: 'app-admin-verification',
  imports: [AdminNavBar, DatePipe],
  templateUrl: './admin-verification.html',
  styleUrl: './admin-verification.scss',
})
export class AdminVerification implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly profiles = signal<QueueProfile[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly acting = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.listVerificationQueue().subscribe({
      next: (res) => {
        this.profiles.set(res.profiles as unknown as QueueProfile[]);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not load the verification queue.');
      },
    });
  }

  decide(profile: QueueProfile, decision: 'verified' | 'rejected'): void {
    this.acting.update((state) => ({ ...state, [profile._id]: true }));
    this.adminService.decideVerification(profile._id, decision).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.acting.update((state) => ({ ...state, [profile._id]: false }));
        this.errorMessage.set(err.error?.message ?? 'Could not record this decision.');
      },
    });
  }
}
