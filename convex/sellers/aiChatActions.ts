'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

/**
 * Public action called by the Next.js API route via ConvexHttpClient.
 * Auth + premium gate happen inside the internal queries in aiChat.ts.
 */
export const getSellerAiContext = action({
  args: {},
  returns: v.any(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx): Promise<any> => {
    const sellerContext = await ctx.runQuery(internal.sellers.aiChat.buildSellerContext, {});
    const platformAggregates = await ctx.runQuery(internal.sellers.aiChat.getPlatformAggregates, {});
    return { ...sellerContext, platformAggregates };
  },
});
