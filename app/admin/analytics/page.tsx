'use client';

import { useQuery } from 'convex/react';
import {
  Sparkles,
  Users,
  Heart,
  UserPlus,
  ShoppingCart,
  MessageSquare,
  Wand2,
  TrendingUp,
} from 'lucide-react';

import { api } from '@/convex/_generated/api';
import { MetricCard, MetricCardSkeleton, useAnalyticsDate } from '@/components/admin/analytics';

export default function AnalyticsDashboard() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const summary = useQuery(api.admin.analytics.getAnalyticsSummary, {
    startDate: startTimestamp,
    endDate: endTimestamp,
  });

  if (!summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Item Try-Ons"
        value={summary.tryOns.total}
        subtitle={`${summary.tryOns.successRate}% success rate`}
        icon={Wand2}
        href="/admin/analytics/try-ons"
        trend={summary.tryOns.trend}
        trendDirection={
          summary.tryOns.total > 0 ? (summary.tryOns.successRate >= 80 ? 'up' : 'neutral') : 'neutral'
        }
      />

      <MetricCard
        title="Looks Created"
        value={summary.looks.total}
        subtitle={`${summary.looks.saved} saved, ${summary.looks.discarded} discarded`}
        icon={Sparkles}
        href="/admin/analytics/looks"
        trend={summary.looks.trend}
      />

      <MetricCard
        title="Users"
        value={summary.users.total}
        subtitle={`${summary.users.newInPeriod} new, ${summary.users.activeInPeriod} active`}
        icon={Users}
        href="/admin/analytics/users"
        trend={summary.users.trend}
        trendDirection={summary.users.newInPeriod > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Saves"
        value={summary.saves.total}
        subtitle={`${summary.saves.lookbooksCreated} lookbooks created`}
        icon={Heart}
        href="/admin/analytics/saves"
        trend={summary.saves.trend}
      />

      <MetricCard
        title="Social Activity"
        value={summary.social.friendships}
        subtitle={`${summary.social.directMessages} DMs sent`}
        icon={UserPlus}
        href="/admin/analytics/social"
        trend={summary.social.trend}
      />

      <MetricCard
        title="Cart Activity"
        value={summary.cart.totalItems}
        subtitle={`$${(summary.cart.totalValue / 100).toFixed(2)} total value`}
        icon={ShoppingCart}
        href="/admin/analytics/cart"
        trend={summary.cart.trend}
      />

      <MetricCard
        title="Chat Messages"
        value={summary.chat.messages}
        subtitle={`${summary.chat.threads} threads`}
        icon={MessageSquare}
        href="/admin/analytics/chat"
        trend={summary.chat.trend}
      />

      <MetricCard
        title="Engagement"
        value={summary.users.activeInPeriod}
        subtitle="Active users in period"
        icon={TrendingUp}
        href="/admin/analytics/users"
        trend={summary.users.trend}
        trendDirection={summary.users.activeInPeriod > 0 ? 'up' : 'neutral'}
      />
    </div>
  );
}

