'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import {
  TrendingUp,
  ShoppingBag,
  Eye,
  Heart,
  MousePointerClick,
  Users,
  Lock,
  ArrowRight,
  Zap,
  Star,
  Crown,
  Package,
  Shirt,
  BarChart3,
} from 'lucide-react';

import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard, MetricCardSkeleton, useAnalyticsDate } from '@/components/admin/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerTier = 'basic' | 'starter' | 'growth' | 'premium';

const UPGRADE_CONFIG: Record<SellerTier, {
  nextTier: string;
  nextIcon: React.ElementType;
  nextColor: string;
  price: string;
  perks: string[];
} | null> = {
  basic: {
    nextTier: 'Starter',
    nextIcon: Zap,
    nextColor: 'text-blue-600',
    price: 'KES 5,000/mo',
    perks: ['Revenue charts', 'Product views & try-ons', 'Top 5 products ranking'],
  },
  starter: {
    nextTier: 'Growth',
    nextIcon: Star,
    nextColor: 'text-purple-600',
    price: 'KES 15,000/mo',
    perks: ['Conversion funnel', 'Cart & purchase analytics', 'Category revenue breakdown'],
  },
  growth: {
    nextTier: 'Premium',
    nextIcon: Crown,
    nextColor: 'text-amber-600',
    price: 'KES 30,000/mo',
    perks: ['Repeat buyer rate', 'Day-of-week patterns', 'Price sensitivity insights', '12-month seasonal trends'],
  },
  premium: null,
};

// ─── Locked Card ──────────────────────────────────────────────────────────────

function LockedMetricCard({
  title,
  requiredTier,
  icon: Icon,
  currentTier,
}: {
  title: string;
  requiredTier: string;
  icon: React.ElementType;
  currentTier: SellerTier;
}) {
  const upgradeConfig = UPGRADE_CONFIG[currentTier];
  return (
    <Card className="relative overflow-hidden border-dashed opacity-75">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground/40" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-muted-foreground/30 select-none">—</div>
        <div className="flex items-center gap-1.5 mt-1">
          <Lock className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground/70">{requiredTier}+ only</span>
        </div>
        {upgradeConfig && (
          <Link href="/seller/billing">
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-7 text-xs w-full"
            >
              Upgrade to {upgradeConfig.nextTier}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Upgrade Banner ────────────────────────────────────────────────────────────

function UpgradeBanner({ tier }: { tier: SellerTier }) {
  const config = UPGRADE_CONFIG[tier];
  if (!config) return null;

  const Icon = config.nextIcon;

  return (
    <div className="rounded-xl border bg-gradient-to-r from-muted/50 to-muted/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shrink-0">
          <Icon className={`h-5 w-5 ${config.nextColor}`} />
        </div>
        <div>
          <p className="font-semibold text-sm">Unlock {config.nextTier} analytics — {config.price}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.perks.join(' · ')}
          </p>
        </div>
      </div>
      <Link href="/seller/billing" className="shrink-0">
        <Button size="sm" className="w-full sm:w-auto">
          View Plans
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Quick Nav Cards (sub-pages) ──────────────────────────────────────────────

function SubPageNav({ tier }: { tier: SellerTier }) {
  const isStarter = tier === 'starter' || tier === 'growth' || tier === 'premium';
  const isGrowth = tier === 'growth' || tier === 'premium';
  const isPremium = tier === 'premium';

  const pages = [
    {
      href: '/seller/analytics/revenue',
      icon: TrendingUp,
      label: 'Revenue',
      description: 'Sales trends & order history',
      unlocked: isStarter,
      required: 'Starter',
    },
    {
      href: '/seller/analytics/products',
      icon: Package,
      label: 'Products',
      description: 'Engagement by product',
      unlocked: isStarter,
      required: 'Starter',
    },
    {
      href: '/seller/analytics/engagement',
      icon: Eye,
      label: 'Engagement',
      description: 'Views, saves & try-ons',
      unlocked: isStarter,
      required: 'Starter',
    },
    {
      href: '/seller/analytics/conversion',
      icon: BarChart3,
      label: 'Conversion',
      description: 'Funnel & conversion rates',
      unlocked: isGrowth,
      required: 'Growth',
    },
    {
      href: '/seller/analytics/customers',
      icon: Users,
      label: 'Customers',
      description: 'Buyer patterns & loyalty',
      unlocked: isPremium,
      required: 'Premium',
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Drill-down Reports
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {pages.map((page) => {
          const Icon = page.icon;
          if (!page.unlocked) {
            return (
              <div
                key={page.href}
                className="flex items-center gap-3 rounded-lg border border-dashed p-4 opacity-50 cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{page.label}</p>
                  <p className="text-xs text-muted-foreground">{page.required}+ only</p>
                </div>
              </div>
            );
          }
          return (
            <Link key={page.href} href={page.href}>
              <div className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer group">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{page.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{page.description}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SellerAnalyticsOverview() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const stats = useQuery(api.sellers.queries.getSellerOverviewStats, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  const loading = stats === undefined;
  const tier = (stats?.tier ?? 'basic') as SellerTier;

  const isStarter = tier === 'starter' || tier === 'growth' || tier === 'premium';
  const isGrowth = tier === 'growth' || tier === 'premium';
  const isPremium = tier === 'premium';

  return (
    <div className="space-y-8">
      {/* Upgrade Banner */}
      {!loading && <UpgradeBanner tier={tier} />}

      {/* KPI Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Store Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Saves — links to products page sorted by saves */}
          {loading ? (
            <MetricCardSkeleton />
          ) : (
            <MetricCard
              title="Total Saves"
              value={stats?.totalSaves ?? 0}
              subtitle={isStarter ? "See which products" : `Across ${stats?.activeProducts ?? 0} active products`}
              icon={Heart}
              href={isStarter ? "/seller/analytics/products?sort=saves" : "/seller/analytics/products"}
              trend={stats?.savesSparkline?.map((d) => ({ date: d.date, count: d.count }))}
            />
          )}

          {/* Revenue — dedicated revenue page */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isStarter ? (
            <MetricCard
              title="Total Revenue"
              value={`KES ${(stats?.totalRevenue ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`}
              subtitle={`${stats?.totalOrders ?? 0} orders`}
              icon={TrendingUp}
              href="/seller/analytics/revenue"
              trend={stats?.revenueSparkline?.map((d) => ({ date: d.date, count: d.count }))}
              trendDirection={(stats?.totalRevenue ?? 0) > 0 ? 'up' : 'neutral'}
            />
          ) : (
            <LockedMetricCard
              title="Total Revenue"
              requiredTier="Starter"
              icon={TrendingUp}
              currentTier={tier}
            />
          )}

          {/* Orders — revenue page */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isStarter ? (
            <MetricCard
              title="Total Orders"
              value={stats?.totalOrders ?? 0}
              subtitle="See order history"
              icon={ShoppingBag}
              href="/seller/analytics/revenue"
            />
          ) : (
            <LockedMetricCard
              title="Total Orders"
              requiredTier="Starter"
              icon={ShoppingBag}
              currentTier={tier}
            />
          )}

          {/* Views — products page sorted by views */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isStarter ? (
            <MetricCard
              title="Product Views"
              value={stats?.totalViews ?? 0}
              subtitle="See which products"
              icon={Eye}
              href="/seller/analytics/products?sort=views"
              trend={stats?.viewsSparkline?.map((d) => ({ date: d.date, count: d.count }))}
            />
          ) : (
            <LockedMetricCard
              title="Product Views"
              requiredTier="Starter"
              icon={Eye}
              currentTier={tier}
            />
          )}

          {/* Try-ons — products page sorted by try-ons */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isStarter ? (
            <MetricCard
              title="Virtual Try-ons"
              value={stats?.totalTryOns ?? 0}
              subtitle="See which products"
              icon={Shirt}
              href="/seller/analytics/products?sort=tryOns"
            />
          ) : (
            <LockedMetricCard
              title="Virtual Try-ons"
              requiredTier="Starter"
              icon={Shirt}
              currentTier={tier}
            />
          )}

          {/* Conversion Rate — conversion funnel page */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isGrowth ? (
            <MetricCard
              title="Conversion Rate"
              value={`${stats?.conversionRate ?? 0}%`}
              subtitle="Views → purchases funnel"
              icon={MousePointerClick}
              href="/seller/analytics/conversion"
              trendDirection={(stats?.conversionRate ?? 0) > 3 ? 'up' : 'neutral'}
            />
          ) : (
            <LockedMetricCard
              title="Conversion Rate"
              requiredTier="Growth"
              icon={MousePointerClick}
              currentTier={tier}
            />
          )}

          {/* Cart Adds — products sorted by cart adds */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isGrowth ? (
            <MetricCard
              title="Cart Adds"
              value={stats?.totalCartAdds ?? 0}
              subtitle="See which products"
              icon={ShoppingBag}
              href="/seller/analytics/products?sort=cartAdds"
            />
          ) : (
            <LockedMetricCard
              title="Cart Adds"
              requiredTier="Growth"
              icon={ShoppingBag}
              currentTier={tier}
            />
          )}

          {/* Purchases — products sorted by purchases */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isGrowth ? (
            <MetricCard
              title="Total Purchases"
              value={stats?.totalPurchases ?? 0}
              subtitle="See which products"
              icon={MousePointerClick}
              href="/seller/analytics/products?sort=purchases"
            />
          ) : (
            <LockedMetricCard
              title="Total Purchases"
              requiredTier="Growth"
              icon={MousePointerClick}
              currentTier={tier}
            />
          )}

          {/* Repeat Buyer Rate — customers page */}
          {loading ? (
            <MetricCardSkeleton />
          ) : isPremium ? (
            <MetricCard
              title="Repeat Buyer Rate"
              value={`${stats?.repeatBuyerRate ?? 0}%`}
              subtitle="Customers who returned"
              icon={Users}
              href="/seller/analytics/customers"
              trendDirection={(stats?.repeatBuyerRate ?? 0) > 15 ? 'up' : 'neutral'}
            />
          ) : (
            <LockedMetricCard
              title="Repeat Buyer Rate"
              requiredTier="Premium"
              icon={Users}
              currentTier={tier}
            />
          )}
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
        </div>
      )}

      {/* Sub-page navigation */}
      {!loading && stats && <SubPageNav tier={tier} />}
    </div>
  );
}
