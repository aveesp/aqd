import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { MatchSuggestion, SuggestionStatus } from '../models/matchmaking.model';
import { Profile } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class MatchmakingService {
  constructor(private readonly http: HttpClient) {}

  // --- Client-facing ---

  listMySuggestions(): Observable<MatchSuggestion[]> {
    return this.http.get<MatchSuggestion[]>(`${API_BASE_URL}/matchmaking/suggestions`);
  }

  respond(suggestionId: string, status: Extract<SuggestionStatus, 'accepted' | 'declined'>): Observable<unknown> {
    return this.http.patch(`${API_BASE_URL}/matchmaking/suggestions/${suggestionId}/respond`, { status });
  }

  // --- Staff-facing ---

  listMyClients(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${API_BASE_URL}/matchmaking/my-clients`);
  }

  listClientSuggestions(clientProfileId: string): Observable<MatchSuggestion[]> {
    return this.http.get<MatchSuggestion[]>(`${API_BASE_URL}/matchmaking/clients/${clientProfileId}/suggestions`);
  }

  createSuggestion(clientProfileId: string, suggestedProfileId: string, note?: string): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/matchmaking/suggestions`, { clientProfileId, suggestedProfileId, note });
  }
}
