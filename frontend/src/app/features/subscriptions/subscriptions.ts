import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';
import { SubscriptionsService } from '../../core/services/subscriptions.service';
import { BillingCycle, Invoice, Plan, PlanCatalogEntry, Subscription } from '../../core/models/subscription.model';

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly',
};

@Component({
  selector: 'app-subscriptions',
  imports: [DatePipe, NavBar],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.scss',
})
export class Subscriptions implements OnInit {
  private readonly subscriptionsService = inject(SubscriptionsService);

  readonly billingCycleLabels = BILLING_CYCLE_LABELS;
  readonly billingCycles: BillingCycle[] = ['monthly', 'quarterly', 'half_yearly', 'yearly'];
  readonly selectedCycle = signal<BillingCycle>('monthly');

  readonly plans = signal<PlanCatalogEntry[]>([]);
  readonly mySubscription = signal<Subscription | null>(null);
  readonly invoices = signal<Invoice[]>([]);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly checkoutMessage = signal<string | null>(null);
  readonly checkingOut = signal<Plan | null>(null);
  readonly cancelling = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.subscriptionsService.listPlans().subscribe({
      next: (plans) => this.plans.set(plans),
      error: () => this.errorMessage.set('Could not load plans.'),
    });
    this.subscriptionsService.getMine().subscribe({
      next: (sub) => {
        this.mySubscription.set(sub);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load your subscription.');
      },
    });
    this.subscriptionsService.listMyInvoices().subscribe({
      next: (invoices) => this.invoices.set(invoices),
      error: () => {
        /* invoices are supplementary — a failed load shouldn't block the page */
      },
    });
  }

  selectCycle(cycle: BillingCycle): void {
    this.selectedCycle.set(cycle);
  }

  isCurrentPlan(plan: Plan): boolean {
    return this.mySubscription()?.plan === plan;
  }

  upgrade(plan: Plan): void {
    if (plan === 'free') return;
    this.checkoutMessage.set(null);
    this.checkingOut.set(plan);
    this.subscriptionsService.createCheckout(plan, this.selectedCycle()).subscribe({
      next: () => {
        this.checkingOut.set(null);
        this.checkoutMessage.set('Checkout order created. Payment collection is not yet enabled in this environment.');
      },
      error: (err: HttpErrorResponse) => {
        this.checkingOut.set(null);
        if (err.status === 503) {
          this.checkoutMessage.set('Online payments are not configured yet. Please contact support to activate your plan.');
        } else {
          this.checkoutMessage.set('Could not start checkout. Please try again.');
        }
      },
    });
  }

  cancelAutoRenew(): void {
    this.cancelling.set(true);
    this.subscriptionsService.cancelAutoRenew().subscribe({
      next: (sub) => {
        this.mySubscription.set(sub);
        this.cancelling.set(false);
      },
      error: () => {
        this.cancelling.set(false);
        this.errorMessage.set('Could not update auto-renew.');
      },
    });
  }

  formatRupees(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
