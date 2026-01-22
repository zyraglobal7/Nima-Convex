'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';

export default function SocialAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getSocialAnalytics, {
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
          { label: 'Total Friendships', value: analytics.totalFriendships, description: 'In selected period' },
          { label: 'Accepted', value: analytics.acceptedFriendships },
          { label: 'Pending Requests', value: analytics.pendingRequests },
          { label: 'Avg Friends/User', value: analytics.avgFriendsPerUser },
        ]}
      />

      <StatsGrid
        stats={[
          { label: 'Direct Messages Sent', value: analytics.directMessagesSent },
          { label: 'Messages Read', value: analytics.directMessagesRead },
          {
            label: 'Read Rate',
            value: analytics.directMessagesSent > 0
              ? `${Math.round((analytics.directMessagesRead / analytics.directMessagesSent) * 100)}%`
              : '0%',
          },
        ]}
        className="max-w-2xl"
      />

      {/* Friendship Trend */}
      <AnalyticsChart
        type="area"
        title="Friend Requests Over Time"
        description="Daily friendship activity"
        data={analytics.friendshipTrend}
        dataKey="count"
        height={300}
      />

      {/* Message Trend */}
      <AnalyticsChart
        type="area"
        title="Direct Messages Over Time"
        description="Daily look sharing activity"
        data={analytics.messageTrend}
        dataKey="count"
        height={300}
      />

      {/* By Status */}
      <AnalyticsChart
        type="pie"
        title="Friendships by Status"
        description="Accepted vs Pending"
        data={analytics.byStatus}
        dataKey="count"
        nameKey="status"
        height={300}
        className="max-w-lg"
      />
    </div>
  );
}

