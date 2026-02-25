'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import {
  Package,
  Eye,
  Heart,
  ShoppingCart,
  MousePointerClick,
  Shirt,
  Bookmark,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

import { api } from '@/convex/_generated/api';
import { AnalyticsChart, useAnalyticsDate } from '@/components/admin/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type SortKey = 'views' | 'saves' | 'tryOns' | 'cartAdds' | 'purchases' | 'lookbookSaves';
type SortDir = 'asc' | 'desc';

function formatKES(v: number) {
  return `KES ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function UpgradeGate({ requiredTier }: { requiredTier: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted p-12 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Package className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Product Analytics</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          See exactly which products are getting the most views, saves, and try-ons. Available on {requiredTier} and above.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Full product engagement table</div>
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Sort by any metric</div>
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Top 10 bar chart</div>
      </div>
      <Link href="/seller/billing">
        <Button>
          Upgrade to {requiredTier}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function SortHeader({
  label,
  icon: Icon,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  icon: React.ElementType;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  const SortIcon = active ? (currentDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <th
      className={`py-2.5 px-3 text-right font-medium cursor-pointer select-none transition-colors hover:text-foreground ${active ? 'text-foreground' : 'text-muted-foreground'}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-end gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{label}</span>
        <SortIcon className={`h-3 w-3 ${active ? 'text-primary' : ''}`} />
      </div>
    </th>
  );
}

const VALID_SORT_KEYS: SortKey[] = ['views', 'saves', 'tryOns', 'cartAdds', 'purchases', 'lookbookSaves'];

export default function ProductsAnalyticsPage() {
  const searchParams = useSearchParams();
  const rawSort = searchParams.get('sort') as SortKey | null;
  const initialSort: SortKey = rawSort && VALID_SORT_KEYS.includes(rawSort) ? rawSort : 'views';

  const [sortBy, setSortBy] = useState<SortKey>(initialSort);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const data = useQuery(api.sellers.queries.getProductEngagementBreakdown, { sortBy });

  const loading = data === undefined;
  const tier = data?.tier ?? 'basic';
  const isStarter = tier === 'starter' || tier === 'growth' || tier === 'premium';
  const isGrowth = tier === 'growth' || tier === 'premium';

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  }

  // Sort client-side for direction toggle (the query already sorts by key)
  const products = data?.products ?? [];
  const sorted = sortDir === 'asc' ? [...products].reverse() : products;

  // Top 10 bar chart data for current sort metric
  const top10 = sorted.slice(0, 10).map((p) => {
    const val =
      sortBy === 'views' ? p.viewCount :
      sortBy === 'saves' ? p.saveCount :
      sortBy === 'tryOns' ? (p.tryOnCount ?? 0) :
      sortBy === 'cartAdds' ? (p.cartAddCount ?? 0) :
      sortBy === 'purchases' ? (p.purchaseCount ?? 0) :
      (p.lookbookSaveCount ?? 0);
    return { name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, count: val };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (!isStarter) {
    return <UpgradeGate requiredTier="Starter" />;
  }

  const totalViews = products.reduce((s, p) => s + p.viewCount, 0);
  const totalSaves = products.reduce((s, p) => s + p.saveCount, 0);
  const totalTryOns = products.reduce((s, p) => s + (p.tryOnCount ?? 0), 0);
  const totalCartAdds = isGrowth ? products.reduce((s, p) => s + (p.cartAddCount ?? 0), 0) : null;

  const sortLabel: Record<SortKey, string> = {
    views: 'Views',
    saves: 'Saves',
    tryOns: 'Try-ons',
    cartAdds: 'Cart Adds',
    purchases: 'Purchases',
    lookbookSaves: 'Lookbook Saves',
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">{products.filter(p => p.isActive).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" />Total Saves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSaves.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Shirt className="h-3.5 w-3.5" />Try-ons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTryOns.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Bar Chart */}
      {top10.length > 0 && (
        <AnalyticsChart
          type="bar"
          title={`Top Products by ${sortLabel[sortBy]}`}
          description={`Your best-performing products ranked by ${sortLabel[sortBy].toLowerCase()}`}
          data={top10}
          dataKey="count"
          xAxisKey="name"
          layout="horizontal"
          height={Math.max(280, top10.length * 36)}
        />
      )}

      {/* Full Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              All Products
            </CardTitle>
            <CardDescription className="mt-1">
              {sorted.length} products · Click a column header to sort
              {!isGrowth && (
                <span className="ml-2 text-xs">
                  · <Link href="/seller/billing" className="text-primary hover:underline">Upgrade to Growth</Link> for cart & purchase data
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {(['views', 'saves', 'tryOns', ...(isGrowth ? ['cartAdds', 'purchases'] as SortKey[] : [])] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    sortBy === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  {sortLabel[key]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <Package className="h-8 w-8 opacity-20" />
              <p>No products yet.</p>
              <Link href="/seller/products">
                <Button variant="outline" size="sm">Add your first product</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Price</th>
                    <SortHeader label="Views" icon={Eye} sortKey="views" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Saves" icon={Heart} sortKey="saves" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Try-ons" icon={Shirt} sortKey="tryOns" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Lookbook" icon={Bookmark} sortKey="lookbookSaves" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                    {isGrowth && (
                      <>
                        <SortHeader label="Cart" icon={ShoppingCart} sortKey="cartAdds" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                        <SortHeader label="Purchases" icon={MousePointerClick} sortKey="purchases" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground text-xs">CVR%</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((p, idx) => {
                    const isTop = idx === 0;
                    return (
                      <tr
                        key={p._id}
                        className={`hover:bg-muted/30 transition-colors ${isTop ? 'bg-primary/5' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-xs text-muted-foreground tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-muted overflow-hidden shrink-0 relative">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              )}
                              {!p.isActive && (
                                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                                  <XCircle className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                            {isTop && <Badge variant="outline" className="text-xs text-primary border-primary/40 shrink-0">Top</Badge>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground text-xs tabular-nums">{formatKES(p.price)}</td>
                        <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${sortBy === 'views' ? 'text-primary' : ''}`}>
                          {p.viewCount.toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${sortBy === 'saves' ? 'text-primary' : ''}`}>
                          {p.saveCount.toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-3 text-right tabular-nums ${sortBy === 'tryOns' ? 'font-medium text-primary' : ''}`}>
                          {p.tryOnCount !== undefined ? p.tryOnCount.toLocaleString() : '—'}
                        </td>
                        <td className={`py-2.5 px-3 text-right tabular-nums ${sortBy === 'lookbookSaves' ? 'font-medium text-primary' : ''}`}>
                          {p.lookbookSaveCount !== undefined ? p.lookbookSaveCount.toLocaleString() : '—'}
                        </td>
                        {isGrowth && (
                          <>
                            <td className={`py-2.5 px-3 text-right tabular-nums ${sortBy === 'cartAdds' ? 'font-medium text-primary' : ''}`}>
                              {p.cartAddCount !== undefined ? p.cartAddCount.toLocaleString() : '—'}
                            </td>
                            <td className={`py-2.5 px-3 text-right tabular-nums ${sortBy === 'purchases' ? 'font-medium text-primary' : ''}`}>
                              {p.purchaseCount !== undefined ? p.purchaseCount.toLocaleString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-xs text-muted-foreground">
                              {p.conversionRate !== undefined ? `${p.conversionRate}%` : '—'}
                            </td>
                          </>
                        )}
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={p.isActive ? 'default' : 'outline'} className="text-xs">
                            {p.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
