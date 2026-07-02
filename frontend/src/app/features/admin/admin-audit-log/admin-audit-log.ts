import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { AuditLogEntry } from '../../../core/models/admin.model';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

@Component({
  selector: 'app-admin-audit-log',
  imports: [AdminNavBar, DatePipe],
  templateUrl: './admin-audit-log.html',
  styleUrl: './admin-audit-log.scss',
})
export class AdminAuditLog implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly logs = signal<AuditLogEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.adminService.listAuditLogs().subscribe({
      next: (res) => {
        this.logs.set(res.logs);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not load the audit log.');
      },
    });
  }
}
