'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Crown, Star, Zap, Package } from 'lucide-react';
import { useQuery } from 'convex/react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/convex/_generated/api';
import {
  AnalyticsDateProvider,
  DateRangePicker,
  DateRangeLocked,
  useAnalyticsDate,
} from '@/components/admin/analytics';

const TIER_META = {
  basic:   { label: 'Basic',   icon: Package, color: 'text-muted-foreground border-border' },
  starter: { label: 'Starter', icon: Zap,     color: 'text-blue-600 border-blue-200 dark:border-blue-800' },
  growth:  { label: 'Growth',  icon: Star,    color: 'text-purple-600 border-purple-200 dark:border-purple-800' },
  premium: { label: 'Premium', icon: Crown,   color: 'text-amber-600 border-amber-200 dark:border-amber-800' },
};

const SUB_PAGE_TITLES: Record<string, string> = {
  revenue:    'Revenue',
  products:   'Products',
  engagement: 'Engagement',
  conversion: 'Conversion',
  customers:  'Customers',
};

function AnalyticsHeader() {
  const pathname = usePathname();
  const { dateRange, setDateRange } = useAnalyticsDate();

  const seller = useQuery(api.sellers.queries.getCurrentSeller);
  const tier = (seller?.tier ?? 'basic') as keyof typeof TIER_META;
  const tierInfo = TIER_META[tier];
  const TierIcon = tierInfo.icon;

  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const isSubPage = lastSegment !== 'analytics' && SUB_PAGE_TITLES[lastSegment];
  const pageTitle = isSubPage ? `${SUB_PAGE_TITLES[lastSegment]} Analytics` : 'Analytics';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div className="flex items-center gap-3">
        {isSubPage && (
          <Link href="/seller/analytics">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-serif font-semibold">{pageTitle}</h1>
          {!isSubPage && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Track your store performance and growth
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${tierInfo.color}`}
        >
          <TierIcon className="h-3 w-3" />
          {tierInfo.label} Plan
        </Badge>
        {tier !== 'premium' && (
          <Link href="/seller/billing">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Upgrade
            </Button>
          </Link>
        )}
        {tier === 'basic' ? (
          <DateRangeLocked upgradeHref="/seller/billing" />
        ) : (
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            maxDays={tier === 'starter' ? 30 : tier === 'growth' ? 90 : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default function SellerAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AnalyticsDateProvider>
      <div className="space-y-6">
        <AnalyticsHeader />
        {children}
      </div>
    </AnalyticsDateProvider>
  );
}
