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

export default function CartAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getCartAnalytics, {
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

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <StatsGrid
        stats={[
          { label: 'Cart Additions', value: analytics.totalItems, description: 'Items added to carts' },
          { label: 'Total Quantity', value: analytics.totalQuantity },
          { label: 'Total Value', value: formatCurrency(analytics.totalValue) },
          { label: 'Unique Carts', value: analytics.uniqueCarts, description: 'Users with cart items' },
        ]}
      />

      <StatsGrid
        stats={[
          { label: 'Avg Items/Cart', value: analytics.avgItemsPerCart },
          { label: 'Avg Cart Value', value: formatCurrency(analytics.avgCartValue) },
        ]}
        className="max-w-md"
      />

      {/* Trend Chart */}
      <AnalyticsChart
        type="area"
        title="Cart Activity Over Time"
        description="Items added to carts daily"
        data={analytics.trend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Category */}
        <AnalyticsChart
          type="pie"
          title="Cart Items by Category"
          description="Distribution of carted items"
          data={analytics.byCategory}
          dataKey="count"
          nameKey="category"
          height={300}
        />

        {/* Top Carted Items */}
        <AnalyticsChart
          type="bar"
          title="Top Carted Items"
          description="Most added items"
          data={analytics.topCartedItems.slice(0, 5)}
          dataKey="count"
          xAxisKey="name"
          layout="horizontal"
          height={300}
          formatXAxis={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
        />
      </div>

      {/* Top Carted Items Table */}
      {analytics.topCartedItems.length > 0 && (
        <DataTable
          title="Top Carted Items"
          description="Items most frequently added to carts"
          data={analytics.topCartedItems}
          columns={[
            { key: 'name', header: 'Item' },
            { key: 'count', header: 'Times Added', format: (v) => Number(v).toLocaleString() },
          ]}
        />
      )}
    </div>
  );
}

