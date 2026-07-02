import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MatchesService } from '../../core/services/matches.service';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../core/models/profile.model';
import { InterestStatus } from '../../core/models/matches.model';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

type Tab = 'received' | 'sent' | 'favorites' | 'shortlist' | 'blocked';

interface MatchRow {
  entryId: string;
  otherUserId: string;
  profile: Profile | undefined;
  status?: InterestStatus;
  createdAt: string;
}

@Component({
  selector: 'app-matches',
  imports: [RouterLink, NavBar],
  templateUrl: './matches.html',
  styleUrl: './matches.scss',
})
export class Matches {
  private readonly matchesService = inject(MatchesService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  readonly activeTab = signal<Tab>('received');
  readonly rows = signal<MatchRow[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly acting = signal<Record<string, boolean>>({});

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'received', label: 'Received interests' },
    { id: 'sent', label: 'Sent interests' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'shortlist', label: 'Shortlist' },
    { id: 'blocked', label: 'Blocked' },
  ];

  constructor() {
    this.loadTab('received');
  }

  selectTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.loadTab(tab);
  }

  private loadTab(tab: Tab): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.rows.set([]);

    const source: Observable<unknown[]> =
      tab === 'received'
        ? this.matchesService.listReceivedInterests()
        : tab === 'sent'
          ? this.matchesService.listSentInterests()
          : tab === 'favorites'
            ? this.matchesService.listFavorites()
            : tab === 'shortlist'
              ? this.matchesService.listShortlist()
              : this.matchesService.listBlocked();

    source.subscribe({
      next: (entries: unknown[]) => {
        const otherUserIds = entries.map((e) => this.otherUserIdFor(tab, e));
        if (otherUserIds.length === 0) {
          this.loading.set(false);
          return;
        }
        this.profileService.getByUserIds(otherUserIds).subscribe({
          next: (profiles) => {
            const byUserId = new Map(profiles.map((p) => [p.userId, p]));
            this.rows.set(
              entries.map((e) => {
                const otherUserId = this.otherUserIdFor(tab, e);
                const row = e as { _id: string; createdAt: string; status?: InterestStatus };
                return {
                  entryId: row._id,
                  otherUserId,
                  profile: byUserId.get(otherUserId),
                  status: row.status,
                  createdAt: row.createdAt,
                };
              }),
            );
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.errorMessage.set('Could not load profile details.');
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not load this list.');
      },
    });
  }

  private otherUserIdFor(tab: Tab, entry: unknown): string {
    const e = entry as Record<string, string>;
    if (tab === 'received') return e['fromUserId'];
    if (tab === 'sent') return e['toUserId'];
    if (tab === 'blocked') return e['blockedUserId'];
    return e['targetUserId'];
  }

  private setActing(entryId: string, value: boolean): void {
    this.acting.update((state) => ({ ...state, [entryId]: value }));
  }

  accept(row: MatchRow): void {
    this.setActing(row.entryId, true);
    this.matchesService.acceptInterest(row.entryId).subscribe({
      next: () => this.loadTab('received'),
      error: () => {
        this.setActing(row.entryId, false);
        this.errorMessage.set('Could not accept this interest.');
      },
    });
  }

  decline(row: MatchRow): void {
    this.setActing(row.entryId, true);
    this.matchesService.declineInterest(row.entryId).subscribe({
      next: () => this.loadTab('received'),
      error: () => {
        this.setActing(row.entryId, false);
        this.errorMessage.set('Could not decline this interest.');
      },
    });
  }

  removeFavorite(row: MatchRow): void {
    this.setActing(row.entryId, true);
    this.matchesService.removeFavorite(row.otherUserId).subscribe({
      next: () => this.loadTab('favorites'),
      error: () => this.setActing(row.entryId, false),
    });
  }

  removeFromShortlist(row: MatchRow): void {
    this.setActing(row.entryId, true);
    this.matchesService.removeFromShortlist(row.otherUserId).subscribe({
      next: () => this.loadTab('shortlist'),
      error: () => this.setActing(row.entryId, false),
    });
  }

  unblock(row: MatchRow): void {
    this.setActing(row.entryId, true);
    this.matchesService.unblockUser(row.otherUserId).subscribe({
      next: () => this.loadTab('blocked'),
      error: () => this.setActing(row.entryId, false),
    });
  }

  message(row: MatchRow): void {
    void this.router.navigate(['/chat'], { queryParams: { with: row.otherUserId } });
  }
}
