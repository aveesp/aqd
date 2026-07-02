import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL, WS_BASE_URL } from '../config/api.config';
import {
  DocumentType,
  Education,
  Family,
  Lifestyle,
  LocationInfo,
  Occupation,
  PartnerPreferences,
  Personal,
  Privacy,
  Profile,
  ReligionInfo,
} from '../models/profile.model';

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

  uploadPhotos(files: File[]): Observable<Profile> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<Profile>(`${API_BASE_URL}/profiles/me/photos`, formData);
  }

  deletePhoto(photoId: string): Observable<Profile> {
    return this.http.delete<Profile>(`${API_BASE_URL}/profiles/me/photos/${photoId}`);
  }

  setPrimaryPhoto(photoId: string): Observable<Profile> {
    return this.http.patch<Profile>(`${API_BASE_URL}/profiles/me/photos/${photoId}/primary`, {});
  }

  uploadDocument(file: File, docType: DocumentType): Observable<Profile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    return this.http.post<Profile>(`${API_BASE_URL}/profiles/me/documents`, formData);
  }

  getOwnDocumentBlob(docId: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/profiles/me/documents/${docId}/file`, { responseType: 'blob' });
  }
}

// Photo URLs from the backend are relative (e.g. "/uploads/photos/x.jpg"),
// served from the bare backend origin, not under /api/v1.
export function photoUrl(relativeUrl: string): string {
  return `${WS_BASE_URL}${relativeUrl}`;
}
