import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatchmakingService } from '../../core/services/matchmaking.service';
import { MatchSuggestion } from '../../core/models/matchmaking.model';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

@Component({
  selector: 'app-suggestions',
  imports: [DatePipe, RouterLink, NavBar],
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.scss',
})
export class Suggestions implements OnInit {
  private readonly matchmakingService = inject(MatchmakingService);

  readonly suggestions = signal<MatchSuggestion[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly acting = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.matchmakingService.listMySuggestions().subscribe({
      next: (res) => {
        this.suggestions.set(res);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.status === 404 ? 'Create your profile first.' : 'Could not load suggestions.');
      },
    });
  }

  respond(s: MatchSuggestion, status: 'accepted' | 'declined'): void {
    this.acting.update((state) => ({ ...state, [s._id]: true }));
    this.matchmakingService.respond(s._id, status).subscribe({
      next: () => this.load(),
      error: () => {
        this.acting.update((state) => ({ ...state, [s._id]: false }));
        this.errorMessage.set('Could not record your response.');
      },
    });
  }
}
