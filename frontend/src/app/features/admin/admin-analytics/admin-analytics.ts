import { Component, OnInit, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AnalyticsSummary, DailyCount, DailyRevenue } from '../../../core/models/analytics.model';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

@Component({
  selector: 'app-admin-analytics',
  imports: [AdminNavBar],
  templateUrl: './admin-analytics.html',
  styleUrl: './admin-analytics.scss',
})
export class AdminAnalytics implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly summary = signal<AnalyticsSummary | null>(null);
  readonly registrations = signal<DailyCount[]>([]);
  readonly revenue = signal<DailyRevenue[]>([]);

  ngOnInit(): void {
    this.analyticsService.getSummary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load analytics summary.');
      },
    });
    this.analyticsService.getRegistrations(30).subscribe((rows) => this.registrations.set(rows));
    this.analyticsService.getRevenue(30).subscribe((rows) => this.revenue.set(rows));
  }

  formatRupees(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  registrationBarHeight(count: number): number {
    const max = Math.max(1, ...this.registrations().map((r) => r.count));
    return Math.round((count / max) * 100);
  }

  revenueBarHeight(paise: number): number {
    const max = Math.max(1, ...this.revenue().map((r) => r.revenuePaise));
    return Math.round((paise / max) * 100);
  }

  formatDay(date: string): string {
    return date.slice(5);
  }
}
