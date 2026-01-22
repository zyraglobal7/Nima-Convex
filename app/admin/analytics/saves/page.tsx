'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  DataTable,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';

export default function SavesAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getSavesAnalytics, {
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
          { label: 'Total Saves', value: analytics.total },
          { label: 'Looks Saved', value: analytics.looksSaved },
          { label: 'Items Saved', value: analytics.itemsSaved },
          { label: 'Lookbooks Created', value: analytics.lookbooksCreated },
        ]}
      />

      <StatsGrid
        stats={[
          {
            label: 'Avg Items per Lookbook',
            value: analytics.avgItemsPerLookbook,
            description: 'Average collection size',
          },
        ]}
        className="max-w-xs"
      />

      {/* Trend Chart */}
      <AnalyticsChart
        type="area"
        title="Saves Over Time"
        description="Daily save activity"
        data={analytics.trend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Category */}
        <AnalyticsChart
          type="pie"
          title="Saves by Category"
          description="Item saves by category"
          data={analytics.byCategory}
          dataKey="count"
          nameKey="category"
          height={300}
        />

        {/* Top Saved Items */}
        <AnalyticsChart
          type="bar"
          title="Top Saved Items"
          description="Most saved items"
          data={analytics.topSavedItems.slice(0, 5)}
          dataKey="count"
          xAxisKey="name"
          layout="horizontal"
          height={300}
          formatXAxis={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
        />
      </div>

      {/* Top Saved Looks Table */}
      {analytics.topSavedLooks.length > 0 && (
        <DataTable
          title="Top Saved Looks"
          description="Most popular looks saved by users"
          data={analytics.topSavedLooks}
          columns={[
            { key: 'name', header: 'Look' },
            { key: 'count', header: 'Save Count', format: (v) => Number(v).toLocaleString() },
          ]}
        />
      )}

      {/* Top Saved Items Table */}
      {analytics.topSavedItems.length > 0 && (
        <DataTable
          title="Top Saved Items"
          description="Most popular items saved by users"
          data={analytics.topSavedItems}
          columns={[
            { key: 'name', header: 'Item' },
            { key: 'count', header: 'Save Count', format: (v) => Number(v).toLocaleString() },
          ]}
        />
      )}
    </div>
  );
}

