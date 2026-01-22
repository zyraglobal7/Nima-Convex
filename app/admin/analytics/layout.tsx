'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AnalyticsDateProvider,
  DateRangePicker,
  useAnalyticsDate,
} from '@/components/admin/analytics';

function AnalyticsHeader() {
  const pathname = usePathname();
  const { dateRange, setDateRange } = useAnalyticsDate();
  const isDetailPage = pathname !== '/admin/analytics';

  // Get the current page name from the path
  const getPageTitle = () => {
    if (pathname === '/admin/analytics') return 'Analytics Dashboard';
    const segment = pathname.split('/').pop();
    if (!segment) return 'Analytics';
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Analytics';
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="flex items-center gap-3">
        {isDetailPage && (
          <Link href="/admin/analytics">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-serif font-semibold">{getPageTitle()}</h1>
          {!isDetailPage && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and analyze your platform metrics
            </p>
          )}
        </div>
      </div>
      <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
    </div>
  );
}

export default function AnalyticsLayout({
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

