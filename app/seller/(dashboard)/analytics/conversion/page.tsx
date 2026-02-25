'use client';

import { useQuery } from 'convex/react';
import {
  Eye,
  Heart,
  ShoppingCart,
  MousePointerClick,
  ArrowRight,
  ArrowDown,
  TrendingUp,
  Shirt,
  Star,
  DollarSign,
  Megaphone,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { api } from '@/convex/_generated/api';
import { StatsGrid } from '@/components/admin/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatKES(v: number) {
  return `KES ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function funnelPct(n: number, d: number) {
  if (d === 0) return 0;
  return Math.min(100, Math.round((n / d) * 100));
}

function UpgradeGate() {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted p-12 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <TrendingUp className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Conversion Analytics</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          See exactly where shoppers drop off — from first view to purchase. Identify your best-converting products and categories. Available on Growth and above.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Visual conversion funnel</div>
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Category revenue breakdown</div>
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Top converting products</div>
        <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Try-on → purchase rate</div>
      </div>
      <Link href="/seller/billing">
        <Button>
          Upgrade to Growth
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// Visual funnel component
function ConversionFunnelViz({
  funnel,
}: {
  funnel: { views: number; saves: number; cartAdds: number; purchases: number };
}) {
  const steps = [
    {
      label: 'Views',
      value: funnel.views,
      icon: Eye,
      bgColor: 'bg-blue-500',
      bgMuted: 'bg-blue-100 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
      width: 100,
      dropFrom: null,
    },
    {
      label: 'Saves',
      value: funnel.saves,
      icon: Heart,
      bgColor: 'bg-rose-500',
      bgMuted: 'bg-rose-100 dark:bg-rose-950/40',
      textColor: 'text-rose-600 dark:text-rose-400',
      width: Math.max(10, funnelPct(funnel.saves, funnel.views)),
      dropFrom: funnelPct(funnel.saves, funnel.views),
    },
    {
      label: 'Cart Adds',
      value: funnel.cartAdds,
      icon: ShoppingCart,
      bgColor: 'bg-amber-500',
      bgMuted: 'bg-amber-100 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
      width: Math.max(8, funnelPct(funnel.cartAdds, funnel.views)),
      dropFrom: funnelPct(funnel.cartAdds, funnel.saves),
    },
    {
      label: 'Purchases',
      value: funnel.purchases,
      icon: MousePointerClick,
      bgColor: 'bg-green-500',
      bgMuted: 'bg-green-100 dark:bg-green-950/40',
      textColor: 'text-green-600 dark:text-green-400',
      width: Math.max(6, funnelPct(funnel.purchases, funnel.views)),
      dropFrom: funnelPct(funnel.purchases, funnel.cartAdds),
    },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const prevStep = i > 0 ? steps[i - 1] : null;
        const dropOffPct = prevStep && step.dropFrom !== null ? 100 - step.dropFrom : null;

        return (
          <div key={step.label} className="space-y-1">
            {/* Drop-off indicator between steps */}
            {i > 0 && dropOffPct !== null && dropOffPct > 0 && (
              <div className="flex items-center gap-2 py-1 px-2">
                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">
                  {dropOffPct}% dropped off ({(prevStep!.value - step.value).toLocaleString()} users)
                </span>
              </div>
            )}

            {/* Funnel bar */}
            <div className="flex items-center gap-3">
              <div
                className={`h-11 rounded-lg flex items-center justify-between px-4 transition-all ${step.bgMuted}`}
                style={{ width: `${step.width}%` }}
              >
                <div className={`flex items-center gap-2 ${step.textColor}`}>
                  <div className={`w-6 h-6 rounded-full ${step.bgColor} flex items-center justify-center`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium text-sm">{step.label}</span>
                </div>
                <span className="font-bold tabular-nums text-sm">{step.value.toLocaleString()}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {i === 0 ? '100%' : `${funnelPct(step.value, funnel.views)}% of views`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ConversionAnalyticsPage() {
  const data = useQuery(api.sellers.queries.getSellerConversionData);
  const premiumData = useQuery(api.sellers.queries.getPremiumAnalytics);
  const cartInsights = useQuery(api.sellers.queries.getSellerCartInsights);

  const loading = data === undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
        <Skeleton className="h-[280px] rounded-xl" />
      </div>
    );
  }

  if (!data?.allowed) {
    return <UpgradeGate />;
  }

  const { funnel, tryOnToPurchaseRate, topConvertingProducts } = data;
  const overallCvr = funnel.views > 0 ? funnelPct(funnel.purchases, funnel.views) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid
        stats={[
          {
            label: 'Overall Conversion Rate',
            value: `${overallCvr}%`,
            description: 'Views → Purchases',
          },
          {
            label: 'Try-on → Purchase Rate',
            value: `${tryOnToPurchaseRate}%`,
            description: 'Of try-ons led to purchase',
          },
          {
            label: 'Cart → Purchase Rate',
            value: `${funnel.cartAdds > 0 ? funnelPct(funnel.purchases, funnel.cartAdds) : 0}%`,
            description: 'Of cart adds completed',
          },
          {
            label: 'Save → Purchase Rate',
            value: `${funnel.saves > 0 ? funnelPct(funnel.purchases, funnel.saves) : 0}%`,
            description: 'Of saves led to purchase',
          },
        ]}
      />

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>
            How shoppers move from discovery to purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {funnel.views === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <TrendingUp className="h-8 w-8 opacity-20" />
              <p>No data yet. Views will appear once customers visit your products.</p>
            </div>
          ) : (
            <ConversionFunnelViz funnel={funnel} />
          )}
        </CardContent>
      </Card>

      {/* Top converting products */}
      {topConvertingProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Converting Products
            </CardTitle>
            <CardDescription>Products with the highest view → purchase conversion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Price</th>
                    <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Views</th>
                    <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Purchases</th>
                    <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">CVR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topConvertingProducts.map((p, idx) => (
                    <tr key={p._id} className={`hover:bg-muted/30 transition-colors ${idx === 0 ? 'bg-green-50/50 dark:bg-green-950/20' : ''}`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{idx + 1}</span>
                          <div className="w-8 h-8 rounded-md bg-muted overflow-hidden shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                          {idx === 0 && <Badge variant="outline" className="text-xs text-green-600 border-green-400 shrink-0">Best CVR</Badge>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground tabular-nums">{formatKES(p.price)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{p.views.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium">{p.purchases.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-bold tabular-nums ${idx === 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {p.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium: Price Sensitivity */}
      {premiumData && premiumData.priceBuckets.length > 0 && (() => {
        const { priceBuckets } = premiumData;
        const maxBucketCvr = Math.max(...priceBuckets.map((b) => b.avgConversionRate));
        const bestBucket = maxBucketCvr > 0 ? priceBuckets.find((b) => b.avgConversionRate === maxBucketCvr) : null;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Price Sensitivity
              </CardTitle>
              <CardDescription>
                {bestBucket
                  ? `${bestBucket.label} converts best at ${bestBucket.avgConversionRate}% CVR`
                  : 'Which price ranges convert best'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {priceBuckets.map((bucket) => {
                  const isBest = bucket.avgConversionRate === maxBucketCvr && maxBucketCvr > 0;
                  const relWidth = maxBucketCvr > 0 ? (bucket.avgConversionRate / maxBucketCvr) * 100 : 0;
                  return (
                    <div
                      key={bucket.label}
                      className={`rounded-xl border p-4 transition-colors ${
                        isBest
                          ? 'border-green-400/50 bg-green-50/50 dark:bg-green-950/20'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{bucket.label}</span>
                          {isBest && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-400">
                              Best CVR
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm">{bucket.avgConversionRate}%</span>
                          <span className="text-xs text-muted-foreground ml-1">CVR</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all ${isBest ? 'bg-green-500' : 'bg-primary/60'}`}
                          style={{ width: `${relWidth}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{bucket.productCount} product{bucket.productCount !== 1 ? 's' : ''}</span>
                        <span>{formatKES(bucket.totalRevenue)} revenue</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Premium: Cart Intelligence */}
      {cartInsights && (() => {
        const { totalCartValue, totalCartItems, uniqueShoppers, topCartProducts } = cartInsights;

        return (
          <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 pt-2">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="text-base font-semibold">Live Cart Intelligence</h3>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Premium</Badge>
            </div>

            {/* Summary stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Cart Value',
                  value: formatKES(totalCartValue),
                  description: 'Sitting in active carts right now',
                  icon: DollarSign,
                },
                {
                  label: 'Items in Carts',
                  value: totalCartItems,
                  description: 'Units across all shoppers',
                  icon: ShoppingCart,
                },
                {
                  label: 'Active Shoppers',
                  value: uniqueShoppers,
                  description: 'People with your items in cart',
                  icon: Users,
                },
              ].map(({ label, value, description, icon: Icon }) => (
                <Card key={label} className="border-amber-200/40 dark:border-amber-800/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Nudge tip */}
            {totalCartValue > 0 && (
              <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 p-4 flex gap-3">
                <Megaphone className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    {formatKES(totalCartValue)} is waiting to be converted
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {uniqueShoppers} shopper{uniqueShoppers !== 1 ? 's' : ''} have your items saved to cart but haven't checked out.
                    Consider running a limited-time discount or targeted ad to push them over the line.
                  </p>
                </div>
              </div>
            )}

            {/* Top products in carts */}
            {topCartProducts.length > 0 && (
              <Card className="border-amber-200/40 dark:border-amber-800/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-4 w-4" />
                    Products in Active Carts
                  </CardTitle>
                  <CardDescription>Ranked by total cart value — these are your best ad targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Product</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Price</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">In Carts</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Cart Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {topCartProducts.map((p, idx) => (
                          <tr key={p._id} className={`hover:bg-muted/30 transition-colors ${idx === 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{idx + 1}</span>
                                <div className="w-8 h-8 rounded-md bg-muted overflow-hidden shrink-0">
                                  {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                                {idx === 0 && <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 shrink-0">Top</Badge>}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs text-muted-foreground tabular-nums">{formatKES(p.price)}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-medium">{p.cartCount}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                              {formatKES(p.cartValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {totalCartValue === 0 && (
              <Card className="border-amber-200/40 dark:border-amber-800/40">
                <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                  <ShoppingCart className="h-8 w-8 opacity-20" />
                  <p>No products in active carts yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}
    </div>
  );
}
