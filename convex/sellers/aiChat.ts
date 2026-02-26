import { internalQuery, mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function getAuthenticatedSeller(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Not authenticated');

  const user = await ctx.db
    .query('users')
    .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
    .unique();
  if (!user) throw new ConvexError('User not found');

  const seller = await ctx.db
    .query('sellers')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique();
  if (!seller) throw new ConvexError('Seller not found');

  return seller;
}

async function getPremiumSeller(ctx: QueryCtx | MutationCtx) {
  const seller = await getAuthenticatedSeller(ctx);
  const tier = seller.tier ?? 'basic';
  if (tier !== 'premium') {
    throw new ConvexError('AI Insights requires a Premium subscription');
  }
  return seller;
}

// ─── Context builder (internal query) ────────────────────────────────────────

export const buildSellerContext = internalQuery({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const seller = await getPremiumSeller(ctx);

    const shopInfo = {
      shopName: seller.shopName,
      tier: seller.tier ?? 'basic',
      createdAt: new Date(seller.createdAt).toISOString().split('T')[0],
    };

    // Products
    const allItems = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const activeItems = allItems.filter((i) => i.isActive);

    const products = activeItems.map((item) => ({
      name: item.name,
      category: item.category,
      price: item.price,
      currency: item.currency,
      inStock: item.inStock,
      stockQuantity: item.stockQuantity ?? null,
      viewCount: item.viewCount ?? 0,
      saveCount: item.saveCount ?? 0,
      tryOnCount: item.tryOnCount ?? 0,
      purchaseCount: item.purchaseCount ?? 0,
      cartAddCount: item.cartAddCount ?? 0,
    }));

    // Order items (last 90 days)
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .filter((q) => q.gte(q.field('createdAt'), cutoff))
      .collect();

    const nonCancelledOrders = orderItems.filter((oi) => oi.fulfillmentStatus !== 'cancelled');

    const totalRevenue = nonCancelledOrders.reduce((sum, oi) => sum + oi.lineTotal, 0) / 100;
    const uniqueOrderIds = new Set(nonCancelledOrders.map((oi) => oi.orderId));
    const totalOrders = uniqueOrderIds.size;

    // Revenue by day (last 30 days)
    const thirtyDaysCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentOrderItems = nonCancelledOrders.filter((oi) => oi.createdAt >= thirtyDaysCutoff);

    const dailyRevenue: Record<string, number> = {};
    for (const oi of recentOrderItems) {
      const date = new Date(oi.createdAt).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] ?? 0) + oi.lineTotal / 100;
    }

    // Revenue by category
    const categoryRevenue: Record<string, number> = {};
    for (const oi of nonCancelledOrders) {
      const item = allItems.find((i) => i._id === oi.itemId);
      const cat = item?.category ?? 'unknown';
      categoryRevenue[cat] = (categoryRevenue[cat] ?? 0) + oi.lineTotal / 100;
    }

    // Top items by revenue
    const itemRevenue: Record<string, number> = {};
    for (const oi of nonCancelledOrders) {
      itemRevenue[oi.itemName] = (itemRevenue[oi.itemName] ?? 0) + oi.lineTotal / 100;
    }
    const topItemsByRevenue = Object.entries(itemRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, revenue]) => ({ name, revenue }));

    const topByViews = [...products]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10)
      .map((p) => ({ name: p.name, viewCount: p.viewCount }));

    const topBySaves = [...products]
      .sort((a, b) => b.saveCount - a.saveCount)
      .slice(0, 10)
      .map((p) => ({ name: p.name, saveCount: p.saveCount }));

    // Unique buyers
    const buyerUserIds = new Set<string>();
    const buyerOrderCounts: Record<string, number> = {};

    for (const orderId of uniqueOrderIds) {
      const order = await ctx.db.get(orderId as Id<'orders'>);
      if (order) {
        const uid = order.userId.toString();
        buyerUserIds.add(uid);
        buyerOrderCounts[uid] = (buyerOrderCounts[uid] ?? 0) + 1;
      }
    }

    const totalBuyers = buyerUserIds.size;
    const repeatBuyers = Object.values(buyerOrderCounts).filter((c) => c > 1).length;
    const repeatBuyerRate = totalBuyers > 0 ? Math.round((repeatBuyers / totalBuyers) * 100) : 0;

    // ── Customer Demographics ─────────────────────────────────────────────────
    // Aggregate gender, age buckets, budget range, and top style preferences
    // across all unique buyers — no individual PII, only anonymised counts/pcts.
    const gender = { male: 0, female: 0, preferNotToSay: 0, unknown: 0 };
    const AGE_BUCKETS = [
      { label: 'Under 18', min: 0,  max: 17 },
      { label: '18-24',    min: 18, max: 24 },
      { label: '25-34',    min: 25, max: 34 },
      { label: '35-44',    min: 35, max: 44 },
      { label: '45-54',    min: 45, max: 54 },
      { label: '55+',      min: 55, max: Infinity },
    ];
    const ageCounts: number[] = Array(AGE_BUCKETS.length).fill(0);
    let ageKnown = 0;
    const budgetBreakdown = { low: 0, mid: 0, premium: 0, unknown: 0 };
    const styleCounts: Record<string, number> = {};

    for (const uid of buyerUserIds) {
      const u = await ctx.db.get(uid as unknown as Id<'users'>);
      if (!u) continue;
      // Gender
      if (u.gender === 'male') gender.male++;
      else if (u.gender === 'female') gender.female++;
      else if (u.gender === 'prefer-not-to-say') gender.preferNotToSay++;
      else gender.unknown++;
      // Age
      const parsed = u.age ? parseInt(u.age, 10) : NaN;
      if (!isNaN(parsed)) {
        ageKnown++;
        const idx = AGE_BUCKETS.findIndex((b) => parsed >= b.min && parsed <= b.max);
        if (idx !== -1) ageCounts[idx]++;
      }
      // Budget
      if (u.budgetRange === 'low') budgetBreakdown.low++;
      else if (u.budgetRange === 'mid') budgetBreakdown.mid++;
      else if (u.budgetRange === 'premium') budgetBreakdown.premium++;
      else budgetBreakdown.unknown++;
      // Styles
      for (const style of u.stylePreferences ?? []) {
        styleCounts[style] = (styleCounts[style] ?? 0) + 1;
      }
    }

    const ageBuckets = AGE_BUCKETS
      .map((b, i) => ({
        label: b.label,
        count: ageCounts[i],
        pct: ageKnown > 0 ? Math.round((ageCounts[i] / ageKnown) * 100) : 0,
      }))
      .filter((b) => b.count > 0);

    const topStyles = Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([style, count]) => ({
        style,
        pct: totalBuyers > 0 ? Math.round((count / totalBuyers) * 100) : 0,
      }));

    return {
      shopInfo,
      products,
      revenueSummary: {
        totalRevenueLast90Days: Math.round(totalRevenue),
        totalOrdersLast90Days: totalOrders,
        revenueByDay: dailyRevenue,
        categoryRevenueSplit: categoryRevenue,
        topItemsByRevenue,
      },
      engagement: {
        topByViews,
        topBySaves,
        totalProducts: allItems.length,
        activeProducts: activeItems.length,
      },
      customerInsights: {
        totalBuyers,
        repeatBuyers,
        repeatBuyerRate,
        demographics: {
          gender,
          ageBuckets,
          budgetBreakdown,
          topStyles,
        },
      },
    };
  },
});

// ─── Platform aggregates (internal query) ────────────────────────────────────

export const getPlatformAggregates = internalQuery({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const recentOrderItems = await ctx.db
      .query('order_items')
      .filter((q) => q.gte(q.field('createdAt'), cutoff))
      .collect();

    const nonCancelled = recentOrderItems.filter((oi) => oi.fulfillmentStatus !== 'cancelled');
    const platformTotal = nonCancelled.reduce((sum, oi) => sum + oi.lineTotal, 0) / 100;

    // Category-level revenue aggregates
    const categoryData: Record<string, { revenue: number; orders: Set<string> }> = {};
    // Product-level aggregates — item name only, no seller info
    const productSalesData: Record<string, { revenue: number; unitsSold: number; category: string }> = {};

    for (const oi of nonCancelled) {
      const item = await ctx.db.get(oi.itemId);
      const cat = item?.category ?? 'unknown';

      // Category roll-up
      if (!categoryData[cat]) {
        categoryData[cat] = { revenue: 0, orders: new Set() };
      }
      categoryData[cat].revenue += oi.lineTotal / 100;
      categoryData[cat].orders.add(oi.orderId);

      // Product roll-up by item name (strips seller identity)
      const productKey = oi.itemName;
      if (!productSalesData[productKey]) {
        productSalesData[productKey] = { revenue: 0, unitsSold: 0, category: cat };
      }
      productSalesData[productKey].revenue += oi.lineTotal / 100;
      productSalesData[productKey].unitsSold += oi.quantity;
    }

    const categoryTrends = Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        totalRevenue: Math.round(data.revenue),
        totalOrders: data.orders.size,
        percentOfPlatform: platformTotal > 0 ? Math.round((data.revenue / platformTotal) * 100) : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Top 15 best-selling products platform-wide by units sold — no seller attribution
    const topSellingProducts = Object.entries(productSalesData)
      .sort(([, a], [, b]) => b.unitsSold - a.unitsSold)
      .slice(0, 15)
      .map(([name, data]) => ({
        name,
        category: data.category,
        unitsSold: data.unitsSold,
        revenue: Math.round(data.revenue),
      }));

    // Top 15 by revenue
    const topRevenueProducts = Object.entries(productSalesData)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 15)
      .map(([name, data]) => ({
        name,
        category: data.category,
        unitsSold: data.unitsSold,
        revenue: Math.round(data.revenue),
      }));

    // Most-viewed items platform-wide (engagement signal)
    const allActiveItems = await ctx.db
      .query('items')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();

    const topViewedItems = [...allActiveItems]
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 15)
      .map((i) => ({ name: i.name, category: i.category, viewCount: i.viewCount ?? 0 }));

    const topSavedItems = [...allActiveItems]
      .sort((a, b) => (b.saveCount ?? 0) - (a.saveCount ?? 0))
      .slice(0, 15)
      .map((i) => ({ name: i.name, category: i.category, saveCount: i.saveCount ?? 0 }));

    return {
      categoryTrends,
      platformRevenue30d: Math.round(platformTotal),
      topSellingProducts,
      topRevenueProducts,
      topViewedItems,
      topSavedItems,
    };
  },
});

// ─── Chat history query ───────────────────────────────────────────────────────

export const getSellerChatHistory = query({
  args: {},
  returns: v.union(
    v.array(
      v.object({
        _id: v.id('seller_chat_messages'),
        role: v.union(v.literal('user'), v.literal('assistant')),
        content: v.string(),
        createdAt: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return null;

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();
    if (!seller || (seller.tier ?? 'basic') !== 'premium') return null;

    const messages = await ctx.db
      .query('seller_chat_messages')
      .withIndex('by_seller_and_created', (q) => q.eq('sellerId', seller._id))
      .order('asc')
      .take(50);

    return messages.map((m) => ({
      _id: m._id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
  },
});

// ─── Chat history mutations ───────────────────────────────────────────────────

export const saveSellerChatMessage = mutation({
  args: {
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
  },
  returns: v.id('seller_chat_messages'),
  handler: async (ctx: MutationCtx, args) => {
    const seller = await getPremiumSeller(ctx);
    return await ctx.db.insert('seller_chat_messages', {
      sellerId: seller._id,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const clearSellerChatHistory = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx: MutationCtx) => {
    const seller = await getPremiumSeller(ctx);

    const messages = await ctx.db
      .query('seller_chat_messages')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
    return null;
  },
});
