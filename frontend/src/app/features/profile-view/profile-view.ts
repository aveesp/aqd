import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProfileService, photoUrl } from '../../core/services/profile.service';
import { MatchesService } from '../../core/services/matches.service';
import { AuthService } from '../../core/services/auth.service';
import { Profile } from '../../core/models/profile.model';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

interface ActionState {
  interestSent?: boolean;
  favorited?: boolean;
  shortlisted?: boolean;
  error?: string;
}

@Component({
  selector: 'app-profile-view',
  imports: [DatePipe, RouterLink, NavBar],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly profileService = inject(ProfileService);
  private readonly matchesService = inject(MatchesService);
  private readonly authService = inject(AuthService);

  readonly photoUrl = photoUrl;
  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionState = signal<ActionState>({});

  readonly isOwnProfile = () => this.profile()?.userId === this.authService.currentUser()?.id;

  ngOnInit(): void {
    const profileId = this.route.snapshot.paramMap.get('id');
    if (!profileId) {
      this.loading.set(false);
      this.errorMessage.set('No profile specified.');
      return;
    }
    this.profileService.getById(profileId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.status === 404 ? 'Profile not found.' : 'Could not load this profile.');
      },
    });
  }

  expressInterest(): void {
    const userId = this.profile()?.userId;
    if (!userId) return;
    this.matchesService.expressInterest(userId).subscribe({
      next: () => this.actionState.update((s) => ({ ...s, interestSent: true, error: undefined })),
      error: (err: HttpErrorResponse) =>
        this.actionState.update((s) => ({ ...s, error: err.error?.message ?? 'Could not send interest.' })),
    });
  }

  addFavorite(): void {
    const userId = this.profile()?.userId;
    if (!userId) return;
    this.matchesService.addFavorite(userId).subscribe({
      next: () => this.actionState.update((s) => ({ ...s, favorited: true, error: undefined })),
      error: (err: HttpErrorResponse) =>
        this.actionState.update((s) => ({ ...s, error: err.error?.message ?? 'Could not add favorite.' })),
    });
  }

  addToShortlist(): void {
    const userId = this.profile()?.userId;
    if (!userId) return;
    this.matchesService.addToShortlist(userId).subscribe({
      next: () => this.actionState.update((s) => ({ ...s, shortlisted: true, error: undefined })),
      error: (err: HttpErrorResponse) =>
        this.actionState.update((s) => ({ ...s, error: err.error?.message ?? 'Could not shortlist.' })),
    });
  }
}
