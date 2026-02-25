'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  AlertTriangle,
  XCircle,
  Store,
  CreditCard,
  Settings2,
  ChevronDown,
  Save,
  RotateCcw,
  Crown,
  Zap,
  Star,
  Shield,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type SellerTier = 'basic' | 'starter' | 'growth' | 'premium';

type TierConfigRow = {
  _id: Id<'tier_config'>;
  _creationTime: number;
  tier: SellerTier;
  maxProducts: number | null;
  revenueChartDays: number;
  orderHistoryDays: number | null;
  topProductsLimit: number | null;
  showEngagementCounts: boolean;
  showCartCounts: boolean;
  priceKes: number;
  updatedAt: number;
};

type DraftConfig = Omit<TierConfigRow, '_id' | '_creationTime' | 'updatedAt'>;

// ─────────────────────────────────────────────────────────────
// DEFAULTS (mirrors TIER_LIMITS in types.ts)
// ─────────────────────────────────────────────────────────────

const TIER_DEFAULTS: Record<SellerTier, DraftConfig> = {
  basic:   { tier: 'basic',   maxProducts: 20,   revenueChartDays: 0,   orderHistoryDays: 30,  topProductsLimit: 0,    showEngagementCounts: false, showCartCounts: false, priceKes: 0 },
  starter: { tier: 'starter', maxProducts: 50,   revenueChartDays: 30,  orderHistoryDays: 90,  topProductsLimit: 5,    showEngagementCounts: true,  showCartCounts: false, priceKes: 5000 },
  growth:  { tier: 'growth',  maxProducts: 200,  revenueChartDays: 90,  orderHistoryDays: 180, topProductsLimit: 20,   showEngagementCounts: true,  showCartCounts: true,  priceKes: 15000 },
  premium: { tier: 'premium', maxProducts: null, revenueChartDays: 365, orderHistoryDays: null, topProductsLimit: null, showEngagementCounts: true,  showCartCounts: true,  priceKes: 30000 },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatAmount(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB');
}

function nullableNum(val: string): number | null {
  if (val === '' || val.toLowerCase() === 'unlimited') return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function displayNullable(val: number | null): string {
  return val === null ? 'unlimited' : String(val);
}

const TIER_BADGE_STYLES: Record<SellerTier, string> = {
  basic:   'bg-muted text-muted-foreground border-muted',
  starter: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  growth:  'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
  premium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
};

const TIER_ICONS: Record<SellerTier, React.ReactNode> = {
  basic:   <Shield className="h-3.5 w-3.5" />,
  starter: <Zap className="h-3.5 w-3.5" />,
  growth:  <Star className="h-3.5 w-3.5" />,
  premium: <Crown className="h-3.5 w-3.5" />,
};

function TierBadge({ tier }: { tier: SellerTier }) {
  return (
    <Badge variant="outline" className={`flex items-center gap-1 capitalize ${TIER_BADGE_STYLES[tier]}`}>
      {TIER_ICONS[tier]}
      {tier}
    </Badge>
  );
}

const SUB_STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300',
  pending:   'text-muted-foreground',
  expired:   'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
  cancelled: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  failed:    'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
};

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={accent ? 'text-amber-500' : 'text-muted-foreground'}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// TIER CONFIG EDITOR CARD
// ─────────────────────────────────────────────────────────────

interface TierCardEditorProps {
  tier: SellerTier;
  config: DraftConfig;
  saving: boolean;
  onSave: (draft: DraftConfig) => void;
}

function TierCardEditor({ tier, config, saving, onSave }: TierCardEditorProps) {
  const [draft, setDraft] = useState<DraftConfig>({ ...config });

  const configKey = JSON.stringify(config);
  const prevKeyRef = useRef(configKey);
  useEffect(() => {
    if (prevKeyRef.current !== configKey) {
      setDraft({ ...config });
      prevKeyRef.current = configKey;
    }
  }, [config, configKey]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TierBadge tier={tier} />
          {tier !== 'basic' && (
            <span className="text-sm text-muted-foreground">
              KES {draft.priceKes.toLocaleString()}/mo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft({ ...config })}
              disabled={saving}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onSave(draft)}
            disabled={!isDirty || saving}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tier !== 'basic' && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Price (KES/mo)</Label>
            <Input
              type="number"
              min={0}
              value={draft.priceKes}
              onChange={(e) => setDraft((d) => ({ ...d, priceKes: parseInt(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Max Products</Label>
          <Input
            type="text"
            placeholder="unlimited"
            value={displayNullable(draft.maxProducts)}
            onChange={(e) => setDraft((d) => ({ ...d, maxProducts: nullableNum(e.target.value) }))}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Revenue Chart (days)</Label>
          <Input
            type="number"
            min={0}
            value={draft.revenueChartDays}
            onChange={(e) => setDraft((d) => ({ ...d, revenueChartDays: parseInt(e.target.value) || 0 }))}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Order History (days)</Label>
          <Input
            type="text"
            placeholder="unlimited"
            value={displayNullable(draft.orderHistoryDays)}
            onChange={(e) => setDraft((d) => ({ ...d, orderHistoryDays: nullableNum(e.target.value) }))}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Top Products Shown</Label>
          <Input
            type="text"
            placeholder="0 = hidden, unlimited"
            value={displayNullable(draft.topProductsLimit)}
            onChange={(e) => setDraft((d) => ({ ...d, topProductsLimit: nullableNum(e.target.value) }))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        <div className="flex items-center gap-2">
          <Switch
            id={`engagement-${tier}`}
            checked={draft.showEngagementCounts}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, showEngagementCounts: v }))}
          />
          <Label htmlFor={`engagement-${tier}`} className="text-sm cursor-pointer">
            Engagement counts (views, try-ons, lookbook saves)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`cart-${tier}`}
            checked={draft.showCartCounts}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, showCartCounts: v }))}
          />
          <Label htmlFor={`cart-${tier}`} className="text-sm cursor-pointer">
            Cart & conversion counts
          </Label>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RECENT EVENTS FEED
// ─────────────────────────────────────────────────────────────

type SubEvent = {
  _id: Id<'seller_subscriptions'>;
  sellerId: Id<'sellers'>;
  shopName: string;
  tier: 'starter' | 'growth' | 'premium';
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
  amountKes: number;
  periodEnd?: number;
  failureReason?: string;
  createdAt: number;
};

function RecentEventsFeed({ events }: { events: SubEvent[] | undefined }) {
  if (events === undefined) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              <div className="h-3 w-28 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-5 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No subscription events yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const statusStyle = SUB_STATUS_STYLES[ev.status] ?? 'text-muted-foreground';
        return (
          <div
            key={ev._id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
          >
            <div className="shrink-0">
              {TIER_ICONS[ev.tier]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ev.shopName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(ev.createdAt)}
                {ev.failureReason && (
                  <span className="text-red-500 ml-2">· {ev.failureReason}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatAmount(ev.amountKes)}/mo
              </span>
              <Badge variant="outline" className={`text-xs capitalize ${statusStyle}`}>
                {ev.status}
              </Badge>
              <Badge variant="outline" className={`text-xs capitalize hidden sm:flex ${TIER_BADGE_STYLES[ev.tier]}`}>
                {ev.tier}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

const ALL_TIERS: SellerTier[] = ['basic', 'starter', 'growth', 'premium'];

export default function AdminBillingPage() {
  const stats = useQuery(api.admin.queries.getSubscriptionStats, {});
  const tierConfigs = useQuery(api.admin.queries.getTierConfigs, {});
  const recentEvents = useQuery(api.admin.queries.getRecentSubscriptionEvents);

  const updateTierConfig = useMutation(api.admin.sellers.updateTierConfig);
  const seedTierConfigs = useMutation(api.admin.sellers.seedTierConfigs);

  const [savingTier, setSavingTier] = useState<SellerTier | null>(null);
  const [tierConfigOpen, setTierConfigOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  async function handleSeedAndOpen() {
    await seedTierConfigs({});
    setTierConfigOpen(true);
  }

  async function handleSaveTierConfig(tier: SellerTier, draft: DraftConfig) {
    setSavingTier(tier);
    try {
      await updateTierConfig({
        tier: draft.tier,
        maxProducts: draft.maxProducts,
        revenueChartDays: draft.revenueChartDays,
        orderHistoryDays: draft.orderHistoryDays,
        topProductsLimit: draft.topProductsLimit,
        showEngagementCounts: draft.showEngagementCounts,
        showCartCounts: draft.showCartCounts,
        priceKes: draft.priceKes,
      });
    } finally {
      setSavingTier(null);
    }
  }

  function getEffectiveConfig(tier: SellerTier): DraftConfig {
    const row = tierConfigs?.find((r) => r.tier === tier);
    if (row) {
      return {
        tier: row.tier,
        maxProducts: row.maxProducts,
        revenueChartDays: row.revenueChartDays,
        orderHistoryDays: row.orderHistoryDays,
        topProductsLimit: row.topProductsLimit,
        showEngagementCounts: row.showEngagementCounts,
        showCartCounts: row.showCartCounts,
        priceKes: row.priceKes,
      };
    }
    return TIER_DEFAULTS[tier];
  }

  const totalActive = stats
    ? stats.activeByTier.starter + stats.activeByTier.growth + stats.activeByTier.premium
    : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Subscription health, MRR, tier configuration, and recent payment events.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Subscriptions"
          value={stats ? totalActive : <div className="h-8 w-12 bg-muted animate-pulse rounded" />}
          sub={stats
            ? `Starter: ${stats.activeByTier.starter} · Growth: ${stats.activeByTier.growth} · Premium: ${stats.activeByTier.premium}`
            : undefined}
          icon={<Store className="h-4 w-4" />}
        />

        <StatCard
          title="MRR"
          value={stats ? formatAmount(stats.mrrKes) : <div className="h-8 w-28 bg-muted animate-pulse rounded" />}
          sub="Monthly recurring revenue"
          icon={<TrendingUp className="h-4 w-4" />}
        />

        <StatCard
          title="Expiring Soon"
          value={stats ? (
            <span className={stats.expiringIn7Days > 0 ? 'text-amber-600' : ''}>
              {stats.expiringIn7Days}
            </span>
          ) : (
            <div className="h-8 w-10 bg-muted animate-pulse rounded" />
          )}
          sub="Renewing within 7 days"
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={!!(stats && stats.expiringIn7Days > 0)}
        />

        <StatCard
          title="Failed Payments"
          value={stats ? (
            <span className={stats.failedLast30Days > 0 ? 'text-red-600' : ''}>
              {stats.failedLast30Days}
            </span>
          ) : (
            <div className="h-8 w-10 bg-muted animate-pulse rounded" />
          )}
          sub="Last 30 days"
          icon={<XCircle className="h-4 w-4" />}
          accent={!!(stats && stats.failedLast30Days > 0)}
        />
      </div>

      {/* Tier Distribution */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['basic', 'starter', 'growth', 'premium'] as SellerTier[]).map((tier) => {
            const count = tier === 'basic'
              ? (stats.totalSellers - totalActive)
              : stats.activeByTier[tier as 'starter' | 'growth' | 'premium'] ?? 0;
            return (
              <div
                key={tier}
                className="rounded-lg border p-4 flex flex-col gap-1"
              >
                <TierBadge tier={tier} />
                <p className="text-2xl font-bold mt-2">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {tier === 'basic' ? 'free sellers' : 'active subs'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tier Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Tier Configuration
              </CardTitle>
              <CardDescription className="mt-1">
                Edit limits and analytics access per plan. Changes take effect immediately for all sellers on that tier.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!tierConfigOpen && (!tierConfigs || tierConfigs.length === 0)) {
                  handleSeedAndOpen();
                } else {
                  setTierConfigOpen((v) => !v);
                }
              }}
            >
              <ChevronDown
                className={`h-4 w-4 mr-1.5 transition-transform ${tierConfigOpen ? 'rotate-180' : ''}`}
              />
              {tierConfigOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </CardHeader>

        {tierConfigOpen && (
          <CardContent className="space-y-4">
            {ALL_TIERS.map((tier) => (
              <TierCardEditor
                key={tier}
                tier={tier}
                config={getEffectiveConfig(tier)}
                saving={savingTier === tier}
                onSave={(draft) => handleSaveTierConfig(tier, draft)}
              />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Recent Subscription Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Subscription Events
              </CardTitle>
              <CardDescription className="mt-1">
                Last 50 subscription transactions across all sellers — payments, activations, cancellations, failures.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEventsOpen((v) => !v)}
            >
              <ChevronDown
                className={`h-4 w-4 mr-1.5 transition-transform ${eventsOpen ? 'rotate-180' : ''}`}
              />
              {eventsOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </CardHeader>
        {eventsOpen && (
          <CardContent>
            <RecentEventsFeed events={recentEvents as SubEvent[] | undefined} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
