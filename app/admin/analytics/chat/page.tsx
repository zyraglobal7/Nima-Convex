'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getChatAnalytics, {
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
          { label: 'Total Threads', value: analytics.totalThreads },
          { label: 'Total Messages', value: analytics.totalMessages },
          { label: 'User Messages', value: analytics.userMessages },
          { label: 'Assistant Messages', value: analytics.assistantMessages },
        ]}
      />

      <StatsGrid
        stats={[
          {
            label: 'Avg Messages/Thread',
            value: analytics.avgMessagesPerThread,
            description: 'Conversation depth',
          },
        ]}
        className="max-w-xs"
      />

      {/* Thread Trend */}
      <AnalyticsChart
        type="area"
        title="New Threads Over Time"
        description="Daily chat thread creation"
        data={analytics.threadTrend}
        dataKey="count"
        height={300}
      />

      {/* Message Trend */}
      <AnalyticsChart
        type="area"
        title="Messages Over Time"
        description="Daily message volume"
        data={analytics.messageTrend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Context Type */}
        <AnalyticsChart
          type="pie"
          title="Threads by Context"
          description="Distribution by conversation context"
          data={analytics.byContextType}
          dataKey="count"
          nameKey="context"
          height={300}
        />

        {/* By Message Type */}
        <AnalyticsChart
          type="pie"
          title="Messages by Type"
          description="Distribution of message types"
          data={analytics.byMessageType}
          dataKey="count"
          nameKey="type"
          height={300}
        />
      </div>
    </div>
  );
}

