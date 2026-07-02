import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Profile } from '../models/profile.model';

export interface SearchFilters {
  gender?: 'male' | 'female';
  ageMin?: number;
  ageMax?: number;
  sect?: string;
  maslak?: string;
  city?: string;
  verifiedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  results: Profile[];
  page: number;
  limit: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private readonly http: HttpClient) {}

  search(filters: SearchFilters): Observable<SearchResult> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<SearchResult>(`${API_BASE_URL}/search/profiles`, { params });
  }
}
