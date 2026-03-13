import { internalAction, ActionCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Send a low-credit alert to the seller (internal action)
 * In production this would trigger a push notification or email
 */
export const sendSellerLowCreditAlert = internalAction({
  args: {
    sellerId: v.id('sellers'),
    remaining: v.number(),
  },
  returns: v.null(),
  handler: async (
    _ctx: ActionCtx,
    args: { sellerId: Id<'sellers'>; remaining: number }
  ): Promise<null> => {
    // Log for now — in production hook into push/email notification system
    console.log(
      `[SELLER_CREDITS] Low credits alert for seller ${args.sellerId}: ${args.remaining} credits remaining`
    );
    return null;
  },
});
