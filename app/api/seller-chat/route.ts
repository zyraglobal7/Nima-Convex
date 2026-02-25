import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Reuse same provider logic as main chat route
const getOpenAIProvider = () => {
  const vercelGatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY;
  if (vercelGatewayKey) {
    return createOpenAI({
      apiKey: vercelGatewayKey,
      baseURL: 'https://api.vercel.ai/v1',
    });
  }
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// ─── Context snapshot type ────────────────────────────────────────────────────

interface ProductSummary {
  name: string;
  category: string;
  price: number;
  currency: string;
  inStock: boolean;
  stockQuantity: number | null;
  viewCount: number;
  saveCount: number;
  tryOnCount: number;
  purchaseCount: number;
  cartAddCount: number;
}

interface SellerContext {
  shopInfo: { shopName: string; tier: string; createdAt: string };
  products: ProductSummary[];
  revenueSummary: {
    totalRevenueLast90Days: number;
    totalOrdersLast90Days: number;
    revenueByDay: Record<string, number>;
    categoryRevenueSplit: Record<string, number>;
    topItemsByRevenue: Array<{ name: string; revenue: number }>;
  };
  engagement: {
    topByViews: Array<{ name: string; viewCount: number }>;
    topBySaves: Array<{ name: string; saveCount: number }>;
    totalProducts: number;
    activeProducts: number;
  };
  customerInsights: {
    totalBuyers: number;
    repeatBuyers: number;
    repeatBuyerRate: number;
  };
  platformAggregates: {
    categoryTrends: Array<{
      category: string;
      totalRevenue: number;
      totalOrders: number;
      percentOfPlatform: number;
    }>;
    platformRevenue30d: number;
    topSellingProducts: Array<{ name: string; category: string; unitsSold: number; revenue: number }>;
    topRevenueProducts: Array<{ name: string; category: string; unitsSold: number; revenue: number }>;
    topViewedItems: Array<{ name: string; category: string; viewCount: number }>;
    topSavedItems: Array<{ name: string; category: string; saveCount: number }>;
  };
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSellerSystemPrompt(ctx: SellerContext): string {
  const { shopInfo, products, revenueSummary, engagement, customerInsights, platformAggregates } = ctx;

  const currency = 'KES';

  // Format products list (cap at 50 for token budget)
  const productList = products
    .slice(0, 50)
    .map(
      (p) =>
        `- ${p.name} (${p.category}, ${currency} ${p.price.toLocaleString()}) — ` +
        `views: ${p.viewCount}, saves: ${p.saveCount}, try-ons: ${p.tryOnCount}, purchases: ${p.purchaseCount}` +
        (p.inStock ? '' : ' [OUT OF STOCK]')
    )
    .join('\n');

  // Format revenue by day (last 14 entries)
  const revenueByDayEntries = Object.entries(revenueSummary.revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, rev]) => `  ${date}: ${currency} ${rev.toLocaleString()}`)
    .join('\n');

  // Format category revenue
  const categoryRevenue = Object.entries(revenueSummary.categoryRevenueSplit)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, rev]) => `  ${cat}: ${currency} ${rev.toLocaleString()}`)
    .join('\n');

  // Format top items by revenue
  const topItemsRevenue = revenueSummary.topItemsByRevenue
    .map((i) => `  ${i.name}: ${currency} ${i.revenue.toLocaleString()}`)
    .join('\n');

  // Format platform benchmarks
  const platformBenchmarks = (platformAggregates.categoryTrends ?? [])
    .map((t) => `  ${t.category}: ${t.percentOfPlatform}% of platform revenue (${t.totalOrders} orders)`)
    .join('\n');

  const platformTopSelling = (platformAggregates.topSellingProducts ?? [])
    .map((p) => `  ${p.name} (${p.category}) — ${p.unitsSold} units sold`)
    .join('\n');

  const platformTopRevenue = (platformAggregates.topRevenueProducts ?? [])
    .map((p) => `  ${p.name} (${p.category}) — ${currency} ${p.revenue.toLocaleString()}`)
    .join('\n');

  const platformTopViewed = (platformAggregates.topViewedItems ?? [])
    .map((p) => `  ${p.name} (${p.category}) — ${p.viewCount} views`)
    .join('\n');

  const platformTopSaved = (platformAggregates.topSavedItems ?? [])
    .map((p) => `  ${p.name} (${p.category}) — ${p.saveCount} saves`)
    .join('\n');

  return `You are an AI business analyst for ${shopInfo.shopName}, a seller on Nima fashion marketplace (Kenya).
Your role is to help this seller understand their business performance and take data-driven actions to grow their store.

## Your Capabilities:
- Answer questions about this seller's products, revenue, orders, and engagement
- Share what products and categories are trending platform-wide on Nima
- Identify gaps between what's trending on the platform and what this seller stocks
- Give concrete, actionable advice based on both the seller's own data and platform trends

## Privacy Rules (NON-NEGOTIABLE):
- NEVER reveal which specific seller sells which product — the platform data is anonymous
- NEVER reveal customer names, phone numbers, addresses, or any PII
- You may freely share product names, categories, and aggregate sales numbers from the platform section below — these are anonymised marketplace trends, not tied to any individual seller
- If asked which seller sells a trending product, say you don't have that information

## Advice Guidelines:
- Be specific and actionable (e.g., "Consider restocking [Product X] — it has 45 saves but is out of stock")
- Reference actual numbers from the data when giving advice
- Keep responses concise — use bullet points and bold for emphasis where helpful
- If you don't have data to answer a question, say so clearly rather than speculating
- Format currency as ${currency} with comma-separated thousands

---

## This Seller's Data:

### Shop Profile
- Shop name: ${shopInfo.shopName}
- Tier: Premium
- Member since: ${shopInfo.createdAt}
- Total products: ${engagement.totalProducts} (${engagement.activeProducts} active)

### Revenue Summary (last 90 days)
- Total revenue: ${currency} ${revenueSummary.totalRevenueLast90Days.toLocaleString()}
- Total orders: ${revenueSummary.totalOrdersLast90Days}

### Revenue by Day (last 14 days)
${revenueByDayEntries || '  No data yet'}

### Revenue by Category (last 90 days)
${categoryRevenue || '  No data yet'}

### Top 10 Products by Revenue (last 90 days)
${topItemsRevenue || '  No orders yet'}

### Top 10 Products by Views
${engagement.topByViews.map((p) => `  ${p.name}: ${p.viewCount} views`).join('\n') || '  No view data'}

### Top 10 Products by Saves
${engagement.topBySaves.map((p) => `  ${p.name}: ${p.saveCount} saves`).join('\n') || '  No save data'}

### Customer Insights
- Total unique buyers: ${customerInsights.totalBuyers}
- Repeat buyers: ${customerInsights.repeatBuyers} (${customerInsights.repeatBuyerRate}% repeat rate)

### All Active Products
${productList || '  No active products'}

---

## Nima Platform Trends (last 30 days — anonymous, no seller attribution)

These are marketplace-wide signals. Use them to advise the seller on what's in demand.

### Category Breakdown
${platformBenchmarks || '  No platform data available'}
Platform-wide revenue last 30 days: ${currency} ${platformAggregates.platformRevenue30d.toLocaleString()}

### Top 15 Best-Selling Products by Units Sold
${platformTopSelling || '  No data yet'}

### Top 15 Products by Revenue
${platformTopRevenue || '  No data yet'}

### Top 15 Most-Viewed Products (Demand Signal)
${platformTopViewed || '  No data yet'}

### Top 15 Most-Saved Products (Wishlist Demand)
${platformTopSaved || '  No data yet'}

---

Use the seller's own data AND the platform trends together to give the most useful, actionable insights.
For example: if a product type is trending platform-wide but the seller doesn't stock it, recommend they consider adding it.
If a product they sell appears in the platform top lists, highlight that as a strength.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages, convexToken } = await req.json();

    if (!convexToken) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a per-request Convex client — avoids shared auth state across concurrent requests
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(convexToken);

    // Fetch seller context — auth + premium check happens inside the action
    const context = (await convex.action(api.sellers.aiChatActions.getSellerAiContext, {})) as SellerContext;

    const systemPrompt = buildSellerSystemPrompt(context);
    const openai = getOpenAIProvider();

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      temperature: 0.4,
      maxOutputTokens: 800,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    // Surface premium-gate errors to the client
    if (msg.includes('Premium')) {
      return new Response(JSON.stringify({ error: 'Premium subscription required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? msg : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
