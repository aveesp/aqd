import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Subscription,
  SubscriptionDocument,
} from '../subscriptions/schemas/subscription.schema';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from '../payments/schemas/payment.schema';
import {
  Interest,
  InterestDocument,
  InterestStatus,
} from '../matches/schemas/interest.schema';
import { Plan } from '../subscriptions/plan-catalog';

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsersLast30Days: number;
  newRegistrations7Days: number;
  newRegistrations30Days: number;
  totalRevenuePaise: number;
  premiumConversionRatePercent: number;
  successfulMatches: number;
  subscriptionBreakdown: { plan: Plan; count: number }[];
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface DailyRevenue {
  date: string;
  revenuePaise: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Interest.name)
    private readonly interestModel: Model<InterestDocument>,
  ) {}

  async getSummary(): Promise<AnalyticsSummary> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      totalUsers,
      activeUsersLast30Days,
      newRegistrations7Days,
      newRegistrations30Days,
      revenueAgg,
      totalSubscriptions,
      paidSubscriptions,
      successfulMatches,
      subscriptionBreakdownAgg,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel
        .countDocuments({ lastActiveAt: { $gte: thirtyDaysAgo } })
        .exec(),
      this.userModel
        .countDocuments({ createdAt: { $gte: sevenDaysAgo } })
        .exec(),
      this.userModel
        .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        .exec(),
      this.paymentModel
        .aggregate<{ total: number }>([
          { $match: { status: PaymentStatus.Paid } },
          { $group: { _id: null, total: { $sum: '$amountPaise' } } },
        ])
        .exec(),
      this.subscriptionModel.countDocuments().exec(),
      this.subscriptionModel
        .countDocuments({ plan: { $ne: Plan.Free } })
        .exec(),
      this.interestModel
        .countDocuments({ status: InterestStatus.Accepted })
        .exec(),
      this.subscriptionModel
        .aggregate<{ _id: Plan; count: number }>([
          { $group: { _id: '$plan', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    return {
      totalUsers,
      activeUsersLast30Days,
      newRegistrations7Days,
      newRegistrations30Days,
      totalRevenuePaise: revenueAgg[0]?.total ?? 0,
      premiumConversionRatePercent:
        totalSubscriptions === 0
          ? 0
          : Math.round((paidSubscriptions / totalSubscriptions) * 1000) / 10,
      successfulMatches,
      subscriptionBreakdown: subscriptionBreakdownAgg.map((row) => ({
        plan: row._id,
        count: row.count,
      })),
    };
  }

  async getRegistrationsTimeSeries(days: number): Promise<DailyCount[]> {
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await this.userModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return fillDailySeries(rows, days).map(({ date, count }) => ({
      date,
      count,
    }));
  }

  async getRevenueTimeSeries(days: number): Promise<DailyRevenue[]> {
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await this.paymentModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { status: PaymentStatus.Paid, updatedAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            count: { $sum: '$amountPaise' },
          },
        },
      ])
      .exec();
    return fillDailySeries(rows, days).map(({ date, count }) => ({
      date,
      revenuePaise: count,
    }));
  }
}

// Aggregation pipelines only emit rows for days that have data — fill in
// the gaps with zeros so the frontend can render a continuous chart axis
// without special-casing missing days.
function fillDailySeries(
  rows: { _id: string; count: number }[],
  days: number,
): { date: string; count: number }[] {
  const byDate = new Map(rows.map((r) => [r._id, r.count]));
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    result.push({ date, count: byDate.get(date) ?? 0 });
  }
  return result;
}
