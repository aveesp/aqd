import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../core/services/search.service';
import { MatchesService } from '../../core/services/matches.service';
import { photoUrl } from '../../core/services/profile.service';
import { Profile } from '../../core/models/profile.model';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

interface ActionState {
  interestSent?: boolean;
  favorited?: boolean;
  shortlisted?: boolean;
  error?: string;
}

@Component({
  selector: 'app-search',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, NavBar],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  private readonly fb = inject(FormBuilder);
  private readonly searchService = inject(SearchService);
  private readonly matchesService = inject(MatchesService);

  readonly filterForm = this.fb.nonNullable.group({
    gender: [''],
    ageMin: [''],
    ageMax: [''],
    sect: [''],
    maslak: [''],
    city: [''],
    verifiedOnly: [false],
  });

  readonly results = signal<Profile[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly searched = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionState = signal<Record<string, ActionState>>({});

  constructor() {
    this.runSearch();
  }

  runSearch(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const raw = this.filterForm.getRawValue();
    this.searchService
      .search({
        gender: (raw.gender || undefined) as 'male' | 'female' | undefined,
        ageMin: raw.ageMin ? Number(raw.ageMin) : undefined,
        ageMax: raw.ageMax ? Number(raw.ageMax) : undefined,
        sect: raw.sect || undefined,
        maslak: raw.maslak || undefined,
        city: raw.city || undefined,
        verifiedOnly: raw.verifiedOnly || undefined,
      })
      .subscribe({
        next: (res) => {
          this.results.set(res.results);
          this.total.set(res.total);
          this.loading.set(false);
          this.searched.set(true);
        },
        error: () => {
          this.loading.set(false);
          this.searched.set(true);
          this.errorMessage.set('Could not load search results.');
        },
      });
  }

  private patchAction(userId: string, patch: ActionState): void {
    this.actionState.update((state) => ({ ...state, [userId]: { ...state[userId], ...patch } }));
  }

  expressInterest(userId: string): void {
    this.matchesService.expressInterest(userId).subscribe({
      next: () => this.patchAction(userId, { interestSent: true, error: undefined }),
      error: (err: HttpErrorResponse) =>
        this.patchAction(userId, { error: err.error?.message ?? 'Could not send interest.' }),
    });
  }

  addFavorite(userId: string): void {
    this.matchesService.addFavorite(userId).subscribe({
      next: () => this.patchAction(userId, { favorited: true, error: undefined }),
      error: (err: HttpErrorResponse) =>
        this.patchAction(userId, { error: err.error?.message ?? 'Could not add favorite.' }),
    });
  }

  addToShortlist(userId: string): void {
    this.matchesService.addToShortlist(userId).subscribe({
      next: () => this.patchAction(userId, { shortlisted: true, error: undefined }),
      error: (err: HttpErrorResponse) =>
        this.patchAction(userId, { error: err.error?.message ?? 'Could not shortlist.' }),
    });
  }

  primaryPhotoUrl(p: Profile): string | null {
    const primary = p.photos?.find((photo) => photo.isPrimary) ?? p.photos?.[0];
    return primary ? photoUrl(primary.url) : null;
  }
}
