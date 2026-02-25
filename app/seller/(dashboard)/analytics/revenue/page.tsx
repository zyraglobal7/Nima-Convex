'use client';

import { useQuery } from 'convex/react';
import { TrendingUp, ShoppingBag, DollarSign, Package, ArrowRight, Shirt, BarChart3, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  DataTable,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatKES(v: number) {
  return `KES ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function UpgradeGate({ requiredTier, currentTier }: { requiredTier: string; currentTier: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted p-12 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <TrendingUp className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Revenue Analytics</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          Track your daily revenue, orders, average order value, and more. Available on {requiredTier} and above.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="text-green-500">✓</span> Revenue over time chart
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-500">✓</span> Order history & details
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-500">✓</span> Average order value tracking
        </div>
      </div>
      <Link href="/seller/billing">
        <Button>
          Upgrade to {requiredTier}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const overview = useQuery(api.sellers.queries.getSellerOverviewStats, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });
  const revenueChart = useQuery(api.sellers.queries.getSellerRevenueChart);
  const orderItems = useQuery(api.sellers.queries.getSellerOrderItems, { limit: 50 });
  const premiumData = useQuery(api.sellers.queries.getPremiumAnalytics);

  const loading = overview === undefined;
  const tier = overview?.tier ?? 'basic';
  const isAllowed = tier === 'starter' || tier === 'growth' || tier === 'premium';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  if (!isAllowed) {
    return <UpgradeGate requiredTier="Starter" currentTier={tier} />;
  }

  const totalRevenue = overview?.totalRevenue ?? 0;
  const totalOrders = overview?.totalOrders ?? 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Format orders table
  const ordersData = (orderItems ?? []).map((o) => ({
    item: o.itemName,
    customer: o.customerName,
    amount: formatKES(o.lineTotal),
    qty: String(o.quantity),
    status: o.fulfillmentStatus,
    date: new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }));

  const chartData = (revenueChart ?? []).map((d) => ({
    ...d,
    date: d.date,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <StatsGrid
        stats={[
          {
            label: 'Total Revenue',
            value: formatKES(totalRevenue),
            description: 'All-time, non-cancelled orders',
          },
          {
            label: 'Total Orders',
            value: totalOrders,
            description: 'Unique customer orders',
          },
          {
            label: 'Avg. Order Value',
            value: formatKES(avgOrderValue),
            description: 'Revenue ÷ orders',
          },
          {
            label: 'Active Products',
            value: overview?.activeProducts ?? 0,
            description: `of ${overview?.totalProducts ?? 0} total products`,
          },
        ]}
      />

      {/* Revenue Chart */}
      {revenueChart === undefined ? (
        <Skeleton className="h-[340px] rounded-xl" />
      ) : chartData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Over Time
            </CardTitle>
            <CardDescription>
              {tier === 'starter' ? '30-day' : tier === 'growth' ? '90-day' : '365-day'} window
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-3">
              <DollarSign className="h-10 w-10 opacity-20" />
              <p>No revenue data yet. Revenue will appear here once you receive orders.</p>
              <Link href="/seller/products">
                <Button variant="outline" size="sm">
                  <Package className="mr-2 h-4 w-4" />
                  Manage your products
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AnalyticsChart
          type="area"
          title="Revenue Over Time"
          description={`${tier === 'starter' ? '30' : tier === 'growth' ? '90' : '365'}-day revenue trend`}
          data={chartData}
          dataKey="revenue"
          xAxisKey="date"
          height={300}
          formatXAxis={(v) => {
            try { return format(parseISO(v), 'MMM d'); } catch { return v; }
          }}
          formatTooltip={(v) => formatKES(v)}
        />
      )}

  ``

      {/* Recent Orders Table */}
      {orderItems === undefined ? (
        <Skeleton className="h-[300px] rounded-xl" />
      ) : ordersData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <ShoppingBag className="h-8 w-8 opacity-20" />
              <p>No orders yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Recent Orders
              </CardTitle>
              <CardDescription className="mt-1">
                Showing last {ordersData.length} order items
              </CardDescription>
            </div>
            <Link href="/seller/orders">
              <Button variant="outline" size="sm">
                All Orders
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Item</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="py-2 px-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ordersData.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Shirt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px] font-medium">{row.item}</span>
                          {row.qty !== '1' && (
                            <span className="text-xs text-muted-foreground">×{row.qty}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{row.customer}</td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">{row.amount}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={
                            row.status === 'delivered' ? 'default' :
                            row.status === 'shipped' ? 'secondary' :
                            row.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }
                          className="text-xs capitalize"
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground text-xs">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium: Day of Week + Seasonal (Premium only) */}
      {premiumData && (() => {
        const { dayOfWeek, seasonalHeatmap } = premiumData;
        const maxDayRevenue = Math.max(...dayOfWeek.map((d) => d.revenue), 0);
        const peakDay = maxDayRevenue > 0 ? dayOfWeek.find((d) => d.revenue === maxDayRevenue) : null;
        const maxSeasonalRevenue = Math.max(...seasonalHeatmap.map((m) => m.revenue), 0);
        const hasRevenue = dayOfWeek.some((d) => d.revenue > 0);

        return (
          <>
            {/* Day of Week */}
            {hasRevenue ? (
              <AnalyticsChart
                type="bar"
                title="Revenue by Day of Week"
                description={peakDay ? `${peakDay.day} is your biggest day` : 'Which days generate the most revenue'}
                data={dayOfWeek.map((d) => ({ name: d.day, count: d.revenue }))}
                dataKey="count"
                xAxisKey="name"
                height={220}
                formatTooltip={(v) => formatKES(v)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    Revenue by Day of Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  No revenue data yet.
                </CardContent>
              </Card>
            )}

            {/* Seasonal Heatmap + Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4" />
                  Monthly Snapshot
                </CardTitle>
                <CardDescription>Revenue intensity over the past 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {seasonalHeatmap.map((m) => {
                    const intensity = maxSeasonalRevenue > 0 ? m.revenue / maxSeasonalRevenue : 0;
                    const isMax = m.revenue === maxSeasonalRevenue && maxSeasonalRevenue > 0;
                    return (
                      <div
                        key={m.month}
                        title={`${m.month}: ${formatKES(m.revenue)} · ${m.orders} orders`}
                        className={`rounded-lg p-2.5 text-center transition-all ${isMax ? 'ring-1 ring-primary' : ''}`}
                        style={{
                          background: `color-mix(in srgb, var(--primary) ${Math.max(8, Math.round(intensity * 60))}%, var(--muted))`,
                        }}
                      >
                        <p className="text-xs font-medium truncate">{m.month.split(' ')[0]}</p>
                        <p className="text-xs text-muted-foreground">{m.orders} ord</p>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Darker = more revenue · Hover for details
                </div>
              </CardContent>
            </Card>

          </>
        );
      })()}
    </div>
  );
}
