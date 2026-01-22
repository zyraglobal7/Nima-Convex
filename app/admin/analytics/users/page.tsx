'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getUserAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <StatsGrid
        stats={[
          { label: 'Total Users', value: analytics.total },
          { label: 'New in Period', value: analytics.newInPeriod, description: 'Signups during selected dates' },
          { label: 'Active in Period', value: analytics.activeInPeriod, description: 'Users with activity' },
          { label: 'Onboarding Complete', value: analytics.onboardingCompleted },
        ]}
      />

      {/* Signup Trend */}
      <AnalyticsChart
        type="area"
        title="New User Signups"
        description="Daily new user registrations"
        data={analytics.trend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Gender */}
        <AnalyticsChart
          type="pie"
          title="Users by Gender"
          description="Gender distribution"
          data={analytics.byGender}
          dataKey="count"
          nameKey="gender"
          height={300}
        />

        {/* By Subscription */}
        <AnalyticsChart
          type="pie"
          title="Subscription Tiers"
          description="Distribution by subscription level"
          data={analytics.bySubscription}
          dataKey="count"
          nameKey="tier"
          height={300}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Budget */}
        <AnalyticsChart
          type="pie"
          title="Budget Preferences"
          description="User budget range preferences"
          data={analytics.byBudget}
          dataKey="count"
          nameKey="budget"
          height={300}
        />

        {/* By Country */}
        <AnalyticsChart
          type="bar"
          title="Top Countries"
          description="Users by country"
          data={analytics.byCountry}
          dataKey="count"
          xAxisKey="country"
          layout="horizontal"
          height={300}
        />
      </div>

      {/* Additional Stat */}
      <StatsGrid
        stats={[
          {
            label: 'Avg Style Preferences',
            value: analytics.avgStylePreferences,
            description: 'Average number of style preferences per user',
          },
        ]}
        className="max-w-xs"
      />
    </div>
  );
}

