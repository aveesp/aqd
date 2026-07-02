import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Education, Family, Lifestyle, LocationInfo, Occupation, PartnerPreferences, Personal, Privacy, Profile, ReligionInfo } from '../models/profile.model';

export interface CreateProfilePayload {
  personal: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: 'male' | 'female';
    bio?: string;
  };
}

// The backend accepts a genuinely partial section on PATCH (only the fields
// you send are merged in per-section), unlike create which requires the
// core `personal` fields — see backend profiles.service.ts's per-section
// merge logic. Every section here is optional and partial.
export interface UpdateProfilePayload {
  personal?: Partial<Personal>;
  family?: Partial<Family>;
  education?: Partial<Education>;
  occupation?: Partial<Occupation>;
  religion?: Partial<ReligionInfo>;
  lifestyle?: Partial<Lifestyle>;
  location?: Partial<LocationInfo>;
  partnerPreferences?: Partial<PartnerPreferences>;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private readonly http: HttpClient) {}

  getOwn(): Observable<Profile> {
    return this.http.get<Profile>(`${API_BASE_URL}/profiles/me`);
  }

  getById(profileId: string): Observable<Profile> {
    return this.http.get<Profile>(`${API_BASE_URL}/profiles/${profileId}`);
  }

  create(payload: CreateProfilePayload): Observable<Profile> {
    return this.http.post<Profile>(`${API_BASE_URL}/profiles/me`, payload);
  }

  update(payload: UpdateProfilePayload): Observable<Profile> {
    return this.http.patch<Profile>(`${API_BASE_URL}/profiles/me`, payload);
  }

  updatePrivacy(payload: Partial<Privacy>): Observable<Profile> {
    return this.http.patch<Profile>(`${API_BASE_URL}/profiles/me/privacy`, payload);
  }

  getByUserIds(userIds: string[]): Observable<Profile[]> {
    if (userIds.length === 0) {
      return of([]);
    }
    return this.http.get<Profile[]>(`${API_BASE_URL}/profiles/by-users`, {
      params: { ids: userIds.join(',') },
    });
  }
}
