'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Crown, ArrowRight, TrendingUp, Package, Users, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SellerAiChatClient } from '@/components/seller/ai-insights/SellerAiChatClient';

// ─── Premium upgrade CTA ──────────────────────────────────────────────────────

const EXAMPLE_QUESTIONS = [
  {
    icon: TrendingUp,
    question: 'What are my revenue trends this month?',
    answer: 'Your top category, dresses, is up 24% week-over-week driven by 3 products.',
  },
  {
    icon: Package,
    question: 'Which products should I restock?',
    answer: '"Summer Wrap Dress" has 47 saves but is out of stock — high restock urgency.',
  },
  {
    icon: ShoppingBag,
    question: "What's driving my best sales?",
    answer: 'Your top 3 products account for 62% of revenue. Pattern: affordable dresses convert best.',
  },
  {
    icon: Users,
    question: 'How loyal are my customers?',
    answer: '18% repeat buyer rate — above average for a new store. Bundle offers could push this higher.',
  },
];

function PremiumUpgradeCTA({ currentTier }: { currentTier: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto">
            <Crown className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center justify-center gap-3">
              AI Business Insights
              <Badge variant="outline" className="text-sm text-amber-600 border-amber-400">
                Premium
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Chat with an AI analyst that knows your store inside-out — products, revenue,
              customer behaviour, and market trends — all in one conversation.
            </p>
          </div>
        </div>

        {/* Example conversations */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
            Example insights you can ask for
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXAMPLE_QUESTIONS.map(({ icon: Icon, question, answer }) => (
              <div
                key={question}
                className="rounded-xl border bg-card p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">{question}</p>
                </div>
                <div className="flex gap-2 pl-8">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic">{answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border-2 border-amber-200/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 p-6 text-center space-y-4">
          <div>
            <p className="font-semibold">Upgrade to Premium to unlock AI Insights</p>
            <p className="text-sm text-muted-foreground mt-1">
              KES 30,000/month · Cancel anytime
            </p>
          </div>
          <Link href="/seller/billing">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              Upgrade to Premium
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {currentTier !== 'growth' && (
            <p className="text-xs text-muted-foreground">
              Currently on {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}.{' '}
              <Link href="/seller/billing" className="text-primary hover:underline">
                View all plans →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] p-6 gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="flex-1 space-y-4 pt-8">
        <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiInsightsPage() {
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  if (seller === undefined) return <LoadingState />;

  const isPremium = (seller?.tier ?? 'basic') === 'premium';

  if (!isPremium) {
    return <PremiumUpgradeCTA currentTier={seller?.tier ?? 'basic'} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <SellerAiChatClient />
    </div>
  );
}
