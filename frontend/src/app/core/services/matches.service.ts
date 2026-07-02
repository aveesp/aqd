import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { BlockEntry, FavoriteOrShortlistEntry, Interest } from '../models/matches.model';

@Injectable({ providedIn: 'root' })
export class MatchesService {
  constructor(private readonly http: HttpClient) {}

  expressInterest(targetUserId: string): Observable<Interest> {
    return this.http.post<Interest>(`${API_BASE_URL}/matches/interests/${targetUserId}`, {});
  }

  acceptInterest(interestId: string): Observable<Interest> {
    return this.http.patch<Interest>(`${API_BASE_URL}/matches/interests/${interestId}/accept`, {});
  }

  declineInterest(interestId: string): Observable<Interest> {
    return this.http.patch<Interest>(`${API_BASE_URL}/matches/interests/${interestId}/decline`, {});
  }

  listSentInterests(): Observable<Interest[]> {
    return this.http.get<Interest[]>(`${API_BASE_URL}/matches/interests/sent`);
  }

  listReceivedInterests(): Observable<Interest[]> {
    return this.http.get<Interest[]>(`${API_BASE_URL}/matches/interests/received`);
  }

  addFavorite(targetUserId: string): Observable<FavoriteOrShortlistEntry> {
    return this.http.post<FavoriteOrShortlistEntry>(`${API_BASE_URL}/matches/favorites/${targetUserId}`, {});
  }

  removeFavorite(targetUserId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/matches/favorites/${targetUserId}`);
  }

  listFavorites(): Observable<FavoriteOrShortlistEntry[]> {
    return this.http.get<FavoriteOrShortlistEntry[]>(`${API_BASE_URL}/matches/favorites`);
  }

  addToShortlist(targetUserId: string): Observable<FavoriteOrShortlistEntry> {
    return this.http.post<FavoriteOrShortlistEntry>(`${API_BASE_URL}/matches/shortlist/${targetUserId}`, {});
  }

  removeFromShortlist(targetUserId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/matches/shortlist/${targetUserId}`);
  }

  listShortlist(): Observable<FavoriteOrShortlistEntry[]> {
    return this.http.get<FavoriteOrShortlistEntry[]>(`${API_BASE_URL}/matches/shortlist`);
  }

  blockUser(targetUserId: string): Observable<BlockEntry> {
    return this.http.post<BlockEntry>(`${API_BASE_URL}/matches/block/${targetUserId}`, {});
  }

  unblockUser(targetUserId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/matches/block/${targetUserId}`);
  }

  listBlocked(): Observable<BlockEntry[]> {
    return this.http.get<BlockEntry[]>(`${API_BASE_URL}/matches/blocked`);
  }
}
