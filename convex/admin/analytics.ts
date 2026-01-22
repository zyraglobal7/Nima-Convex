import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// =============================================================================
// ANALYTICS SUMMARY (Dashboard Overview)
// =============================================================================

/**
 * Get summary analytics for the main dashboard
 * Returns key metrics for all categories
 */
export const getAnalyticsSummary = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    tryOns: v.object({
      total: v.number(),
      successRate: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
    looks: v.object({
      total: v.number(),
      saved: v.number(),
      discarded: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
    users: v.object({
      total: v.number(),
      newInPeriod: v.number(),
      activeInPeriod: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
    saves: v.object({
      total: v.number(),
      lookbooksCreated: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
    social: v.object({
      friendships: v.number(),
      directMessages: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
    cart: v.object({
      totalItems: v.number(),
      totalValue: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
    chat: v.object({
      threads: v.number(),
      messages: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
    interactions: v.object({
      total: v.number(),
      loves: v.number(),
      saves: v.number(),
      trend: v.array(v.object({ date: v.string(), count: v.number() })),
    }),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    tryOns: {
      total: number;
      successRate: number;
      trend: Array<{ date: string; count: number }>;
    };
    looks: {
      total: number;
      saved: number;
      discarded: number;
      trend: Array<{ date: string; count: number }>;
    };
    users: {
      total: number;
      newInPeriod: number;
      activeInPeriod: number;
      trend: Array<{ date: string; count: number }>;
    };
    saves: {
      total: number;
      lookbooksCreated: number;
      trend: Array<{ date: string; count: number }>;
    };
    social: {
      friendships: number;
      directMessages: number;
      trend: Array<{ date: string; count: number }>;
    };
    cart: {
      totalItems: number;
      totalValue: number;
      trend: Array<{ date: string; count: number }>;
    };
    chat: {
      threads: number;
      messages: number;
      trend: Array<{ date: string; count: number }>;
    };
    interactions: {
      total: number;
      loves: number;
      saves: number;
      trend: Array<{ date: string; count: number }>;
    };
  }> => {
    const { startDate, endDate } = args;

    // Helper to generate date trend
    const generateTrend = (
      items: Array<{ createdAt: number }>,
      start: number,
      end: number
    ): Array<{ date: string; count: number }> => {
      const dayMs = 24 * 60 * 60 * 1000;
      const days = Math.ceil((end - start) / dayMs);
      const trendMap: Record<string, number> = {};

      // Initialize all days
      for (let i = 0; i <= days; i++) {
        const date = new Date(start + i * dayMs);
        const dateStr = date.toISOString().split('T')[0];
        trendMap[dateStr] = 0;
      }

      // Count items per day
      for (const item of items) {
        if (item.createdAt >= start && item.createdAt <= end) {
          const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
          if (trendMap[dateStr] !== undefined) {
            trendMap[dateStr]++;
          }
        }
      }

      return Object.entries(trendMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    // Try-ons
    const allItemTryOns = await ctx.db.query('item_try_ons').collect();
    const periodTryOns = allItemTryOns.filter(
      (t) => t.createdAt >= startDate && t.createdAt <= endDate
    );
    const completedTryOns = periodTryOns.filter((t) => t.status === 'completed');
    const tryOnSuccessRate =
      periodTryOns.length > 0
        ? Math.round((completedTryOns.length / periodTryOns.length) * 100)
        : 0;

    // Looks
    const allLooks = await ctx.db.query('looks').collect();
    const periodLooks = allLooks.filter(
      (l) => l.createdAt >= startDate && l.createdAt <= endDate
    );
    const savedLooks = periodLooks.filter((l) => l.status === 'saved');
    const discardedLooks = periodLooks.filter((l) => l.status === 'discarded');

    // Users
    const allUsers = await ctx.db.query('users').collect();
    const newUsers = allUsers.filter(
      (u) => u.createdAt >= startDate && u.createdAt <= endDate
    );
    // Active users = users who have any activity in the period
    const activeUserIds = new Set<string>();
    for (const tryOn of periodTryOns) {
      activeUserIds.add(tryOn.userId);
    }
    for (const look of periodLooks) {
      if (look.creatorUserId) {
        activeUserIds.add(look.creatorUserId);
      }
    }

    // Saves (lookbook items)
    const allLookbookItems = await ctx.db.query('lookbook_items').collect();
    const periodSaves = allLookbookItems.filter(
      (s) => s.createdAt >= startDate && s.createdAt <= endDate
    );
    const allLookbooks = await ctx.db.query('lookbooks').collect();
    const periodLookbooks = allLookbooks.filter(
      (lb) => lb.createdAt >= startDate && lb.createdAt <= endDate
    );

    // Social
    const allFriendships = await ctx.db.query('friendships').collect();
    const periodFriendships = allFriendships.filter(
      (f) => f.createdAt >= startDate && f.createdAt <= endDate
    );
    const allDMs = await ctx.db.query('direct_messages').collect();
    const periodDMs = allDMs.filter(
      (dm) => dm.createdAt >= startDate && dm.createdAt <= endDate
    );

    // Cart
    const allCartItems = await ctx.db.query('cart_items').collect();
    const periodCartItems = allCartItems.filter(
      (c) => c.addedAt >= startDate && c.addedAt <= endDate
    );
    let cartTotalValue = 0;
    for (const cartItem of periodCartItems) {
      const item = await ctx.db.get(cartItem.itemId);
      if (item) {
        cartTotalValue += item.price * cartItem.quantity;
      }
    }

    // Chat
    const allThreads = await ctx.db.query('threads').collect();
    const periodThreads = allThreads.filter(
      (t) => t.createdAt >= startDate && t.createdAt <= endDate
    );
    const allMessages = await ctx.db.query('messages').collect();
    const periodMessages = allMessages.filter(
      (m) => m.createdAt >= startDate && m.createdAt <= endDate
    );

    // Look Interactions
    const allInteractions = await ctx.db.query('look_interactions').collect();
    const periodInteractions = allInteractions.filter(
      (i) => i.createdAt >= startDate && i.createdAt <= endDate
    );
    const interactionLoves = periodInteractions.filter((i) => i.interactionType === 'love');
    const interactionSaves = periodInteractions.filter((i) => i.interactionType === 'save');

    return {
      tryOns: {
        total: periodTryOns.length,
        successRate: tryOnSuccessRate,
        trend: generateTrend(
          periodTryOns.map((t) => ({ createdAt: t.createdAt })),
          startDate,
          endDate
        ),
      },
      looks: {
        total: periodLooks.length,
        saved: savedLooks.length,
        discarded: discardedLooks.length,
        trend: generateTrend(
          periodLooks.map((l) => ({ createdAt: l.createdAt })),
          startDate,
          endDate
        ),
      },
      users: {
        total: allUsers.length,
        newInPeriod: newUsers.length,
        activeInPeriod: activeUserIds.size,
        trend: generateTrend(
          newUsers.map((u) => ({ createdAt: u.createdAt })),
          startDate,
          endDate
        ),
      },
      saves: {
        total: periodSaves.length,
        lookbooksCreated: periodLookbooks.length,
        trend: generateTrend(
          periodSaves.map((s) => ({ createdAt: s.createdAt })),
          startDate,
          endDate
        ),
      },
      social: {
        friendships: periodFriendships.length,
        directMessages: periodDMs.length,
        trend: generateTrend(
          periodFriendships.map((f) => ({ createdAt: f.createdAt })),
          startDate,
          endDate
        ),
      },
      cart: {
        totalItems: periodCartItems.reduce((sum, c) => sum + c.quantity, 0),
        totalValue: cartTotalValue,
        trend: generateTrend(
          periodCartItems.map((c) => ({ createdAt: c.addedAt })),
          startDate,
          endDate
        ),
      },
      chat: {
        threads: periodThreads.length,
        messages: periodMessages.length,
        trend: generateTrend(
          periodMessages.map((m) => ({ createdAt: m.createdAt })),
          startDate,
          endDate
        ),
      },
      interactions: {
        total: periodInteractions.length,
        loves: interactionLoves.length,
        saves: interactionSaves.length,
        trend: generateTrend(
          periodInteractions.map((i) => ({ createdAt: i.createdAt })),
          startDate,
          endDate
        ),
      },
    };
  },
});

// =============================================================================
// TRY-ON ANALYTICS
// =============================================================================

export const getTryOnAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    total: v.number(),
    completed: v.number(),
    failed: v.number(),
    pending: v.number(),
    successRate: v.number(),
    byCategory: v.array(v.object({ category: v.string(), count: v.number() })),
    topItems: v.array(
      v.object({ itemId: v.string(), name: v.string(), count: v.number() })
    ),
    byStatus: v.array(v.object({ status: v.string(), count: v.number() })),
    trend: v.array(v.object({ date: v.string(), count: v.number() })),
    byProvider: v.array(v.object({ provider: v.string(), count: v.number(), successRate: v.number() })),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    successRate: number;
    byCategory: Array<{ category: string; count: number }>;
    topItems: Array<{ itemId: string; name: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
    byProvider: Array<{ provider: string; count: number; successRate: number }>;
  }> => {
    const { startDate, endDate } = args;

    const allTryOns = await ctx.db.query('item_try_ons').collect();
    const periodTryOns = allTryOns.filter(
      (t) => t.createdAt >= startDate && t.createdAt <= endDate
    );

    const completed = periodTryOns.filter((t) => t.status === 'completed').length;
    const failed = periodTryOns.filter((t) => t.status === 'failed').length;
    const pending = periodTryOns.filter(
      (t) => t.status === 'pending' || t.status === 'processing'
    ).length;

    // By category
    const itemIds = [...new Set(periodTryOns.map((t) => t.itemId))];
    const items = await Promise.all(itemIds.map((id) => ctx.db.get(id)));
    const itemMap = new Map(items.filter(Boolean).map((i) => [i!._id, i!]));

    const categoryCount: Record<string, number> = {};
    const itemCount: Record<string, number> = {};

    for (const tryOn of periodTryOns) {
      const item = itemMap.get(tryOn.itemId);
      if (item) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        const key = tryOn.itemId;
        itemCount[key] = (itemCount[key] || 0) + 1;
      }
    }

    const byCategory = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const topItems = Object.entries(itemCount)
      .map(([itemId, count]) => {
        const item = itemMap.get(itemId as Id<'items'>);
        return { itemId, name: item?.name || 'Unknown', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By status
    const statusCount: Record<string, number> = {};
    for (const tryOn of periodTryOns) {
      statusCount[tryOn.status] = (statusCount[tryOn.status] || 0) + 1;
    }
    const byStatus = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }));

    // By provider
    const providerStats: Record<string, { total: number; completed: number }> = {};
    for (const tryOn of periodTryOns) {
      const provider = tryOn.generationProvider || 'unknown';
      if (!providerStats[provider]) {
        providerStats[provider] = { total: 0, completed: 0 };
      }
      providerStats[provider].total++;
      if (tryOn.status === 'completed') {
        providerStats[provider].completed++;
      }
    }
    const byProvider = Object.entries(providerStats).map(([provider, stats]) => ({
      provider,
      count: stats.total,
      successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));

    // Trend
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);
    const trendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      trendMap[dateStr] = 0;
    }

    for (const tryOn of periodTryOns) {
      const dateStr = new Date(tryOn.createdAt).toISOString().split('T')[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr]++;
      }
    }

    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: periodTryOns.length,
      completed,
      failed,
      pending,
      successRate: periodTryOns.length > 0 ? Math.round((completed / periodTryOns.length) * 100) : 0,
      byCategory,
      topItems,
      byStatus,
      trend,
      byProvider,
    };
  },
});

// =============================================================================
// LOOKS ANALYTICS
// =============================================================================

export const getLooksAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    total: v.number(),
    saved: v.number(),
    discarded: v.number(),
    pending: v.number(),
    publicLooks: v.number(),
    sharedWithFriends: v.number(),
    byOccasion: v.array(v.object({ occasion: v.string(), count: v.number() })),
    byStyleTag: v.array(v.object({ tag: v.string(), count: v.number() })),
    byStatus: v.array(v.object({ status: v.string(), count: v.number() })),
    byCreationSource: v.array(v.object({ source: v.string(), count: v.number() })),
    trend: v.array(v.object({ date: v.string(), count: v.number() })),
    generationSuccessRate: v.number(),
    avgItemsPerLook: v.number(),
    // Detailed source counts
    chatCreated: v.number(),
    apparelCreated: v.number(),
    recreatedLooks: v.number(),
    sharedLooks: v.number(),
    systemCreated: v.number(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    total: number;
    saved: number;
    discarded: number;
    pending: number;
    publicLooks: number;
    sharedWithFriends: number;
    byOccasion: Array<{ occasion: string; count: number }>;
    byStyleTag: Array<{ tag: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    byCreationSource: Array<{ source: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
    generationSuccessRate: number;
    avgItemsPerLook: number;
    chatCreated: number;
    apparelCreated: number;
    recreatedLooks: number;
    sharedLooks: number;
    systemCreated: number;
  }> => {
    const { startDate, endDate } = args;

    const allLooks = await ctx.db.query('looks').collect();
    const periodLooks = allLooks.filter(
      (l) => l.createdAt >= startDate && l.createdAt <= endDate
    );

    const saved = periodLooks.filter((l) => l.status === 'saved').length;
    const discarded = periodLooks.filter((l) => l.status === 'discarded').length;
    const pending = periodLooks.filter((l) => l.status === 'pending').length;
    const publicLooks = periodLooks.filter((l) => l.isPublic).length;
    const sharedWithFriends = periodLooks.filter((l) => l.sharedWithFriends).length;

    // By occasion
    const occasionCount: Record<string, number> = {};
    for (const look of periodLooks) {
      const occasion = look.occasion || 'Unspecified';
      occasionCount[occasion] = (occasionCount[occasion] || 0) + 1;
    }
    const byOccasion = Object.entries(occasionCount)
      .map(([occasion, count]) => ({ occasion, count }))
      .sort((a, b) => b.count - a.count);

    // By style tag
    const tagCount: Record<string, number> = {};
    for (const look of periodLooks) {
      for (const tag of look.styleTags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }
    const byStyleTag = Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By status
    const statusCount: Record<string, number> = {};
    for (const look of periodLooks) {
      const status = look.status || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    }
    const byStatus = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }));

    // Generation success rate
    const withGenerationStatus = periodLooks.filter((l) => l.generationStatus);
    const completedGeneration = withGenerationStatus.filter(
      (l) => l.generationStatus === 'completed'
    ).length;
    const generationSuccessRate =
      withGenerationStatus.length > 0
        ? Math.round((completedGeneration / withGenerationStatus.length) * 100)
        : 0;

    // Avg items per look
    const totalItems = periodLooks.reduce((sum, l) => sum + l.itemIds.length, 0);
    const avgItemsPerLook =
      periodLooks.length > 0 ? Math.round((totalItems / periodLooks.length) * 10) / 10 : 0;

    // Trend
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);
    const trendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      trendMap[dateStr] = 0;
    }

    for (const look of periodLooks) {
      const dateStr = new Date(look.createdAt).toISOString().split('T')[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr]++;
      }
    }

    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By creation source
    const sourceCount: Record<string, number> = {};
    for (const look of periodLooks) {
      const source = look.creationSource || 'system';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    }
    const byCreationSource = Object.entries(sourceCount)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // Detailed source counts
    const chatCreated = periodLooks.filter((l) => l.creationSource === 'chat').length;
    const apparelCreated = periodLooks.filter((l) => l.creationSource === 'apparel').length;
    const recreatedLooks = periodLooks.filter((l) => l.creationSource === 'recreated').length;
    const sharedLooks = periodLooks.filter((l) => l.creationSource === 'shared').length;
    const systemCreated = periodLooks.filter((l) => !l.creationSource || l.creationSource === 'system').length;

    return {
      total: periodLooks.length,
      saved,
      discarded,
      pending,
      publicLooks,
      sharedWithFriends,
      byOccasion,
      byStyleTag,
      byStatus,
      byCreationSource,
      trend,
      generationSuccessRate,
      avgItemsPerLook,
      chatCreated,
      apparelCreated,
      recreatedLooks,
      sharedLooks,
      systemCreated,
    };
  },
});

// =============================================================================
// USER ANALYTICS
// =============================================================================

export const getUserAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    total: v.number(),
    newInPeriod: v.number(),
    activeInPeriod: v.number(),
    onboardingCompleted: v.number(),
    byGender: v.array(v.object({ gender: v.string(), count: v.number() })),
    bySubscription: v.array(v.object({ tier: v.string(), count: v.number() })),
    byBudget: v.array(v.object({ budget: v.string(), count: v.number() })),
    byCountry: v.array(v.object({ country: v.string(), count: v.number() })),
    trend: v.array(v.object({ date: v.string(), count: v.number() })),
    avgStylePreferences: v.number(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    total: number;
    newInPeriod: number;
    activeInPeriod: number;
    onboardingCompleted: number;
    byGender: Array<{ gender: string; count: number }>;
    bySubscription: Array<{ tier: string; count: number }>;
    byBudget: Array<{ budget: string; count: number }>;
    byCountry: Array<{ country: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
    avgStylePreferences: number;
  }> => {
    const { startDate, endDate } = args;

    const allUsers = await ctx.db.query('users').collect();
    const newUsers = allUsers.filter(
      (u) => u.createdAt >= startDate && u.createdAt <= endDate
    );

    // Active users calculation
    const allTryOns = await ctx.db.query('item_try_ons').collect();
    const periodTryOns = allTryOns.filter(
      (t) => t.createdAt >= startDate && t.createdAt <= endDate
    );
    const allLooks = await ctx.db.query('looks').collect();
    const periodLooks = allLooks.filter(
      (l) => l.createdAt >= startDate && l.createdAt <= endDate
    );
    const allMessages = await ctx.db.query('messages').collect();
    const periodMessages = allMessages.filter(
      (m) => m.createdAt >= startDate && m.createdAt <= endDate
    );

    const activeUserIds = new Set<string>();
    for (const tryOn of periodTryOns) {
      activeUserIds.add(tryOn.userId);
    }
    for (const look of periodLooks) {
      if (look.creatorUserId) {
        activeUserIds.add(look.creatorUserId);
      }
    }
    for (const message of periodMessages) {
      activeUserIds.add(message.userId);
    }

    // By gender
    const genderCount: Record<string, number> = {};
    for (const user of allUsers) {
      const gender = user.gender || 'Not specified';
      genderCount[gender] = (genderCount[gender] || 0) + 1;
    }
    const byGender = Object.entries(genderCount).map(([gender, count]) => ({
      gender,
      count,
    }));

    // By subscription
    const subCount: Record<string, number> = {};
    for (const user of allUsers) {
      subCount[user.subscriptionTier] = (subCount[user.subscriptionTier] || 0) + 1;
    }
    const bySubscription = Object.entries(subCount).map(([tier, count]) => ({
      tier,
      count,
    }));

    // By budget
    const budgetCount: Record<string, number> = {};
    for (const user of allUsers) {
      const budget = user.budgetRange || 'Not specified';
      budgetCount[budget] = (budgetCount[budget] || 0) + 1;
    }
    const byBudget = Object.entries(budgetCount).map(([budget, count]) => ({
      budget,
      count,
    }));

    // By country
    const countryCount: Record<string, number> = {};
    for (const user of allUsers) {
      const country = user.country || 'Unknown';
      countryCount[country] = (countryCount[country] || 0) + 1;
    }
    const byCountry = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Onboarding completed
    const onboardingCompleted = allUsers.filter((u) => u.onboardingCompleted).length;

    // Avg style preferences
    const totalPrefs = allUsers.reduce((sum, u) => sum + u.stylePreferences.length, 0);
    const avgStylePreferences =
      allUsers.length > 0 ? Math.round((totalPrefs / allUsers.length) * 10) / 10 : 0;

    // Trend
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);
    const trendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      trendMap[dateStr] = 0;
    }

    for (const user of newUsers) {
      const dateStr = new Date(user.createdAt).toISOString().split('T')[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr]++;
      }
    }

    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: allUsers.length,
      newInPeriod: newUsers.length,
      activeInPeriod: activeUserIds.size,
      onboardingCompleted,
      byGender,
      bySubscription,
      byBudget,
      byCountry,
      trend,
      avgStylePreferences,
    };
  },
});

// =============================================================================
// SAVES ANALYTICS
// =============================================================================

export const getSavesAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    total: v.number(),
    looksSaved: v.number(),
    itemsSaved: v.number(),
    lookbooksCreated: v.number(),
    avgItemsPerLookbook: v.number(),
    topSavedItems: v.array(
      v.object({ itemId: v.string(), name: v.string(), count: v.number() })
    ),
    topSavedLooks: v.array(
      v.object({ lookId: v.string(), name: v.string(), count: v.number() })
    ),
    byCategory: v.array(v.object({ category: v.string(), count: v.number() })),
    trend: v.array(v.object({ date: v.string(), count: v.number() })),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    total: number;
    looksSaved: number;
    itemsSaved: number;
    lookbooksCreated: number;
    avgItemsPerLookbook: number;
    topSavedItems: Array<{ itemId: string; name: string; count: number }>;
    topSavedLooks: Array<{ lookId: string; name: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
  }> => {
    const { startDate, endDate } = args;

    const allLookbookItems = await ctx.db.query('lookbook_items').collect();
    const periodSaves = allLookbookItems.filter(
      (s) => s.createdAt >= startDate && s.createdAt <= endDate
    );

    const looksSaved = periodSaves.filter((s) => s.itemType === 'look').length;
    const itemsSaved = periodSaves.filter((s) => s.itemType === 'item').length;

    const allLookbooks = await ctx.db.query('lookbooks').collect();
    const periodLookbooks = allLookbooks.filter(
      (lb) => lb.createdAt >= startDate && lb.createdAt <= endDate
    );

    // Avg items per lookbook
    const totalItemsInLookbooks = allLookbooks.reduce((sum, lb) => sum + lb.itemCount, 0);
    const avgItemsPerLookbook =
      allLookbooks.length > 0
        ? Math.round((totalItemsInLookbooks / allLookbooks.length) * 10) / 10
        : 0;

    // Top saved items
    const itemSaves = periodSaves.filter((s) => s.itemType === 'item' && s.itemId);
    const itemSaveCount: Record<string, number> = {};
    for (const save of itemSaves) {
      if (save.itemId) {
        itemSaveCount[save.itemId] = (itemSaveCount[save.itemId] || 0) + 1;
      }
    }
    const topItemIds = Object.entries(itemSaveCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topItems = await Promise.all(
      topItemIds.map(async ([id, count]) => {
        const item = await ctx.db.get(id as Id<'items'>);
        return { itemId: id, name: item?.name || 'Unknown', count };
      })
    );

    // Top saved looks
    const lookSaves = periodSaves.filter((s) => s.itemType === 'look' && s.lookId);
    const lookSaveCount: Record<string, number> = {};
    for (const save of lookSaves) {
      if (save.lookId) {
        lookSaveCount[save.lookId] = (lookSaveCount[save.lookId] || 0) + 1;
      }
    }
    const topLookIds = Object.entries(lookSaveCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topLooks = await Promise.all(
      topLookIds.map(async ([id, count]) => {
        const look = await ctx.db.get(id as Id<'looks'>);
        return { lookId: id, name: look?.name || `Look ${look?.publicId || id}`, count };
      })
    );

    // By category (for item saves)
    const categoryCount: Record<string, number> = {};
    for (const save of itemSaves) {
      if (save.itemId) {
        const item = await ctx.db.get(save.itemId);
        if (item) {
          categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        }
      }
    }
    const byCategory = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Trend
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);
    const trendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      trendMap[dateStr] = 0;
    }

    for (const save of periodSaves) {
      const dateStr = new Date(save.createdAt).toISOString().split('T')[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr]++;
      }
    }

    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: periodSaves.length,
      looksSaved,
      itemsSaved,
      lookbooksCreated: periodLookbooks.length,
      avgItemsPerLookbook,
      topSavedItems: topItems,
      topSavedLooks: topLooks,
      byCategory,
      trend,
    };
  },
});

// =============================================================================
// SOCIAL ANALYTICS
// =============================================================================

export const getSocialAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalFriendships: v.number(),
    acceptedFriendships: v.number(),
    pendingRequests: v.number(),
    directMessagesSent: v.number(),
    directMessagesRead: v.number(),
    avgFriendsPerUser: v.number(),
    byStatus: v.array(v.object({ status: v.string(), count: v.number() })),
    friendshipTrend: v.array(v.object({ date: v.string(), count: v.number() })),
    messageTrend: v.array(v.object({ date: v.string(), count: v.number() })),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    totalFriendships: number;
    acceptedFriendships: number;
    pendingRequests: number;
    directMessagesSent: number;
    directMessagesRead: number;
    avgFriendsPerUser: number;
    byStatus: Array<{ status: string; count: number }>;
    friendshipTrend: Array<{ date: string; count: number }>;
    messageTrend: Array<{ date: string; count: number }>;
  }> => {
    const { startDate, endDate } = args;

    const allFriendships = await ctx.db.query('friendships').collect();
    const periodFriendships = allFriendships.filter(
      (f) => f.createdAt >= startDate && f.createdAt <= endDate
    );

    const acceptedFriendships = periodFriendships.filter(
      (f) => f.status === 'accepted'
    ).length;
    const pendingRequests = periodFriendships.filter(
      (f) => f.status === 'pending'
    ).length;

    const allDMs = await ctx.db.query('direct_messages').collect();
    const periodDMs = allDMs.filter(
      (dm) => dm.createdAt >= startDate && dm.createdAt <= endDate
    );
    const readDMs = periodDMs.filter((dm) => dm.isRead).length;

    // Avg friends per user
    const allUsers = await ctx.db.query('users').collect();
    const acceptedAll = allFriendships.filter((f) => f.status === 'accepted');
    const avgFriendsPerUser =
      allUsers.length > 0
        ? Math.round(((acceptedAll.length * 2) / allUsers.length) * 10) / 10
        : 0;

    // By status
    const statusCount: Record<string, number> = {};
    for (const f of periodFriendships) {
      statusCount[f.status] = (statusCount[f.status] || 0) + 1;
    }
    const byStatus = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }));

    // Trends
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);

    const friendshipTrendMap: Record<string, number> = {};
    const messageTrendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      friendshipTrendMap[dateStr] = 0;
      messageTrendMap[dateStr] = 0;
    }

    for (const f of periodFriendships) {
      const dateStr = new Date(f.createdAt).toISOString().split('T')[0];
      if (friendshipTrendMap[dateStr] !== undefined) {
        friendshipTrendMap[dateStr]++;
      }
    }

    for (const dm of periodDMs) {
      const dateStr = new Date(dm.createdAt).toISOString().split('T')[0];
      if (messageTrendMap[dateStr] !== undefined) {
        messageTrendMap[dateStr]++;
      }
    }

    const friendshipTrend = Object.entries(friendshipTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const messageTrend = Object.entries(messageTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalFriendships: periodFriendships.length,
      acceptedFriendships,
      pendingRequests,
      directMessagesSent: periodDMs.length,
      directMessagesRead: readDMs,
      avgFriendsPerUser,
      byStatus,
      friendshipTrend,
      messageTrend,
    };
  },
});

// =============================================================================
// CART ANALYTICS
// =============================================================================

export const getCartAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalItems: v.number(),
    totalQuantity: v.number(),
    totalValue: v.number(),
    uniqueCarts: v.number(),
    avgItemsPerCart: v.number(),
    avgCartValue: v.number(),
    topCartedItems: v.array(
      v.object({ itemId: v.string(), name: v.string(), count: v.number() })
    ),
    byCategory: v.array(v.object({ category: v.string(), count: v.number() })),
    trend: v.array(v.object({ date: v.string(), count: v.number() })),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
    uniqueCarts: number;
    avgItemsPerCart: number;
    avgCartValue: number;
    topCartedItems: Array<{ itemId: string; name: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
  }> => {
    const { startDate, endDate } = args;

    const allCartItems = await ctx.db.query('cart_items').collect();
    const periodCartItems = allCartItems.filter(
      (c) => c.addedAt >= startDate && c.addedAt <= endDate
    );

    const totalQuantity = periodCartItems.reduce((sum, c) => sum + c.quantity, 0);
    const uniqueUsers = new Set(periodCartItems.map((c) => c.userId));

    // Calculate total value and get item details
    let totalValue = 0;
    const itemCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};

    for (const cartItem of periodCartItems) {
      const item = await ctx.db.get(cartItem.itemId);
      if (item) {
        totalValue += item.price * cartItem.quantity;
        itemCount[cartItem.itemId] = (itemCount[cartItem.itemId] || 0) + cartItem.quantity;
        categoryCount[item.category] = (categoryCount[item.category] || 0) + cartItem.quantity;
      }
    }

    const avgItemsPerCart =
      uniqueUsers.size > 0 ? Math.round((totalQuantity / uniqueUsers.size) * 10) / 10 : 0;
    const avgCartValue =
      uniqueUsers.size > 0 ? Math.round(totalValue / uniqueUsers.size) : 0;

    // Top carted items
    const topItemIds = Object.entries(itemCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topCartedItems = await Promise.all(
      topItemIds.map(async ([id, count]) => {
        const item = await ctx.db.get(id as Id<'items'>);
        return { itemId: id, name: item?.name || 'Unknown', count };
      })
    );

    const byCategory = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Trend
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);
    const trendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      trendMap[dateStr] = 0;
    }

    for (const cartItem of periodCartItems) {
      const dateStr = new Date(cartItem.addedAt).toISOString().split('T')[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr] += cartItem.quantity;
      }
    }

    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalItems: periodCartItems.length,
      totalQuantity,
      totalValue,
      uniqueCarts: uniqueUsers.size,
      avgItemsPerCart,
      avgCartValue,
      topCartedItems,
      byCategory,
      trend,
    };
  },
});

// =============================================================================
// CHAT ANALYTICS
// =============================================================================

export const getChatAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalThreads: v.number(),
    totalMessages: v.number(),
    userMessages: v.number(),
    assistantMessages: v.number(),
    avgMessagesPerThread: v.number(),
    byContextType: v.array(v.object({ context: v.string(), count: v.number() })),
    byMessageType: v.array(v.object({ type: v.string(), count: v.number() })),
    threadTrend: v.array(v.object({ date: v.string(), count: v.number() })),
    messageTrend: v.array(v.object({ date: v.string(), count: v.number() })),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    totalThreads: number;
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    avgMessagesPerThread: number;
    byContextType: Array<{ context: string; count: number }>;
    byMessageType: Array<{ type: string; count: number }>;
    threadTrend: Array<{ date: string; count: number }>;
    messageTrend: Array<{ date: string; count: number }>;
  }> => {
    const { startDate, endDate } = args;

    const allThreads = await ctx.db.query('threads').collect();
    const periodThreads = allThreads.filter(
      (t) => t.createdAt >= startDate && t.createdAt <= endDate
    );

    const allMessages = await ctx.db.query('messages').collect();
    const periodMessages = allMessages.filter(
      (m) => m.createdAt >= startDate && m.createdAt <= endDate
    );

    const userMessages = periodMessages.filter((m) => m.role === 'user').length;
    const assistantMessages = periodMessages.filter((m) => m.role === 'assistant').length;

    const avgMessagesPerThread =
      periodThreads.length > 0
        ? Math.round((periodMessages.length / periodThreads.length) * 10) / 10
        : 0;

    // By context type
    const contextCount: Record<string, number> = {};
    for (const thread of periodThreads) {
      const context = thread.contextType || 'general';
      contextCount[context] = (contextCount[context] || 0) + 1;
    }
    const byContextType = Object.entries(contextCount).map(([context, count]) => ({
      context,
      count,
    }));

    // By message type
    const messageTypeCount: Record<string, number> = {};
    for (const message of periodMessages) {
      const type = message.messageType || 'text';
      messageTypeCount[type] = (messageTypeCount[type] || 0) + 1;
    }
    const byMessageType = Object.entries(messageTypeCount).map(([type, count]) => ({
      type,
      count,
    }));

    // Trends
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);

    const threadTrendMap: Record<string, number> = {};
    const messageTrendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      threadTrendMap[dateStr] = 0;
      messageTrendMap[dateStr] = 0;
    }

    for (const thread of periodThreads) {
      const dateStr = new Date(thread.createdAt).toISOString().split('T')[0];
      if (threadTrendMap[dateStr] !== undefined) {
        threadTrendMap[dateStr]++;
      }
    }

    for (const message of periodMessages) {
      const dateStr = new Date(message.createdAt).toISOString().split('T')[0];
      if (messageTrendMap[dateStr] !== undefined) {
        messageTrendMap[dateStr]++;
      }
    }

    const threadTrend = Object.entries(threadTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const messageTrend = Object.entries(messageTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalThreads: periodThreads.length,
      totalMessages: periodMessages.length,
      userMessages,
      assistantMessages,
      avgMessagesPerThread,
      byContextType,
      byMessageType,
      threadTrend,
      messageTrend,
    };
  },
});

// =============================================================================
// LOOK INTERACTIONS ANALYTICS
// =============================================================================

export const getLookInteractionsAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalInteractions: v.number(),
    loves: v.number(),
    dislikes: v.number(),
    saves: v.number(),
    uniqueUsersInteracting: v.number(),
    uniqueLooksInteracted: v.number(),
    engagementRate: v.number(),
    byType: v.array(v.object({ type: v.string(), count: v.number() })),
    topLovedLooks: v.array(
      v.object({ lookId: v.string(), publicId: v.string(), occasion: v.string(), count: v.number() })
    ),
    topSavedLooks: v.array(
      v.object({ lookId: v.string(), publicId: v.string(), occasion: v.string(), count: v.number() })
    ),
    loveTrend: v.array(v.object({ date: v.string(), count: v.number() })),
    saveTrend: v.array(v.object({ date: v.string(), count: v.number() })),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { startDate: number; endDate: number }
  ): Promise<{
    totalInteractions: number;
    loves: number;
    dislikes: number;
    saves: number;
    uniqueUsersInteracting: number;
    uniqueLooksInteracted: number;
    engagementRate: number;
    byType: Array<{ type: string; count: number }>;
    topLovedLooks: Array<{ lookId: string; publicId: string; occasion: string; count: number }>;
    topSavedLooks: Array<{ lookId: string; publicId: string; occasion: string; count: number }>;
    loveTrend: Array<{ date: string; count: number }>;
    saveTrend: Array<{ date: string; count: number }>;
  }> => {
    const { startDate, endDate } = args;

    const allInteractions = await ctx.db.query('look_interactions').collect();
    const periodInteractions = allInteractions.filter(
      (i) => i.createdAt >= startDate && i.createdAt <= endDate
    );

    const loves = periodInteractions.filter((i) => i.interactionType === 'love').length;
    const dislikes = periodInteractions.filter((i) => i.interactionType === 'dislike').length;
    const saves = periodInteractions.filter((i) => i.interactionType === 'save').length;

    const uniqueUsers = new Set(periodInteractions.map((i) => i.userId));
    const uniqueLooks = new Set(periodInteractions.map((i) => i.lookId));

    // Engagement rate: interactions / total looks viewed (approximation using total public looks)
    const allLooks = await ctx.db.query('looks').collect();
    const publicLooks = allLooks.filter((l) => l.isPublic || l.sharedWithFriends);
    const engagementRate =
      publicLooks.length > 0
        ? Math.round((periodInteractions.length / publicLooks.length) * 100)
        : 0;

    // By type
    const typeCount: Record<string, number> = {};
    for (const interaction of periodInteractions) {
      typeCount[interaction.interactionType] =
        (typeCount[interaction.interactionType] || 0) + 1;
    }
    const byType = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
    }));

    // Top loved looks
    const lovesByLook: Record<string, number> = {};
    for (const interaction of periodInteractions.filter((i) => i.interactionType === 'love')) {
      lovesByLook[interaction.lookId] = (lovesByLook[interaction.lookId] || 0) + 1;
    }
    const topLovedLookIds = Object.entries(lovesByLook)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topLovedLooks = await Promise.all(
      topLovedLookIds.map(async ([lookId, count]) => {
        const look = await ctx.db.get(lookId as Id<'looks'>);
        return {
          lookId,
          publicId: look?.publicId || lookId,
          occasion: look?.occasion || 'Unspecified',
          count,
        };
      })
    );

    // Top saved looks
    const savesByLook: Record<string, number> = {};
    for (const interaction of periodInteractions.filter((i) => i.interactionType === 'save')) {
      savesByLook[interaction.lookId] = (savesByLook[interaction.lookId] || 0) + 1;
    }
    const topSavedLookIds = Object.entries(savesByLook)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topSavedLooks = await Promise.all(
      topSavedLookIds.map(async ([lookId, count]) => {
        const look = await ctx.db.get(lookId as Id<'looks'>);
        return {
          lookId,
          publicId: look?.publicId || lookId,
          occasion: look?.occasion || 'Unspecified',
          count,
        };
      })
    );

    // Trends
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((endDate - startDate) / dayMs);

    const loveTrendMap: Record<string, number> = {};
    const saveTrendMap: Record<string, number> = {};

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
      loveTrendMap[dateStr] = 0;
      saveTrendMap[dateStr] = 0;
    }

    for (const interaction of periodInteractions) {
      const dateStr = new Date(interaction.createdAt).toISOString().split('T')[0];
      if (interaction.interactionType === 'love' && loveTrendMap[dateStr] !== undefined) {
        loveTrendMap[dateStr]++;
      }
      if (interaction.interactionType === 'save' && saveTrendMap[dateStr] !== undefined) {
        saveTrendMap[dateStr]++;
      }
    }

    const loveTrend = Object.entries(loveTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const saveTrend = Object.entries(saveTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalInteractions: periodInteractions.length,
      loves,
      dislikes,
      saves,
      uniqueUsersInteracting: uniqueUsers.size,
      uniqueLooksInteracted: uniqueLooks.size,
      engagementRate,
      byType,
      topLovedLooks,
      topSavedLooks,
      loveTrend,
      saveTrend,
    };
  },
});

