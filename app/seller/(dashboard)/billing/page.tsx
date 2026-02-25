'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Check,
  X,
  Crown,
  Star,
  Zap,
  Shield,
  CreditCard,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ============================================================
// TIER DEFINITIONS
// ============================================================

type TierKey = 'basic' | 'starter' | 'growth' | 'premium';

interface TierFeature {
  label: string;
  included: boolean;
}

interface TierDefinition {
  key: TierKey;
  name: string;
  priceKes: number;
  productLimit: string;
  chartDays: string;
  features: TierFeature[];
  badge?: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
  icon: React.ReactNode;
}

const TIERS: TierDefinition[] = [
  {
    key: 'basic',
    name: 'Basic / Free',
    priceKes: 0,
    productLimit: '20 products',
    chartDays: 'No analytics',
    icon: <Shield className="w-5 h-5" />,
    features: [
      { label: 'Brand profile & up to 20 product listings', included: true },
      { label: 'Virtual try-on enabled', included: true },
      { label: 'Visibility in search & feeds', included: true },
      { label: 'Link-out sales to your store', included: true },
      { label: 'Eligible for organic inclusion in public lookbooks', included: true },
      { label: 'Light placement boost in select feeds', included: false },
      { label: 'Category-based spotlighting', included: false },
      { label: 'Basic trend insights (top styles, seasons)', included: false },
      { label: 'Advanced analytics & conversion insights', included: false },
      { label: 'Dedicated account manager', included: false },
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    priceKes: 5000,
    productLimit: '50 products',
    chartDays: '30-day chart',
    icon: <Zap className="w-5 h-5" />,
    features: [
      { label: 'Everything in Basic', included: true },
      { label: 'Up to 50 product slots', included: true },
      { label: 'Light placement boost in select feeds', included: true },
      { label: 'Category-based spotlighting (e.g. "Summer Tops")', included: true },
      { label: 'Access to NIMA community lookbooks', included: true },
      { label: 'Basic trend insights (top styles, seasons)', included: true },
      { label: 'Advanced analytics & conversion insights', included: false },
      { label: 'Try-on → click-out performance dashboards', included: false },
      { label: 'Dedicated account manager', included: false },
    ],
  },
  {
    key: 'growth',
    name: 'Growth / Pro',
    priceKes: 15000,
    productLimit: '200 products',
    chartDays: '90-day chart',
    icon: <Star className="w-5 h-5" />,
    badge: { label: 'Most Popular', variant: 'default' },
    features: [
      { label: 'Everything in Starter', included: true },
      { label: 'Priority placement in feeds & search', included: true },
      { label: 'Branded lookbooks & creator collaborations', included: true },
      { label: 'Inclusion in themed lookbooks (Workwear, Summer, Events)', included: true },
      { label: 'Advanced analytics & conversion insights', included: true },
      { label: 'Try-on → click-out performance dashboards', included: true },
      { label: '5 monthly promotional credits for campaigns', included: true },
      { label: 'Dedicated account manager', included: false },
      { label: 'Co-marketing & future API integrations', included: false },
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    priceKes: 30000,
    productLimit: 'Unlimited products',
    chartDays: '365-day chart',
    icon: <Crown className="w-5 h-5" />,
    badge: { label: 'Top Tier', variant: 'secondary' },
    features: [
      { label: 'Everything in Growth', included: true },
      { label: 'Top-tier placement platform-wide', included: true },
      { label: 'Dedicated campaigns, seasonal pushes & exclusive drops', included: true },
      { label: 'Trending looks, NIMA-styled collections', included: true },
      { label: 'Multiple branded lookbooks', included: true },
      { label: 'Deep buyer & trend analytics', included: true },
      { label: 'Dedicated account manager', included: true },
      { label: 'Eligibility for co-marketing & future API integrations', included: true },
    ],
  },
];

const TIER_ORDER: TierKey[] = ['basic', 'starter', 'growth', 'premium'];

function tierRank(tier: TierKey): number {
  return TIER_ORDER.indexOf(tier);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function FeatureRow({ feature }: { feature: TierFeature }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {feature.included ? (
        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
      )}
      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/60 line-through'}>
        {feature.label}
      </span>
    </li>
  );
}

// ============================================================
// SUBSCRIPTION HISTORY TABLE
// ============================================================

type HistoryEntry = {
  _id: string;
  tier: 'starter' | 'growth' | 'premium';
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
  periodStart?: number;
  periodEnd?: number;
  amountKes: number;
  merchantTransactionId: string;
  failureReason?: string;
  createdAt: number;
};

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  expired: { label: 'Expired', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const TIER_BADGE_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  premium: 'Premium',
};

function SubscriptionHistoryTable({ history }: { history: HistoryEntry[] | undefined }) {
  if (history === undefined) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 p-3 rounded-lg border">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No subscription history yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Plan</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Amount</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Period</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {history.map((entry) => {
            const statusInfo = STATUS_BADGE[entry.status] ?? { label: entry.status, variant: 'secondary' as const };
            return (
              <tr key={entry._id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-3 text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString('en-GB')}
                </td>
                <td className="py-3 px-3">
                  <Badge variant="outline" className="font-medium capitalize">
                    {TIER_BADGE_LABELS[entry.tier] ?? entry.tier}
                  </Badge>
                </td>
                <td className="py-3 px-3">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </td>
                <td className="py-3 px-3 font-medium">KES {entry.amountKes.toLocaleString()}</td>
                <td className="py-3 px-3 text-muted-foreground">
                  {entry.periodStart && entry.periodEnd ? (
                    <>
                      {new Date(entry.periodStart).toLocaleDateString('en-GB')}
                      {' → '}
                      {new Date(entry.periodEnd).toLocaleDateString('en-GB')}
                    </>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// PAYMENT DIALOG
// ============================================================

type PaymentState = 'idle' | 'pending' | 'success' | 'failed';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: TierDefinition;
  defaultPhone: string;
}

function PaymentDialog({ open, onOpenChange, tier, defaultPhone }: PaymentDialogProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [merchantTransactionId, setMerchantTransactionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initiateSubscription = useMutation(api.sellers.subscriptions.initiateSubscription);

  // Poll for subscription status
  const polledSub = useQuery(
    api.sellers.subscriptions.getSubscriptionByTransactionId,
    merchantTransactionId ? { merchantTransactionId } : 'skip',
  );

  // React to polling result
  useEffect(() => {
    if (!polledSub || paymentState !== 'pending') return;

    if (polledSub.status === 'active') {
      setPaymentState('success');
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else if (polledSub.status === 'failed') {
      setPaymentState('failed');
      setErrorMessage(polledSub.failureReason ?? 'Payment failed. Please try again.');
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [polledSub, paymentState]);

  // STK Push Fallback Timeout (60 seconds)
  // Especially useful in dev mode where webhooks from Fingo often don't reach localhost
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (paymentState === 'pending') {
      timeoutId = setTimeout(() => {
        setPaymentState('failed');
        setErrorMessage('Payment request timed out. Please check your phone or try again.');
      }, 60000); // 60 seconds
    }
    return () => clearTimeout(timeoutId);
  }, [paymentState]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPaymentState('idle');
      setMerchantTransactionId(null);
      setErrorMessage('');
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [open]);

  // Sync phone with prop when dialog opens
  useEffect(() => {
    if (open) {
      setPhone(defaultPhone);
    }
  }, [open, defaultPhone]);

  async function handlePay() {
    const cleaned = phone.trim();
    if (!cleaned) return;

    setPaymentState('pending');
    setErrorMessage('');

    try {
      const result = await initiateSubscription({
        tier: tier.key as 'starter' | 'growth' | 'premium',
        phoneNumber: cleaned,
      });
      setMerchantTransactionId(result.merchantTransactionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate payment.';
      setPaymentState('failed');
      setErrorMessage(msg);
    }
  }

  function handleClose() {
    if (paymentState === 'pending') return; // Block closing while payment is in-flight
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            {tier.icon}
            Upgrade to {tier.name}
          </DialogTitle>
          <DialogDescription>Pay via M-Pesa to activate your subscription.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Price summary */}
          <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">
                KES {tier.priceKes.toLocaleString()}
                <span className="text-muted-foreground font-normal text-sm">/month</span>
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{tier.productLimit}</p>
              <p>{tier.chartDays}</p>
            </div>
          </div>

          {/* Success state */}
          {paymentState === 'success' && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-lg">Payment confirmed!</p>
              <p className="text-muted-foreground text-sm">Your {tier.name} plan is now active.</p>
              <Button
                className="mt-2"
                onClick={() => {
                  onOpenChange(false);
                  window.location.reload();
                }}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Pending state */}
          {paymentState === 'pending' && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="font-semibold">Waiting for payment…</p>
              <p className="text-muted-foreground text-sm">
                Check your phone for the M-Pesa STK push prompt and enter your PIN.
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Polling for confirmation every few seconds
              </div>
            </div>
          )}

          {/* Idle / failed state — show phone input */}
          {(paymentState === 'idle' || paymentState === 'failed') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                <Input
                  id="mpesa-phone"
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Enter the Safaricom number registered with M-Pesa.</p>
              </div>

              {paymentState === 'failed' && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handlePay} disabled={!phone.trim()}>
                <CreditCard className="mr-2 w-4 h-4" />
                Pay KES {tier.priceKes.toLocaleString()} via M-Pesa
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// PLAN CARD
// ============================================================

interface PlanCardProps {
  tierDef: TierDefinition;
  currentTier: TierKey;
  onUpgrade: (tier: TierDefinition) => void;
}

function PlanCard({ tierDef, currentTier, onUpgrade }: PlanCardProps) {
  const isCurrent = tierDef.key === currentTier;
  const isUpgrade = tierRank(tierDef.key) > tierRank(currentTier);
  const isHighlighted = tierDef.key === 'growth';

  return (
    <Card
      className={`flex flex-col relative transition-shadow ${isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''} ${isCurrent ? 'bg-muted/30' : ''}`}
    >
      {/* Badge */}
      {tierDef.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant={tierDef.badge.variant} className="shadow-sm px-3 py-0.5 text-xs">
            {tierDef.badge.label}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <span className="text-muted-foreground">{tierDef.icon}</span>
            {tierDef.name}
          </CardTitle>
          {isCurrent && (
            <Badge variant="outline" className="text-xs">
              Current
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="mt-3">
          {tierDef.priceKes === 0 ? (
            <p className="text-3xl font-bold">Free</p>
          ) : (
            <p className="text-3xl font-bold">
              KES {tierDef.priceKes.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-5">
        {/* Feature list */}
        <ul className="space-y-2 flex-1">
          {tierDef.features.map((f, i) => (
            <FeatureRow key={i} feature={f} />
          ))}
        </ul>

        {/* CTA */}
        <div className="pt-2">
          {isCurrent ? (
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          ) : isUpgrade ? (
            <Button
              className="w-full"
              onClick={() => onUpgrade(tierDef)}
              variant={isHighlighted ? 'default' : 'default'}
            >
              Upgrade to {tierDef.name}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function BillingPage() {
  const stats = useQuery(api.sellers.queries.getSellerDashboardStats);
  const currentSub = useQuery(api.sellers.subscriptions.getCurrentSubscription);
  const history = useQuery(api.sellers.subscriptions.getSubscriptionHistory);
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierDefinition | null>(null);

  const currentTier: TierKey = (stats?.tier as TierKey) ?? 'basic';
  const defaultPhone = (seller as { contactPhone?: string } | null | undefined)?.contactPhone ?? '';

  function handleUpgradeClick(tier: TierDefinition) {
    setSelectedTier(tier);
    setDialogOpen(true);
  }

  const isLoading = stats === undefined;

  return (
    <div className="space-y-8 max-w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Manage Subscription</h1>
        <p className="text-muted-foreground mt-1">Choose the plan that works for your store.</p>
      </div>

      {/* Active Subscription Banner */}
      {currentSub && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-5 py-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            <span className="font-semibold capitalize">
              You&apos;re on {TIER_BADGE_LABELS[currentSub.tier] ?? currentSub.tier}
            </span>
            {currentSub.periodEnd && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  Renews {new Date(currentSub.periodEnd).toLocaleDateString('en-GB')}
                </span>
              </>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">KES {currentSub.amountKes.toLocaleString()}/mo</span>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24 mb-4" />
                <Skeleton className="h-9 w-32 mb-2" />
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[...Array(6)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((tier) => (
            <PlanCard key={tier.key} tierDef={tier} currentTier={currentTier} onUpgrade={handleUpgradeClick} />
          ))}
        </div>
      )}

      {/* Subscription History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Subscription History
          </CardTitle>
          <CardDescription>A record of all your past and current subscription payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionHistoryTable history={history as HistoryEntry[] | undefined} />
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {selectedTier && (
        <PaymentDialog open={dialogOpen} onOpenChange={setDialogOpen} tier={selectedTier} defaultPhone={defaultPhone} />
      )}
    </div>
  );
}
