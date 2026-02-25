'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Store,
  XCircle,
  MoreHorizontal,
  Crown,
  ChevronDown,
  ExternalLink,
  Search,
} from 'lucide-react';

type SellerTier = 'basic' | 'starter' | 'growth' | 'premium';
type TierFilter = SellerTier | 'all';

type SellerRow = {
  _id: Id<'sellers'>;
  shopName: string;
  slug: string;
  tier?: SellerTier;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  createdAt: number;
  activeSub?: {
    _id: Id<'seller_subscriptions'>;
    tier: 'starter' | 'growth' | 'premium';
    status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
    periodEnd?: number;
    amountKes: number;
    createdAt: number;
  };
};

const TIER_BADGE_STYLES: Record<SellerTier, string> = {
  basic: 'bg-muted text-muted-foreground border-muted',
  starter: 'bg-blue-100 text-blue-700 border-blue-200',
  growth: 'bg-purple-100 text-purple-700 border-purple-200',
  premium: 'bg-amber-100 text-amber-700 border-amber-200',
};

function TierBadge({ tier }: { tier?: SellerTier }) {
  const t = tier ?? 'basic';
  return (
    <Badge variant="outline" className={`capitalize ${TIER_BADGE_STYLES[t]}`}>
      {t === 'premium' && <Crown className="h-3 w-3 mr-1" />}
      {t}
    </Badge>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB');
}

function formatAmount(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

function isExpiringSoon(periodEnd?: number): boolean {
  if (!periodEnd) return false;
  return periodEnd <= Date.now() + 7 * 24 * 60 * 60 * 1000;
}

function SubscriptionStatusBadge({ seller }: { seller: SellerRow }) {
  const { activeSub } = seller;
  if (!activeSub) {
    return <Badge variant="outline" className="text-muted-foreground">Free</Badge>;
  }
  if (activeSub.status === 'active' && isExpiringSoon(activeSub.periodEnd)) {
    return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Expiring soon</Badge>;
  }
  if (activeSub.status === 'active') {
    return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
  }
  if (activeSub.status === 'expired') {
    return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Expired</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground capitalize">{activeSub.status}</Badge>;
}

function SubscriptionHistoryRow({ sellerId }: { sellerId: Id<'sellers'> }) {
  const history = useQuery(api.admin.queries.getSellerSubscriptionsAdmin, { sellerId });

  if (!history) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-4">
          Loading history...
        </TableCell>
      </TableRow>
    );
  }

  if (history.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-4">
          No subscription history.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow>
        <TableCell colSpan={6} className="bg-muted/30 px-4 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Subscription History
          </p>
        </TableCell>
      </TableRow>
      {history.map((sub) => (
        <TableRow key={sub._id} className="bg-muted/10 text-sm">
          <TableCell className="pl-8 text-muted-foreground">{formatDate(sub.createdAt)}</TableCell>
          <TableCell>
            <Badge variant="outline" className={`capitalize ${TIER_BADGE_STYLES[sub.tier]}`}>
              {sub.tier}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={
                sub.status === 'active'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : sub.status === 'expired' || sub.status === 'failed'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : sub.status === 'cancelled'
                  ? 'bg-orange-100 text-orange-700 border-orange-200'
                  : 'text-muted-foreground'
              }
            >
              {sub.status}
            </Badge>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {sub.periodEnd ? formatDate(sub.periodEnd) : '—'}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {formatAmount(sub.amountKes)}/mo
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  );
}

export default function AdminSellersPage() {
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<Id<'sellers'> | null>(null);

  const [overrideDialogSeller, setOverrideDialogSeller] = useState<SellerRow | null>(null);
  const [overrideTierValue, setOverrideTierValue] = useState<SellerTier>('basic');
  const [overridePending, setOverridePending] = useState(false);

  const [cancelDialogSeller, setCancelDialogSeller] = useState<SellerRow | null>(null);
  const [cancelMode, setCancelMode] = useState<'period-end' | 'immediate'>('period-end');
  const [cancelPending, setCancelPending] = useState(false);

  const sellersData = useQuery(api.admin.queries.listSellersAdmin, {
    tier: tierFilter === 'all' ? undefined : tierFilter,
    limit: 50,
  });

  const overrideSellerTier = useMutation(api.admin.sellers.overrideSellerTier);
  const cancelSellerSubscription = useMutation(api.admin.sellers.cancelSellerSubscription);

  function handleOpenOverride(seller: SellerRow) {
    setOverrideDialogSeller(seller);
    setOverrideTierValue(seller.tier ?? 'basic');
  }

  function handleOpenCancel(seller: SellerRow) {
    setCancelDialogSeller(seller);
    setCancelMode('period-end');
  }

  async function handleConfirmOverride() {
    if (!overrideDialogSeller) return;
    setOverridePending(true);
    try {
      await overrideSellerTier({ sellerId: overrideDialogSeller._id, tier: overrideTierValue });
      setOverrideDialogSeller(null);
    } finally {
      setOverridePending(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelDialogSeller?.activeSub) return;
    setCancelPending(true);
    try {
      await cancelSellerSubscription({
        subscriptionId: cancelDialogSeller.activeSub._id,
        immediate: cancelMode === 'immediate',
      });
      setCancelDialogSeller(null);
    } finally {
      setCancelPending(false);
    }
  }

  function toggleRowExpand(id: Id<'sellers'>) {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }

  const filteredSellers = (sellersData?.sellers ?? []).filter((s) =>
    search.trim() === '' || s.shopName.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Sellers</h1>
        <p className="text-muted-foreground mt-1">
          Manage seller accounts, override tiers, and cancel subscriptions. For billing stats and tier configuration, see{' '}
          <a href="/admin/billing" className="underline text-primary">Billing</a>.
        </p>
      </div>

      {/* Sellers table card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  All Sellers
                </CardTitle>
                <CardDescription className="mt-1">
                  {sellersData
                    ? `${filteredSellers.length} of ${sellersData.sellers.length} shown`
                    : 'Loading...'}
                </CardDescription>
              </div>

              <Select
                value={tierFilter}
                onValueChange={(val) => { setTierFilter(val as TierFilter); setSearch(''); }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by shop name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Shop Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Renews</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!sellersData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-5 bg-muted animate-pulse rounded w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {search.trim() ? `No sellers matching "${search}"` : 'No sellers found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSellers.map((seller) => (
                  <>
                    <TableRow
                      key={seller._id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggleRowExpand(seller._id)}
                    >
                      <TableCell className="pl-6 font-medium">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${
                              expandedRowId === seller._id ? 'rotate-180' : ''
                            }`}
                          />
                          <a
                            href={`/shop/${seller.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {seller.shopName}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        </div>
                      </TableCell>

                      <TableCell>
                        <TierBadge tier={seller.tier} />
                      </TableCell>

                      <TableCell>
                        <SubscriptionStatusBadge seller={seller} />
                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm">
                        {seller.activeSub?.periodEnd
                          ? formatDate(seller.activeSub.periodEnd)
                          : '—'}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm">
                        {seller.activeSub
                          ? `${formatAmount(seller.activeSub.amountKes)}/mo`
                          : '—'}
                      </TableCell>

                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenOverride(seller)}>
                              <Crown className="h-4 w-4 mr-2" />
                              Override Tier
                            </DropdownMenuItem>
                            {seller.activeSub && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleOpenCancel(seller)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Subscription
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {expandedRowId === seller._id && (
                      <SubscriptionHistoryRow key={`history-${seller._id}`} sellerId={seller._id} />
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>

          {sellersData?.hasMore && (
            <div className="flex justify-center py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing first 50 sellers. Use tier filter to narrow results.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Tier Dialog */}
      <Dialog
        open={overrideDialogSeller !== null}
        onOpenChange={(open) => { if (!open) setOverrideDialogSeller(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Tier</DialogTitle>
            <DialogDescription>
              Manually set the tier for{' '}
              <span className="font-semibold">{overrideDialogSeller?.shopName}</span>.
              This bypasses the subscription system.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm font-medium mb-2 block">New Tier</label>
            <Select
              value={overrideTierValue}
              onValueChange={(val) => setOverrideTierValue(val as SellerTier)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogSeller(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmOverride} disabled={overridePending}>
              {overridePending ? 'Saving...' : 'Confirm Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog
        open={cancelDialogSeller !== null}
        onOpenChange={(open) => { if (!open) setCancelDialogSeller(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Cancel the active subscription for{' '}
              <span className="font-semibold">{cancelDialogSeller?.shopName}</span>.
            </DialogDescription>
          </DialogHeader>

          {cancelDialogSeller?.activeSub && (
            <div className="py-2 space-y-3">
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <span className="font-medium capitalize">{cancelDialogSeller.activeSub.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatAmount(cancelDialogSeller.activeSub.amountKes)}/mo</span>
                </div>
                {cancelDialogSeller.activeSub.periodEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period ends</span>
                    <span className="font-medium">{formatDate(cancelDialogSeller.activeSub.periodEnd)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Cancellation mode</p>

                <button
                  type="button"
                  onClick={() => setCancelMode('period-end')}
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                    cancelMode === 'period-end'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <p className="font-medium">Cancel and keep until expiry</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Seller keeps access until{' '}
                    {cancelDialogSeller.activeSub.periodEnd
                      ? formatDate(cancelDialogSeller.activeSub.periodEnd)
                      : 'period end'}, then downgrades.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCancelMode('immediate')}
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                    cancelMode === 'immediate'
                      ? 'border-red-500 bg-red-50'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <p className="font-medium text-red-700">Cancel immediately (downgrade now)</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Seller loses paid-tier access right away and is moved to Basic.
                  </p>
                </button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogSeller(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelPending}
            >
              {cancelPending
                ? 'Cancelling...'
                : cancelMode === 'immediate'
                ? 'Cancel Immediately'
                : 'Cancel at Expiry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
