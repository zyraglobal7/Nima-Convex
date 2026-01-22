'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  href: string;
  trend?: Array<{ date: string; count: number }>;
  trendDirection?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  trend,
  trendDirection = 'neutral',
  trendValue,
  className,
}: MetricCardProps) {
  // Calculate trend direction from data if not provided
  const calculatedTrend = React.useMemo(() => {
    if (trendDirection !== 'neutral') return trendDirection;
    if (!trend || trend.length < 2) return 'neutral';

    const midPoint = Math.floor(trend.length / 2);
    const firstHalf = trend.slice(0, midPoint);
    const secondHalf = trend.slice(midPoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, item) => sum + item.count, 0) / (firstHalf.length || 1);
    const secondHalfAvg =
      secondHalf.reduce((sum, item) => sum + item.count, 0) / (secondHalf.length || 1);

    if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
    return 'neutral';
  }, [trend, trendDirection]);

  const TrendIcon =
    calculatedTrend === 'up'
      ? ArrowUpRight
      : calculatedTrend === 'down'
        ? ArrowDownRight
        : Minus;

  const trendColor =
    calculatedTrend === 'up'
      ? 'text-green-600'
      : calculatedTrend === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground';

  const sparklineColor =
    calculatedTrend === 'up'
      ? '#16a34a'
      : calculatedTrend === 'down'
        ? '#dc2626'
        : '#6b7280';

  return (
    <Link href={href} className="block">
      <Card
        className={cn(
          'transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer group',
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </CardTitle>
          {Icon && (
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              {(subtitle || trendValue) && (
                <div className="flex items-center gap-2">
                  {trendValue && (
                    <span className={cn('flex items-center text-xs font-medium', trendColor)}>
                      <TrendIcon className="h-3 w-3 mr-0.5" />
                      {trendValue}
                    </span>
                  )}
                  {subtitle && (
                    <span className="text-xs text-muted-foreground">{subtitle}</span>
                  )}
                </div>
              )}
            </div>

            {trend && trend.length > 0 && (
              <div className="h-12 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={sparklineColor}
                      strokeWidth={1.5}
                      fill={`url(#gradient-${title})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Skeleton for loading state
export function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-12 w-24 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

