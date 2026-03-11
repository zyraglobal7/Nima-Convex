'use client';

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Zap,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  History,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'soon';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─── Balance summary card ─────────────────────────────────────────────────────

function BalanceCard({
  freeRemaining,
  purchased,
  total,
  freePerWeek,
  weeklyResetAt,
}: {
  freeRemaining: number;
  purchased: number;
  total: number;
  freePerWeek: number;
  weeklyResetAt?: number;
}) {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Credits</p>
              <p className="text-3xl font-bold text-text-primary leading-none mt-0.5">{total}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">1 credit = 1 item try-on</p>
            <p className="text-xs text-text-secondary">3 credits = 3 new looks</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Free credits */}
          <div className="bg-background/60 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-text-secondary">Free (weekly)</span>
            </div>
            <p className="text-xl font-bold text-text-primary">
              {freeRemaining}
              <span className="text-sm font-normal text-text-secondary ml-1">/ {freePerWeek}</span>
            </p>
            {weeklyResetAt && weeklyResetAt > Date.now() && (
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="w-3 h-3" />
                Resets in {timeUntil(weeklyResetAt)}
              </div>
            )}
          </div>

          {/* Purchased credits */}
          <div className="bg-background/60 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-medium text-text-secondary">Purchased</span>
            </div>
            <p className="text-xl font-bold text-text-primary">{purchased}</p>
            <p className="text-xs text-text-secondary">Never expire</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Package card ─────────────────────────────────────────────────────────────

interface CreditPackage {
  id: string;
  credits: number;
  priceKes: number;
  label: string;
  popular?: boolean;
}

function PackageCard({
  pkg,
  onSelect,
}: {
  pkg: CreditPackage;
  onSelect: (pkg: CreditPackage) => void;
}) {
  const perCredit = (pkg.priceKes / pkg.credits).toFixed(0);
  return (
    <Card
      className={`relative cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
        pkg.popular ? 'border-primary ring-1 ring-primary/30' : ''
      }`}
      onClick={() => onSelect(pkg)}
    >
      {pkg.popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge className="text-xs px-2 py-0.5 bg-primary text-primary-foreground">
            Most Popular
          </Badge>
        </div>
      )}
      <CardContent className="p-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-2xl font-bold text-text-primary">{pkg.credits}</span>
        </div>
        <p className="text-xs text-text-secondary font-medium">{pkg.label}</p>
        <p className="text-lg font-semibold text-text-primary">
          KES {pkg.priceKes.toLocaleString()}
        </p>
        <p className="text-xs text-text-secondary">KES {perCredit} per credit</p>
        <Button size="sm" className="w-full mt-1" variant={pkg.popular ? 'default' : 'outline'}>
          Buy Now
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Payment dialog ───────────────────────────────────────────────────────────

type PaymentState = 'idle' | 'pending' | 'success' | 'failed';

function PaymentDialog({
  open,
  onOpenChange,
  pkg,
  defaultPhone,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: CreditPackage | null;
  defaultPhone: string;
  onSuccess: () => void;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [purchaseId, setPurchaseId] = useState<Id<'credit_purchases'> | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const initiatePurchase = useMutation(api.credits.mutations.initiatePurchase);

  // Real-time purchase status from Convex
  const purchaseStatus = useQuery(
    api.credits.queries.getPurchaseStatus,
    purchaseId ? { purchaseId } : 'skip',
  );

  // React to status changes.
  // Always apply a backend `completed` state — even if the local 60s timeout already
  // set the UI to `failed`. This prevents a race where the M-Pesa callback arrives
  // slightly after the timeout, which would otherwise leave the user seeing failure
  // while their credits were actually charged and added.
  useEffect(() => {
    if (!purchaseStatus) return;
    if (purchaseStatus.status === 'completed') {
      // Override any local state (including post-timeout `failed`)
      setPaymentState('success');
      onSuccess();
    } else if (purchaseStatus.status === 'failed' && paymentState === 'pending') {
      // Only apply backend failures while we're still in pending — avoid
      // overwriting a timeout message with a redundant one.
      setPaymentState('failed');
      setErrorMessage(purchaseStatus.failureReason ?? 'Payment failed. Please try again.');
    }
  }, [purchaseStatus, paymentState, onSuccess]);

  // 60-second local timeout — sets UI to failed so the user can retry,
  // but the effect above will correct this if the webhook arrives late.
  useEffect(() => {
    if (paymentState !== 'pending') return;
    const t = setTimeout(() => {
      setPaymentState('failed');
      setErrorMessage('Payment request timed out. Check your phone or try again.');
    }, 60000);
    return () => clearTimeout(t);
  }, [paymentState]);

  // Sync phone from parent
  useEffect(() => {
    if (open) setPhone(defaultPhone);
  }, [open, defaultPhone]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPaymentState('idle');
      setErrorMessage('');
      setPurchaseId(null);
    }
  }, [open]);

  async function handlePay() {
    if (!pkg || !phone.trim()) return;
    setPaymentState('pending');
    setErrorMessage('');
    try {
      const result = await initiatePurchase({ packageId: pkg.id, phoneNumber: phone.trim() });
      if (!result.success || !result.purchaseId) {
        setPaymentState('failed');
        setErrorMessage(result.error ?? 'Failed to initiate payment.');
        return;
      }
      setPurchaseId(result.purchaseId);
    } catch (err) {
      setPaymentState('failed');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initiate payment.');
    }
  }

  if (!pkg) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Buy {pkg.credits} Credits</DialogTitle>
          <DialogDescription>
            KES {pkg.priceKes.toLocaleString()} via M-Pesa
          </DialogDescription>
        </DialogHeader>

        {paymentState === 'success' && (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-lg">Payment Successful!</p>
            <p className="text-sm text-text-secondary">
              {pkg.credits} credits have been added to your account.
            </p>
            <Button className="w-full mt-2" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}

        {paymentState === 'pending' && (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-semibold">Waiting for payment…</p>
            <p className="text-sm text-text-secondary">
              Check your phone for the M-Pesa prompt and enter your PIN.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              Confirming automatically
            </div>
          </div>
        )}

        {(paymentState === 'idle' || paymentState === 'failed') && (
          <div className="space-y-4 pt-1">
            {paymentState === 'failed' && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="credits-phone">M-Pesa Phone Number</Label>
              <Input
                id="credits-phone"
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-text-secondary">
                Kenyan number (07xx or 01xx). You&apos;ll receive an STK push prompt.
              </p>
            </div>

            <div className="bg-surface rounded-lg p-3 space-y-1 text-sm border border-border">
              <div className="flex justify-between">
                <span className="text-text-secondary">Credits</span>
                <span className="font-medium">{pkg.credits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Amount</span>
                <span className="font-medium">KES {pkg.priceKes.toLocaleString()}</span>
              </div>
            </div>

            <Button className="w-full" onClick={handlePay} disabled={!phone.trim()}>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay with M-Pesa
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Purchase history ─────────────────────────────────────────────────────────

function PurchaseHistory() {
  const history = useQuery(api.credits.queries.getPurchaseHistory);

  if (history === undefined) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No purchases yet.</p>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    completed: { label: 'Completed', variant: 'default' },
    pending: { label: 'Pending', variant: 'secondary' },
    failed: { label: 'Failed', variant: 'destructive' },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-text-secondary font-medium">Date</th>
            <th className="text-left py-2 px-3 text-text-secondary font-medium">Credits</th>
            <th className="text-left py-2 px-3 text-text-secondary font-medium">Amount</th>
            <th className="text-left py-2 px-3 text-text-secondary font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map((p) => {
            const badge = STATUS_BADGE[p.status] ?? { label: p.status, variant: 'secondary' as const };
            return (
              <tr key={p._id} className="hover:bg-surface/50 transition-colors">
                <td className="py-3 px-3 text-text-secondary">{formatDate(p.createdAt)}</td>
                <td className="py-3 px-3 font-medium">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    {p.creditAmount}
                  </span>
                </td>
                <td className="py-3 px-3 font-medium">KES {p.priceKes.toLocaleString()}</td>
                <td className="py-3 px-3">
                  <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const credits = useQuery(api.credits.queries.getUserCredits);
  const packages = useQuery(api.credits.queries.getCreditPackages);

  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Track refreshes to re-render balance after purchase
  const [, setRefreshKey] = useState(0);

  const defaultPhone = currentUser?.phoneNumber ?? '';

  function handleSelectPackage(pkg: CreditPackage) {
    setSelectedPkg(pkg);
    setDialogOpen(true);
  }

  function handlePurchaseSuccess() {
    setRefreshKey((k) => k + 1);
  }

  // Loading
  if (credits === undefined || packages === undefined) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
        <div className="h-8 w-40 bg-muted animate-pulse rounded" />
        <div className="h-44 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Credits</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Use credits for virtual try-ons and generating new looks.
        </p>
      </div>

      {/* Balance */}
      <BalanceCard
        freeRemaining={credits.freeRemaining}
        purchased={credits.purchased}
        total={credits.total}
        freePerWeek={credits.freePerWeek}
        weeklyResetAt={currentUser?.weeklyCreditsResetAt}
      />

      {/* How credits work */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { icon: Zap, label: '1 credit', desc: 'Item try-on' },
          { icon: Sparkles, label: '3 credits', desc: '3 new looks' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-border">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text-primary">{label}</p>
              <p className="text-xs text-text-secondary">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buy credits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Buy Credits</CardTitle>
          <CardDescription>
            Purchased credits never expire and stack with your free weekly credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onSelect={handleSelectPackage} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Purchase history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Purchase History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <PurchaseHistory />
        </CardContent>
      </Card>

      {/* Payment dialog */}
      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pkg={selectedPkg}
        defaultPhone={defaultPhone}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}
