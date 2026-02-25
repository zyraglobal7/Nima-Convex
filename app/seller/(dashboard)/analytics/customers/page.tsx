'use client';

import { useQuery } from 'convex/react';
import {
  Users,
  ArrowRight,
  CheckCircle2,
  Crown,
  BarChart3,
  TrendingUp,
  DollarSign,
  UserCheck,
  Repeat2,
} from 'lucide-react';
import Link from 'next/link';

import { api } from '@/convex/_generated/api';
import { StatsGrid } from '@/components/admin/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

function UpgradeGate({ currentTier }: { currentTier: string }) {
  const isGrowth = currentTier === 'growth';

  return (
    <div className="rounded-xl border-2 border-amber-200/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 p-12 flex flex-col items-center text-center gap-5">
      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
        <Crown className="h-7 w-7 text-amber-600" />
      </div>
      <div>
        <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
          Customer Loyalty Analytics
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Premium</Badge>
        </h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          Understand who keeps coming back — repeat buyer rate, loyalty score, and first-time vs returning buyer breakdown.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md text-sm">
        {[
          { icon: Repeat2, text: 'Repeat buyer rate & loyalty score' },
          { icon: UserCheck, text: 'First-time vs returning buyers' },
          { icon: Users, text: 'Total unique buyer count' },
          { icon: BarChart3, text: 'Contextual growth coaching' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 bg-background rounded-lg border p-3 text-left">
            <Icon className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs">{text}</span>
          </div>
        ))}
      </div>
      <div>
        <Link href="/seller/billing">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            Upgrade to Premium — KES 30,000/mo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        {!isGrowth && (
          <p className="text-xs text-muted-foreground mt-2">
            Currently on Basic.{' '}
            <Link href="/seller/billing" className="text-primary hover:underline">
              View all plans →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function CustomersAnalyticsPage() {
  const data = useQuery(api.sellers.queries.getPremiumAnalytics);
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  const tier = seller?.tier ?? 'basic';
  const isPremium = tier === 'premium';

  if (!isPremium) {
    return <UpgradeGate currentTier={tier} />;
  }

  const loading = data === undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No data available yet.
      </div>
    );
  }

  const { repeatBuyerRate, totalBuyers, repeatBuyers } = data;
  const firstTimeBuyers = totalBuyers - repeatBuyers;

  return (
    <div className="space-y-6">
      {/* Premium badge header */}
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <Crown className="h-5 w-5" />
        <h2 className="text-base font-semibold">Customer Loyalty</h2>
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Premium</Badge>
      </div>

      {/* Stats */}
      <StatsGrid
        stats={[
          {
            label: 'Repeat Buyer Rate',
            value: `${repeatBuyerRate}%`,
            description: `${repeatBuyers} of ${totalBuyers} customers returned`,
          },
          {
            label: 'Total Unique Buyers',
            value: totalBuyers,
            description: 'Distinct customers who ordered',
          },
          {
            label: 'First-time Buyers',
            value: firstTimeBuyers,
            description: 'Customers who ordered once',
          },
        ]}
      />

      {/* Loyalty Score Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-amber-200/40 dark:border-amber-800/40 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Loyalty Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">
              {repeatBuyerRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {repeatBuyers} of {totalBuyers} buyers returned
            </p>
            <Progress value={repeatBuyerRate} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-amber-200/40 dark:border-amber-800/40 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">What this means</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {repeatBuyerRate >= 30 ? (
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Excellent loyalty.</strong> Over 1 in 3 customers comes back. Focus on new customer acquisition to accelerate growth.
                </span>
              </div>
            ) : repeatBuyerRate >= 15 ? (
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Growing loyalty.</strong> Good retention — introduce a loyalty programme or personalised follow-ups to push this higher.
                </span>
              </div>
            ) : totalBuyers === 0 ? (
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>No buyer data yet. Revenue will start showing here once you receive orders.</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Early stage.</strong> Most buyers are first-time. Consider bundle deals or post-purchase campaigns to drive repeat purchases.
                </span>
              </div>
            )}
            {totalBuyers > 0 && (
              <div className="flex gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{totalBuyers} unique buyers across all products.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* First-time vs Repeat breakdown */}
      {totalBuyers > 0 && (
        <Card className="border-amber-200/40 dark:border-amber-800/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat2 className="h-4 w-4" />
              Buyer Breakdown
            </CardTitle>
            <CardDescription>First-time vs returning customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: 'First-time buyers',
                value: firstTimeBuyers,
                pct: totalBuyers > 0 ? Math.round((firstTimeBuyers / totalBuyers) * 100) : 0,
                color: 'bg-blue-500',
              },
              {
                label: 'Returning buyers',
                value: repeatBuyers,
                pct: repeatBuyerRate,
                color: 'bg-amber-500',
              },
            ].map(({ label, value, pct, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                    <span className="font-semibold tabular-nums w-8 text-right">{value}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
