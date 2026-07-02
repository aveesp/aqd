import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  BillingCycle,
  CheckoutResponse,
  Invoice,
  Plan,
  PlanCatalogEntry,
  Subscription,
} from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  constructor(private readonly http: HttpClient) {}

  listPlans(): Observable<PlanCatalogEntry[]> {
    return this.http.get<PlanCatalogEntry[]>(`${API_BASE_URL}/subscriptions/plans`);
  }

  getMine(): Observable<Subscription> {
    return this.http.get<Subscription>(`${API_BASE_URL}/subscriptions/me`);
  }

  cancelAutoRenew(): Observable<Subscription> {
    return this.http.patch<Subscription>(`${API_BASE_URL}/subscriptions/me/cancel-auto-renew`, {});
  }

  createCheckout(plan: Plan, billingCycle: BillingCycle): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${API_BASE_URL}/payments/checkout`, { plan, billingCycle });
  }

  listMyInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${API_BASE_URL}/payments/invoices`);
  }
}
