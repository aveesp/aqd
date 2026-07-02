import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatchmakingService } from '../../../core/services/matchmaking.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Profile } from '../../../core/models/profile.model';
import { MatchSuggestion } from '../../../core/models/matchmaking.model';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

@Component({
  selector: 'app-admin-matchmaking',
  imports: [ReactiveFormsModule, DatePipe, AdminNavBar],
  templateUrl: './admin-matchmaking.html',
  styleUrl: './admin-matchmaking.scss',
})
export class AdminMatchmaking implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly matchmakingService = inject(MatchmakingService);
  private readonly profileService = inject(ProfileService);

  readonly clients = signal<Profile[]>([]);
  readonly loadingClients = signal(true);
  readonly selectedClient = signal<Profile | null>(null);
  readonly clientSuggestions = signal<MatchSuggestion[]>([]);
  readonly loadingSuggestions = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly previewedCandidate = signal<Profile | null>(null);
  readonly previewError = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly suggestForm = this.fb.nonNullable.group({
    candidateProfileId: ['', Validators.required],
    note: [''],
  });

  ngOnInit(): void {
    this.loadingClients.set(true);
    this.matchmakingService.listMyClients().subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.loadingClients.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingClients.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not load your assigned clients.');
      },
    });
  }

  selectClient(client: Profile): void {
    this.selectedClient.set(client);
    this.previewedCandidate.set(null);
    this.previewError.set(null);
    this.suggestForm.reset({ candidateProfileId: '', note: '' });
    this.loadSuggestions(client._id);
  }

  private loadSuggestions(clientProfileId: string): void {
    this.loadingSuggestions.set(true);
    this.matchmakingService.listClientSuggestions(clientProfileId).subscribe({
      next: (res) => {
        this.clientSuggestions.set(res);
        this.loadingSuggestions.set(false);
      },
      error: () => {
        this.loadingSuggestions.set(false);
        this.errorMessage.set('Could not load suggestions for this client.');
      },
    });
  }

  previewCandidate(): void {
    const id = this.suggestForm.getRawValue().candidateProfileId.trim();
    if (!id) return;
    this.previewError.set(null);
    this.profileService.getById(id).subscribe({
      next: (profile) => this.previewedCandidate.set(profile),
      error: () => {
        this.previewedCandidate.set(null);
        this.previewError.set('No profile found with that ID.');
      },
    });
  }

  submitSuggestion(): void {
    const client = this.selectedClient();
    const candidate = this.previewedCandidate();
    if (!client || !candidate) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    const note = this.suggestForm.getRawValue().note || undefined;
    this.matchmakingService.createSuggestion(client._id, candidate._id, note).subscribe({
      next: () => {
        this.submitting.set(false);
        this.previewedCandidate.set(null);
        this.suggestForm.reset({ candidateProfileId: '', note: '' });
        this.loadSuggestions(client._id);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not create this suggestion.');
      },
    });
  }
}
