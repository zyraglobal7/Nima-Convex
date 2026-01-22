'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  AnalyticsChart,
  StatsGrid,
  useAnalyticsDate,
} from '@/components/admin/analytics';
import { Skeleton } from '@/components/ui/skeleton';

const formatSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    chat: 'Chat',
    apparel: 'Apparel Tab',
    recreated: 'Recreated',
    shared: 'Received',
    system: 'System',
  };
  return labels[source] || source;
};

export default function LooksAnalyticsPage() {
  const { startTimestamp, endTimestamp } = useAnalyticsDate();

  const analytics = useQuery(api.admin.analytics.getLooksAnalytics, {
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
          { label: 'Total Looks', value: analytics.total },
          { label: 'Saved', value: analytics.saved, description: 'User kept' },
          { label: 'Discarded', value: analytics.discarded, description: 'User removed' },
          { label: 'Generation Success', value: `${analytics.generationSuccessRate}%` },
        ]}
      />

      <StatsGrid
        stats={[
          { label: 'Public Looks', value: analytics.publicLooks, description: 'Shared on Explore' },
          { label: 'Shared with Friends', value: analytics.sharedWithFriends },
          { label: 'Pending', value: analytics.pending, description: 'Awaiting user action' },
          { label: 'Avg Items/Look', value: analytics.avgItemsPerLook },
        ]}
      />

      {/* Creation Source Stats */}
      <StatsGrid
        stats={[
          { label: 'Created in Chat', value: analytics.chatCreated, description: 'Via AI conversation' },
          { label: 'Created via Apparel', value: analytics.apparelCreated, description: 'Create a Look feature' },
          { label: 'Recreated Looks', value: analytics.recreatedLooks, description: 'From other users' },
          { label: 'Received via Messages', value: analytics.sharedLooks, description: 'Sent by friends' },
        ]}
      />

      {/* Trend Chart */}
      <AnalyticsChart
        type="area"
        title="Looks Created Over Time"
        description="Daily look creation"
        data={analytics.trend}
        dataKey="count"
        height={300}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Status */}
        <AnalyticsChart
          type="pie"
          title="Looks by Status"
          description="Saved vs Discarded vs Pending"
          data={analytics.byStatus}
          dataKey="count"
          nameKey="status"
          height={300}
        />

        {/* By Creation Source */}
        <AnalyticsChart
          type="pie"
          title="Looks by Creation Source"
          description="How looks are created"
          data={analytics.byCreationSource.map(item => ({
            ...item,
            source: formatSourceLabel(item.source)
          }))}
          dataKey="count"
          nameKey="source"
          height={300}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Occasion */}
        <AnalyticsChart
          type="pie"
          title="Looks by Occasion"
          description="Distribution by occasion"
          data={analytics.byOccasion.slice(0, 8)}
          dataKey="count"
          nameKey="occasion"
          height={300}
        />
      </div>

      {/* Style Tags */}
      <AnalyticsChart
        type="bar"
        title="Top Style Tags"
        description="Most common style tags in looks"
        data={analytics.byStyleTag}
        dataKey="count"
        xAxisKey="tag"
        layout="horizontal"
        height={350}
      />
    </div>
  );
}

