'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  AnalyticsChart,
  StatsGrid,
  DataTable,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EventFilter = 'all' | 'item_added_to_cart' | 'item_purchased';

export default function ConnectAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');

  const partners = useQuery(api.connect.queries.getPartnersAdmin);

  const analytics = useQuery(api.admin.analytics.getConnectConversionAnalytics, {
    startDate: startTimestamp,
    endDate: endTimestamp,
    partnerId:
      selectedPartnerId !== 'all'
        ? (selectedPartnerId as Id<'api_partners'>)
        : undefined,
    eventFilter: eventFilter === 'all' ? undefined : eventFilter,
  });

  const isLoading = !analytics || !partners;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  const { summary, byPartner, trend, topProductsByCart, topProductsByPurchase } = analytics;

  const formatValue = (v: number) =>
    v > 0 ? `KES ${(v / 100).toLocaleString()}` : '—';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Partners</SelectItem>
            {partners.map((p) => (
              <SelectItem key={p._id} value={p._id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as EventFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="item_added_to_cart">Added to Cart</SelectItem>
            <SelectItem value="item_purchased">Purchased</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <StatsGrid
        stats={[
          {
            label: 'Try-Ons',
            value: summary.totalTryOns.toLocaleString(),
            description: 'Items tried on via Connect',
          },
          {
            label: 'Added to Cart',
            value: summary.totalCartAdds.toLocaleString(),
            description: `${summary.cartConversionRate}% of try-ons`,
          },
          {
            label: 'Purchased',
            value: summary.totalPurchases.toLocaleString(),
            description: `${summary.purchaseConversionRate}% of try-ons`,
          },
          {
            label: 'Purchase Value',
            value: formatValue(summary.totalPurchaseValue),
            description: `Cart value: ${formatValue(summary.totalCartValue)}`,
          },
        ]}
      />

      {/* Trend Chart */}
      <AnalyticsChart
        type="line"
        title="Conversion Funnel Over Time"
        description="Daily try-ons, cart adds, and purchases from Connect widget"
        data={trend}
        dataKey="tryOns"
        xAxisKey="date"
        height={300}
      />

      {/* Per-Partner Breakdown */}
      {byPartner.length > 0 && (
        <DataTable
          title="Performance by Partner"
          description="Try-on → cart → purchase funnel per merchant"
          data={byPartner}
          columns={[
            { key: 'partnerName', header: 'Partner' },
            { key: 'tryOns', header: 'Try-Ons', format: (v) => Number(v).toLocaleString() },
            { key: 'cartAdds', header: 'Cart Adds', format: (v) => Number(v).toLocaleString() },
            {
              key: 'cartConversionRate',
              header: 'Cart Rate',
              format: (v) => `${v}%`,
            },
            { key: 'purchases', header: 'Purchases', format: (v) => Number(v).toLocaleString() },
            {
              key: 'purchaseConversionRate',
              header: 'Purchase Rate',
              format: (v) => `${v}%`,
            },
            {
              key: 'purchaseValue',
              header: 'Purchase Value',
              format: (v) => (Number(v) > 0 ? `KES ${(Number(v) / 100).toLocaleString()}` : '—'),
            },
          ]}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products by Cart */}
        <AnalyticsChart
          type="bar"
          title="Top Products — Added to Cart"
          description="Products most often added to cart after a try-on"
          data={topProductsByCart.slice(0, 10)}
          dataKey="count"
          xAxisKey="productId"
          layout="horizontal"
          height={320}
          formatXAxis={(v) => (String(v).length > 18 ? String(v).slice(0, 18) + '…' : String(v))}
        />

        {/* Top Products by Purchase */}
        <AnalyticsChart
          type="bar"
          title="Top Products — Purchased"
          description="Products most often purchased after a try-on"
          data={topProductsByPurchase.slice(0, 10)}
          dataKey="count"
          xAxisKey="productId"
          layout="horizontal"
          height={320}
          formatXAxis={(v) => (String(v).length > 18 ? String(v).slice(0, 18) + '…' : String(v))}
        />
      </div>

      {/* Detailed product tables */}
      {topProductsByCart.length > 0 && (
        <DataTable
          title="Cart Adds by Product"
          description="Products added to cart after try-on, with total cart value"
          data={topProductsByCart}
          columns={[
            { key: 'productId', header: 'Product ID' },
            { key: 'count', header: 'Cart Adds', format: (v) => Number(v).toLocaleString() },
            {
              key: 'totalValue',
              header: 'Total Value',
              format: (v) => (Number(v) > 0 ? `KES ${(Number(v) / 100).toLocaleString()}` : '—'),
            },
          ]}
        />
      )}

      {topProductsByPurchase.length > 0 && (
        <DataTable
          title="Purchases by Product"
          description="Products purchased after try-on, with total revenue"
          data={topProductsByPurchase}
          columns={[
            { key: 'productId', header: 'Product ID' },
            { key: 'count', header: 'Purchases', format: (v) => Number(v).toLocaleString() },
            {
              key: 'totalValue',
              header: 'Total Revenue',
              format: (v) => (Number(v) > 0 ? `KES ${(Number(v) / 100).toLocaleString()}` : '—'),
            },
          ]}
        />
      )}
    </div>
  );
}
