'use client';

import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plug,
  Plus,
  Copy,
  Check,
  RotateCcw,
  PowerOff,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = 'free' | 'starter' | 'growth' | 'enterprise';

type Partner = {
  _id: Id<'api_partners'>;
  name: string;
  slug: string;
  websiteUrl: string;
  apiKeyPrefix: string;
  allowedDomains: string[];
  plan: Plan;
  monthlyTryOnLimit: number;
  tryOnsUsedThisMonth: number;
  billingResetAt: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

const PLAN_LIMITS: Record<Plan, number> = {
  free: 50,
  starter: 500,
  growth: 5000,
  enterprise: 999999,
};

const PLAN_COLORS: Record<Plan, string> = {
  free: 'bg-muted text-muted-foreground border-muted',
  starter: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  growth: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
  enterprise: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB');
}

function usagePercent(used: number, limit: number) {
  if (limit >= 999999) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─── Add Partner Dialog ───────────────────────────────────────────────────────

function AddPartnerDialog({ onCreated }: { onCreated: (fullKey: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [domains, setDomains] = useState('');
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminCreatePartner = useAction(api.connect.actions.adminCreatePartnerPublic);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || !slug || !websiteUrl) {
      setError('Name, slug, and website URL are required.');
      return;
    }
    const allowedDomains = domains
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const result = await adminCreatePartner({ name, slug, websiteUrl, allowedDomains, plan });
      setOpen(false);
      setName(''); setSlug(''); setWebsiteUrl(''); setDomains(''); setPlan('free');
      onCreated(result.fullKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create partner');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Partner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add API Partner</DialogTitle>
          <DialogDescription>
            Creates a new partner account and generates an API key.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="partner-name">Partner Name</Label>
            <Input id="partner-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Fashion" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partner-slug">Slug</Label>
            <Input id="partner-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="acme-fashion" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partner-url">Website URL</Label>
            <Input id="partner-url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://acmefashion.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partner-domains">Allowed Domains (comma-separated)</Label>
            <Input id="partner-domains" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="acmefashion.com, www.acmefashion.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partner-plan">Plan</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
              <SelectTrigger id="partner-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (50/mo)</SelectItem>
                <SelectItem value="starter">Starter (500/mo)</SelectItem>
                <SelectItem value="growth">Growth (5,000/mo)</SelectItem>
                <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create Partner'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Key reveal modal ─────────────────────────────────────────────────────────

function KeyRevealModal({ apiKey, onClose }: { apiKey: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            API Key Generated
          </DialogTitle>
          <DialogDescription>
            Copy this key now — it won&apos;t be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
            <code className="text-xs flex-1 break-all font-mono">{apiKey}</code>
            <CopyButton text={apiKey} />
          </div>
          <Button className="w-full" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Partner row ──────────────────────────────────────────────────────────────

function PartnerRow({
  partner,
  onRotated,
}: {
  partner: Partner;
  onRotated: (key: string) => void;
}) {
  const deactivatePartner = useMutation(api.connect.mutations.deactivatePartnerPublic);
  const rotateKey = useAction(api.connect.actions.rotateApiKeyPublic);

  const pct = usagePercent(partner.tryOnsUsedThisMonth, partner.monthlyTryOnLimit);

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${partner.name}? Their API key will stop working.`)) return;
    await deactivatePartner({ partnerId: partner._id });
  }

  async function handleRotate() {
    if (!confirm(`Rotate API key for ${partner.name}? The old key will stop working immediately.`)) return;
    const result = await rotateKey({ partnerId: partner._id });
    onRotated(result.fullKey);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{partner.name}</p>
          <Badge variant="outline" className={`text-xs capitalize ${PLAN_COLORS[partner.plan]}`}>
            {partner.plan}
          </Badge>
          {!partner.isActive && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
              Inactive
            </Badge>
          )}
        </div>
        <p className="text-xs text-text-secondary truncate">{partner.websiteUrl}</p>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
            nima_pk_{partner.apiKeyPrefix}…
          </code>
          <span className="text-xs text-text-secondary">
            {partner.allowedDomains.join(', ') || 'No domains'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 w-36 shrink-0">
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Usage</span>
          <span className="font-medium">
            {partner.monthlyTryOnLimit >= 999999 ? '∞' : `${partner.tryOnsUsedThisMonth}/${partner.monthlyTryOnLimit}`}
          </span>
        </div>
        {partner.monthlyTryOnLimit < 999999 && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <p className="text-xs text-text-secondary">Resets {formatDate(partner.billingResetAt)}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <p className="text-xs text-text-secondary hidden lg:block">
          Added {formatDate(partner.createdAt)}
        </p>
        {partner.isActive && (
          <>
            <Button variant="ghost" size="sm" onClick={handleRotate} title="Rotate API key">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeactivate} title="Deactivate partner" className="text-destructive hover:text-destructive">
              <PowerOff className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminConnectPage() {
  const partners = useQuery(api.connect.queries.getPartnersAdmin);
  const [revealKey, setRevealKey] = useState<string | null>(null);

  const totalPartners = partners?.length ?? 0;
  const activePartners = partners?.filter((p) => p.isActive).length ?? 0;
  const totalTryOnsThisMonth = partners?.reduce((s, p) => s + p.tryOnsUsedThisMonth, 0) ?? 0;

  if (partners === null) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <p>Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Nima Connect</h1>
          <p className="text-muted-foreground mt-1">
            Manage third-party API partners and virtual try-on integrations.
          </p>
        </div>
        <AddPartnerDialog onCreated={(key) => setRevealKey(key)} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partners === undefined ? <div className="h-8 w-10 bg-muted animate-pulse rounded" /> : totalPartners}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activePartners} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Try-Ons This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partners === undefined ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : totalTryOnsThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all partners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partners === undefined ? <div className="h-8 w-10 bg-muted animate-pulse rounded" /> : activePartners}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPartners - activePartners} inactive
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Partner list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            API Partners
          </CardTitle>
          <CardDescription>
            Manage partner accounts, API keys, usage limits, and allowed domains.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partners === undefined ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Plug className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No partners yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {partners.map((p) => (
                <PartnerRow
                  key={p._id}
                  partner={p as Partner}
                  onRotated={(key) => setRevealKey(key)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key reveal modal */}
      {revealKey && (
        <KeyRevealModal apiKey={revealKey} onClose={() => setRevealKey(null)} />
      )}
    </div>
  );
}
