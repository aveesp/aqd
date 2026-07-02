export interface SubscriptionBreakdownRow {
  plan: string;
  count: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsersLast30Days: number;
  newRegistrations7Days: number;
  newRegistrations30Days: number;
  totalRevenuePaise: number;
  premiumConversionRatePercent: number;
  successfulMatches: number;
  subscriptionBreakdown: SubscriptionBreakdownRow[];
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface DailyRevenue {
  date: string;
  revenuePaise: number;
}
