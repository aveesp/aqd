import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AnalyticsSummary, DailyCount, DailyRevenue } from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private readonly http: HttpClient) {}

  getSummary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${API_BASE_URL}/admin/analytics/summary`);
  }

  getRegistrations(days = 30): Observable<DailyCount[]> {
    const params = new HttpParams().set('days', days);
    return this.http.get<DailyCount[]>(`${API_BASE_URL}/admin/analytics/registrations`, { params });
  }

  getRevenue(days = 30): Observable<DailyRevenue[]> {
    const params = new HttpParams().set('days', days);
    return this.http.get<DailyRevenue[]>(`${API_BASE_URL}/admin/analytics/revenue`, { params });
  }
}
