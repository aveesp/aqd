import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Profile } from '../models/profile.model';

export interface CreateProfilePayload {
  personal: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: 'male' | 'female';
    bio?: string;
  };
}

// The backend accepts a genuinely partial `personal` section on PATCH (only
// the fields you send are merged in), unlike create which requires the core
// fields — see profiles.service.ts's per-section merge logic.
export interface UpdateProfilePayload {
  personal?: Partial<CreateProfilePayload['personal']>;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private readonly http: HttpClient) {}

  getOwn(): Observable<Profile> {
    return this.http.get<Profile>(`${API_BASE_URL}/profiles/me`);
  }

  create(payload: CreateProfilePayload): Observable<Profile> {
    return this.http.post<Profile>(`${API_BASE_URL}/profiles/me`, payload);
  }

  update(payload: UpdateProfilePayload): Observable<Profile> {
    return this.http.patch<Profile>(`${API_BASE_URL}/profiles/me`, payload);
  }
}
