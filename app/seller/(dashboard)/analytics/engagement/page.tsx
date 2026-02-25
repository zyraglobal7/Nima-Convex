'use client';

import { useQuery } from 'convex/react';
import {
  Eye,
  Heart,
  Shirt,
  Bookmark,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

import { api } from '@/convex/_generated/api';
import { AnalyticsChart, StatsGrid, useAnalyticsDate } from '@/components/admin/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function UpgradeGate() {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted p-12 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Eye className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Engagement Analytics</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          Understand how customers interact with your products — views, saves, try-ons, and lookbook saves. Available on Starter and above.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Views, saves & try-on trends</div>
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Category distribution chart</div>
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Try-on → purchase performance</div>
      </div>
      <Link href="/seller/billing">
        <Button>
          Upgrade to Starter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

export default function EngagementAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const data = useQuery(api.sellers.queries.getSellerEngagementTrend, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  const loading = data === undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[280px] rounded-xl" />
          <Skeleton className="h-[280px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data?.allowed) {
    return <UpgradeGate />;
  }

  const {
    totalViews,
    totalSaves,
    totalTryOns,
    totalLookbookSaves,
    categoryBreakdown,
  } = data;

  const totalEngagement = totalViews + totalSaves + totalTryOns + totalLookbookSaves;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid
        stats={[
          {
            label: 'Total Views',
            value: totalViews,
            description: 'Product page views',
          },
          {
            label: 'Total Saves',
            value: totalSaves,
            description: 'Wishlist & favourite saves',
          },
          {
            label: 'Virtual Try-ons',
            value: totalTryOns,
            description: 'AI try-on sessions',
          },
          {
            label: 'Lookbook Saves',
            value: totalLookbookSaves,
            description: 'Saved to lookbooks',
          },
        ]}
      />

      {/* Engagement breakdown bar */}
      {totalEngagement > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Engagement Breakdown</CardTitle>
            <CardDescription>Share of each engagement type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Views', value: totalViews, icon: Eye, color: 'bg-blue-500' },
              { label: 'Saves', value: totalSaves, icon: Heart, color: 'bg-rose-500' },
              { label: 'Try-ons', value: totalTryOns, icon: Shirt, color: 'bg-purple-500' },
              { label: 'Lookbook Saves', value: totalLookbookSaves, icon: Bookmark, color: 'bg-amber-500' },
            ].map(({ label, value, icon: Icon, color }) => {
              const pct = totalEngagement > 0 ? Math.round((value / totalEngagement) * 100) : 0;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      <span className="font-semibold tabular-nums w-14 text-right">{value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 ? (
        <AnalyticsChart
          type="pie"
          title="Views by Category"
          description="Which product categories get the most attention"
          data={categoryBreakdown.map((c) => ({ name: c.name, count: c.count }))}
          dataKey="count"
          nameKey="name"
          height={280}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No category data yet.
          </CardContent>
        </Card>
      )}

      {/* Category table */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Engagement by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Views</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categoryBreakdown.map((c) => {
                    const pct = totalViews > 0 ? Math.round((c.count / totalViews) * 100) : 0;
                    return (
                      <tr key={c.category} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">{c.name}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{c.count.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
