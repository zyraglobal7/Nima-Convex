'use client';

import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plug,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Code2,
  CheckCircle2,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Plan = 'free' | 'starter' | 'growth' | 'enterprise';
type EventType = 'session_created' | 'photo_uploaded' | 'tryon_generated' | 'tryon_failed' | 'user_converted';

const PLAN_COLORS: Record<Plan, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  growth: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

const EVENT_LABELS: Record<EventType, string> = {
  session_created: 'Session Created',
  photo_uploaded: 'Photo Uploaded',
  tryon_generated: 'Try-On Generated',
  tryon_failed: 'Try-On Failed',
  user_converted: 'User Converted',
};

const EVENT_COLORS: Record<EventType, string> = {
  session_created: 'text-blue-500',
  photo_uploaded: 'text-purple-500',
  tryon_generated: 'text-green-500',
  tryon_failed: 'text-red-500',
  user_converted: 'text-amber-500',
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB');
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? (copied ? 'Copied!' : 'Copy')}
    </Button>
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
            New API Key Generated
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

// ─── No partner state ─────────────────────────────────────────────────────────

function NoPartnerView({ onCreate }: { onCreate: (websiteUrl: string) => Promise<void> }) {
  const [creating, setCreating] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreate(websiteUrl);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Nima Connect API</h1>
        <p className="text-muted-foreground mt-1">
          Embed Nima&apos;s AI virtual try-on directly on your product pages.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { icon: Plug, title: 'Simple Integration', desc: 'One line of JavaScript. Works on any website or platform.' },
          { icon: Zap, title: 'Instant Try-Ons', desc: 'Powered by Nima AI — guests see results in under 60 seconds.' },
          { icon: TrendingUp, title: 'Boost Conversions', desc: 'Virtual try-ons reduce returns and increase purchase confidence.' },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent className="pt-6 space-y-2">
              <Icon className="h-6 w-6 text-primary" />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-text-secondary">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-6 text-center">
          <Plug className="h-12 w-12 text-primary opacity-70" />
          <div>
            <h2 className="text-lg font-semibold font-serif">Get your API key</h2>
            <p className="text-sm text-text-secondary mt-1 max-w-sm">
              Start embedding virtual try-ons on your store instantly.
              Free plan includes 50 try-ons per month.
            </p>
          </div>
          <div className="w-full max-w-sm space-y-3 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="websiteUrl" className="text-xs font-medium">
                Your website URL <span className="text-text-secondary">(optional)</span>
              </Label>
              <Input
                id="websiteUrl"
                placeholder="https://yourstore.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              <Plug className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create API Key'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SellerApiPage() {
  const partner = useQuery(api.connect.queries.getMyPartner);
  const logs = useQuery(api.connect.queries.getMyRecentUsageLogs);
  const rotateKey = useAction(api.connect.actions.rotateApiKeyPublic);
  const createPartner = useAction(api.connect.actions.sellerCreatePartner);

  const [revealKey, setRevealKey] = useState<string | null>(null);

  async function handleCreate(websiteUrl: string) {
    const result = await createPartner({ websiteUrl: websiteUrl || undefined });
    setRevealKey(result.fullKey);
  }

  async function handleRotate() {
    if (!partner) return;
    if (!confirm('Rotate your API key? The old key will stop working immediately.')) return;
    const result = await rotateKey({ partnerId: partner._id });
    setRevealKey(result.fullKey);
  }

  // Loading
  if (partner === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // No partner yet
  if (partner === null) {
    return (
      <>
        <NoPartnerView onCreate={handleCreate} />
        {revealKey && (
          <KeyRevealModal apiKey={revealKey} onClose={() => setRevealKey(null)} />
        )}
      </>
    );
  }

  const pct = partner.monthlyTryOnLimit >= 999999
    ? 0
    : Math.min(100, Math.round((partner.tryOnsUsedThisMonth / partner.monthlyTryOnLimit) * 100));

  const embedSnippet = `<!-- Nima Connect Widget -->
<button onclick="window.open('https://www.shopnima.ai/connect?session=SESSION_TOKEN','nimaConnect','width=640,height=720,resizable=yes')">
  Try On with Nima ✨
</button>`;

  const apiSnippet = `// Create a session (Node.js / server-side)
const res = await fetch('https://convex.shopnima.ai/api/v1/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer nima_pk_${partner.apiKeyPrefix}...',
  },
  body: JSON.stringify({
    productImageUrl: 'https://your-cdn.com/product-image.jpg',
    externalProductId: 'prod_123',
    productName: 'Blue Denim Jacket',
    productCategory: 'outerwear',
  }),
});
const { sessionToken, widgetUrl } = await res.json();
// Open widgetUrl in a popup on your product page`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Nima Connect API</h1>
        <p className="text-muted-foreground mt-1">
          Your API integration for embedding virtual try-ons on your website.
        </p>
      </div>

      {/* Status + Usage */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`capitalize ${PLAN_COLORS[partner.plan as Plan]}`}>
              {partner.plan}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {partner.monthlyTryOnLimit >= 999999 ? 'Unlimited' : `${partner.monthlyTryOnLimit}/mo`} try-ons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partner.tryOnsUsedThisMonth}</div>
            {partner.monthlyTryOnLimit < 999999 && (
              <>
                <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% of limit</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Billing Reset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{formatDate(partner.billingResetAt)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monthly counter resets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${partner.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium text-sm capitalize">
                {partner.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active since {formatDate(partner.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Key</CardTitle>
          <CardDescription>
            Keep your API key secret. Use it server-side only — never expose it in client-side code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
            <code className="text-sm font-mono flex-1">
              nima_pk_{partner.apiKeyPrefix}{'•'.repeat(16)}
            </code>
            <Button variant="ghost" size="sm" onClick={handleRotate} className="gap-1.5 shrink-0">
              <RotateCcw className="h-3.5 w-3.5" />
              Rotate Key
            </Button>
          </div>

          <div>
            <p className="text-xs text-text-secondary font-medium mb-1">Allowed Domains</p>
            <div className="flex flex-wrap gap-1.5">
              {partner.allowedDomains.length === 0 ? (
                <span className="text-xs text-text-secondary">No domains configured — contact admin</span>
              ) : (
                partner.allowedDomains.map((d) => (
                  <Badge key={d} variant="outline" className="text-xs font-mono">
                    {d}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4" />
            Integration Code
          </CardTitle>
          <CardDescription>
            Add this to your product pages to let shoppers try on items virtually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-text-secondary">1. Create a session (server-side)</p>
              <CopyButton text={apiSnippet} label="Copy" />
            </div>
            <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto font-mono leading-relaxed">
              {apiSnippet}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-text-secondary">2. Open the widget popup (client-side)</p>
              <CopyButton text={embedSnippet} label="Copy" />
            </div>
            <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto font-mono leading-relaxed">
              {embedSnippet}
            </pre>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/connect?session=demo', 'nimaConnect', 'width=640,height=720,resizable=yes')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Preview Widget
          </Button>
        </CardContent>
      </Card>

      {/* Recent try-on logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent API Events</CardTitle>
          <CardDescription>Last 50 events from your integration</CardDescription>
        </CardHeader>
        <CardContent>
          {logs === undefined ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <Plug className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No events yet. Start integrating to see activity here.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className={`w-2 h-2 rounded-full ${log.eventType.includes('fail') ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className={`text-xs font-medium ${EVENT_COLORS[log.eventType as EventType]}`}>
                    {EVENT_LABELS[log.eventType as EventType]}
                  </span>
                  {log.wasAuthenticated && (
                    <Badge variant="outline" className="text-xs">Authenticated</Badge>
                  )}
                  {log.generationTimeMs && (
                    <span className="text-xs text-text-secondary">{log.generationTimeMs}ms</span>
                  )}
                  <span className="ml-auto text-xs text-text-secondary">
                    {formatDate(log.createdAt)} {formatTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {revealKey && (
        <KeyRevealModal apiKey={revealKey} onClose={() => setRevealKey(null)} />
      )}
    </div>
  );
}
