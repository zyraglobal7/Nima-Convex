'use client';

import { useQuery } from 'convex/react';
import {
  Users,
  ArrowRight,
  CheckCircle2,
  Crown,
  BarChart3,
  TrendingUp,
  UserCheck,
  Repeat2,
  Zap,
  ShoppingBag,
  Palette,
  Wallet,
  UserCircle2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

import { api } from '@/convex/_generated/api';
import { StatsGrid } from '@/components/admin/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────────────────────────────────────
// Upgrade gates
// ─────────────────────────────────────────────────────────────────────────────

function DemographicsUpgradeGate() {
  return (
    <div className="rounded-xl border-2 border-[--border] bg-[--surface] p-10 flex flex-col items-center text-center gap-5">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Users className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-base flex items-center justify-center gap-2">
          Customer Demographics
          <Badge variant="outline" className="text-xs border-primary/40 text-primary">Starter</Badge>
        </h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          Understand who buys from you — gender, age, budget range, and style preferences of your real customers.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs text-sm">
        {[
          { icon: UserCircle2, text: 'Gender breakdown' },
          { icon: Calendar,    text: 'Age distribution' },
          { icon: Wallet,      text: 'Buyer budgets' },
          { icon: Palette,     text: 'Style preferences' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 bg-background rounded-lg border p-2.5 text-left">
            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs">{text}</span>
          </div>
        ))}
      </div>
      <Link href="/seller/billing">
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Upgrade to Starter — KES 5,000/mo
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

function LoyaltyUpgradeGate({ currentTier }: { currentTier: string }) {
  const isGrowth = currentTier === 'growth';
  return (
    <div className="rounded-xl border-2 border-amber-200/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 p-10 flex flex-col items-center text-center gap-5">
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
        <Crown className="h-6 w-6 text-amber-600" />
      </div>
      <div>
        <h3 className="font-semibold text-base flex items-center justify-center gap-2">
          Customer Loyalty
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Premium</Badge>
        </h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          Understand who keeps coming back — repeat buyer rate, loyalty score, and first-time vs returning buyer breakdown.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs text-sm">
        {[
          { icon: Repeat2,   text: 'Repeat buyer rate & loyalty score' },
          { icon: UserCheck, text: 'First-time vs returning buyers' },
          { icon: Users,     text: 'Total unique buyer count' },
          { icon: BarChart3, text: 'Contextual growth coaching' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 bg-background rounded-lg border p-2.5 text-left">
            <Icon className="h-3.5 w-3.5 text-amber-600 shrink-0" />
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
            <Link href="/seller/billing" className="text-primary hover:underline">
              View all plans →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demographics section components
// ─────────────────────────────────────────────────────────────────────────────

type DemographicsData = {
  totalBuyers: number;
  gender: { male: number; female: number; preferNotToSay: number; unknown: number };
  ageBuckets: Array<{ label: string; count: number; pct: number }>;
  budgetBreakdown: { low: number; mid: number; premium: number; unknown: number };
  topStyles: Array<{ style: string; count: number; pct: number }>;
};

const GENDER_CONFIG = [
  { key: 'female' as const,        label: 'Women',          color: 'bg-rose-400',    textColor: 'text-rose-500' },
  { key: 'male' as const,          label: 'Men',            color: 'bg-sky-400',     textColor: 'text-sky-500' },
  { key: 'preferNotToSay' as const, label: 'Prefer not to say', color: 'bg-violet-400', textColor: 'text-violet-500' },
  { key: 'unknown' as const,       label: 'Not specified',  color: 'bg-muted',       textColor: 'text-muted-foreground' },
];

const BUDGET_CONFIG = [
  { key: 'low' as const,     label: 'Budget',   sublabel: 'Value-conscious',    color: 'bg-emerald-400', textColor: 'text-emerald-600' },
  { key: 'mid' as const,     label: 'Mid-range', sublabel: 'Balanced quality',  color: 'bg-amber-400',   textColor: 'text-amber-600' },
  { key: 'premium' as const, label: 'Premium',  sublabel: 'Quality first',      color: 'bg-violet-400',  textColor: 'text-violet-600' },
];

const AGE_COLORS = [
  'bg-pink-400', 'bg-rose-400', 'bg-orange-400',
  'bg-amber-400', 'bg-lime-400', 'bg-teal-400',
];


function GenderCard({ gender, totalBuyers }: { gender: DemographicsData['gender']; totalBuyers: number }) {
  const rows = GENDER_CONFIG.map((g) => ({ ...g, value: gender[g.key] })).filter((g) => g.value > 0);
  const known = rows.reduce((s, g) => s + g.value, 0);

  // Donut via stacked horizontal bar
  const segments = rows.map((g) => ({ ...g, pct: known > 0 ? (g.value / known) * 100 : 0 }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-primary" />
          Gender
        </CardTitle>
        <CardDescription className="text-xs">Who shops from you</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {totalBuyers === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No buyer data yet</p>
        ) : (
          <>
            {/* Segmented bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
              {segments.map((s) => (
                <div
                  key={s.key}
                  className={`${s.color} transition-all`}
                  style={{ width: `${s.pct}%` }}
                  title={`${s.label}: ${s.pct.toFixed(0)}%`}
                />
              ))}
            </div>
            {/* Legend rows */}
            <div className="space-y-2.5">
              {segments.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="text-muted-foreground text-xs">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium tabular-nums ${s.textColor}`}>{s.pct.toFixed(0)}%</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-5 text-right">{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Insight */}
            {segments.length > 0 && (() => {
              const topPct = segments[0].pct;
              const tied = segments.filter((s) => s.pct === topPct);
              const isTie = tied.length > 1;
              return (
                <p className="text-xs text-muted-foreground border-t pt-3 leading-relaxed">
                  {isTie
                    ? `Mixed audience — ${tied.map((s) => s.label.toLowerCase()).join(' and ')} buyers are equally represented. Consider campaigns that speak to both.`
                    : topPct > 60
                    ? `Predominantly ${segments[0].label.toLowerCase()} audience — tailor your visuals and copy to resonate with them.`
                    : `${segments[0].label} lead your buyer base at ${topPct.toFixed(0)}%.`}
                </p>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AgeCard({ ageBuckets, totalBuyers }: { ageBuckets: DemographicsData['ageBuckets']; totalBuyers: number }) {
  const maxPct = Math.max(...ageBuckets.map((b) => b.pct), 1);
  const dominant = ageBuckets[0];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Age Range
        </CardTitle>
        <CardDescription className="text-xs">Buyer age distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {totalBuyers === 0 || ageBuckets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No age data yet</p>
        ) : (
          <>
            {ageBuckets.map((bucket, i) => (
              <div key={bucket.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14 shrink-0 tabular-nums">{bucket.label}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded ${AGE_COLORS[i % AGE_COLORS.length]} transition-all`}
                      style={{ width: `${(bucket.pct / maxPct) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums w-8 text-right">{bucket.pct}%</span>
                </div>
              </div>
            ))}
            {ageBuckets.length > 0 && (() => {
              const topPct = ageBuckets[0].pct;
              const tied = ageBuckets.filter((b) => b.pct === topPct);
              const isTie = tied.length > 1;
              return (
                <p className="text-xs text-muted-foreground border-t pt-3 leading-relaxed">
                  {isTie
                    ? `Your buyers are evenly spread across ${tied.map((b) => b.label).join(', ')} — a broad age appeal across your range.`
                    : <>Your core audience is <strong className="text-foreground">{ageBuckets[0].label}</strong> — consider stocking styles that appeal to this age group.</>}
                </p>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetCard({ budgetBreakdown, totalBuyers }: { budgetBreakdown: DemographicsData['budgetBreakdown']; totalBuyers: number }) {
  const known = budgetBreakdown.low + budgetBreakdown.mid + budgetBreakdown.premium;
  const rows = BUDGET_CONFIG.map((b) => ({
    ...b,
    value: budgetBreakdown[b.key],
    pct: known > 0 ? Math.round((budgetBreakdown[b.key] / known) * 100) : 0,
  })).filter((b) => b.value > 0);

  const dominant = [...rows].sort((a, b) => b.value - a.value)[0];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Spending Power
        </CardTitle>
        <CardDescription className="text-xs">Buyer budget preferences</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {totalBuyers === 0 || rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No budget data yet</p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
              {rows.map((b) => (
                <div
                  key={b.key}
                  className={`${b.color} transition-all`}
                  style={{ width: `${b.pct}%` }}
                  title={`${b.label}: ${b.pct}%`}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="space-y-2.5">
              {rows.map((b) => (
                <div key={b.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${b.color}`} />
                    <div>
                      <p className="text-xs font-medium">{b.label}</p>
                      <p className="text-[10px] text-muted-foreground">{b.sublabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold tabular-nums ${b.textColor}`}>{b.pct}%</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-5 text-right">{b.value}</span>
                  </div>
                </div>
              ))}
            </div>
            {rows.length > 0 && (() => {
              const topValue = rows[0].value;
              const tied = rows.filter((b) => b.value === topValue);
              const isTie = tied.length > 1;
              return (
                <p className="text-xs text-muted-foreground border-t pt-3 leading-relaxed">
                  {isTie
                    ? `Buyers are evenly split across ${tied.map((b) => b.label.toLowerCase()).join(' and ')} — versatile pricing across ranges will serve your audience well.`
                    : dominant.key === 'premium'
                    ? 'Premium buyers lead — lean into quality storytelling and high-end visuals.'
                    : dominant.key === 'mid'
                    ? 'Mid-range shoppers dominate — balance value and quality in your pricing.'
                    : 'Budget-conscious buyers are your majority — value deals and bundles work well.'}
                </p>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StylesCard({ topStyles, totalBuyers }: { topStyles: DemographicsData['topStyles']; totalBuyers: number }) {
  const maxPct = Math.max(...topStyles.map((s) => s.pct), 1);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          Style Preferences
        </CardTitle>
        <CardDescription className="text-xs">% of your buyers who prefer each style</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {totalBuyers === 0 || topStyles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No style data yet</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {topStyles.map((s, i) => {
                // Shared rank: count how many items before this have a higher pct
                const rank = topStyles.filter((o) => o.pct > s.pct).length + 1;
                return (
                <div key={s.style} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-muted-foreground/50 w-3 tabular-nums shrink-0">#{rank}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium">{s.style}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{s.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${(s.pct / maxPct) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            {(() => {
              const topPct = topStyles[0].pct;
              const tied = topStyles.filter((s) => s.pct === topPct);
              const isTie = tied.length > 1;
              return (
                <p className="text-xs text-muted-foreground border-t pt-3 leading-relaxed">
                  {isTie
                    ? <>{tied.map((s) => <strong key={s.style} className="text-foreground">{s.style}</strong>).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])} are equally popular — {topPct}% of your buyers prefer each.</>
                    : <><strong className="text-foreground">{topStyles[0].style}</strong> is your top style — {topPct}% of your buyers prefer it.</>}
                </p>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DemographicsSection({ data }: { data: DemographicsData }) {
  const { totalBuyers } = data;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Customer Demographics</h2>
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary px-1.5">Starter</Badge>
        </div>
        {totalBuyers > 0 && (
          <p className="text-xs text-muted-foreground">
            Based on <strong className="text-foreground">{totalBuyers}</strong> unique buyer{totalBuyers !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {totalBuyers === 0 ? (
        <Card className="bg-[--surface]">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">No orders yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Demographics will appear once customers start purchasing from your store.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GenderCard gender={data.gender} totalBuyers={totalBuyers} />
          <AgeCard ageBuckets={data.ageBuckets} totalBuyers={totalBuyers} />
          <BudgetCard budgetBreakdown={data.budgetBreakdown} totalBuyers={totalBuyers} />
          <StylesCard topStyles={data.topStyles} totalBuyers={totalBuyers} />
        </div>
      )}
    </div>
  );
}

function DemographicsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-5 w-44 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersAnalyticsPage() {
  const demographics = useQuery(api.sellers.queries.getSellerDemographics);
  const premiumData = useQuery(api.sellers.queries.getPremiumAnalytics);
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  const tier = seller?.tier ?? 'basic';
  const isStarter = ['starter', 'growth', 'premium'].includes(tier);
  const isPremium = tier === 'premium';

  const pageLoading = seller === undefined;

  if (pageLoading) {
    return (
      <div className="space-y-10">
        <DemographicsSkeleton />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10">

      {/* ── Demographics (Starter+) ── */}
      {!isStarter ? (
        <DemographicsUpgradeGate />
      ) : demographics === undefined ? (
        <DemographicsSkeleton />
      ) : demographics === null ? (
        <DemographicsUpgradeGate />
      ) : (
        <DemographicsSection data={demographics} />
      )}

      {/* ── Divider ── */}
      <div className="border-t border-[--border]" />

      {/* ── Customer Loyalty (Premium only) ── */}
      {!isPremium ? (
        <LoyaltyUpgradeGate currentTier={tier} />
      ) : premiumData === undefined ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-[260px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      ) : !premiumData ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No loyalty data available yet.
        </div>
      ) : (
        <LoyaltySection data={premiumData} />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loyalty section (Premium only)
// ─────────────────────────────────────────────────────────────────────────────

type PremiumData = {
  repeatBuyerRate: number;
  totalBuyers: number;
  repeatBuyers: number;
};

function LoyaltySection({ data }: { data: PremiumData }) {
  const { repeatBuyerRate, totalBuyers, repeatBuyers } = data;
  const firstTimeBuyers = totalBuyers - repeatBuyers;

  return (
    <div className="space-y-6">
      {/* Premium badge header */}
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <Crown className="h-4 w-4" />
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
              <TrendingUp className="h-4 w-4" />
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
                color: 'bg-sky-500',
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
