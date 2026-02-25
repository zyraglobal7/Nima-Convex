'use node';

import { internalAction, ActionCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

/**
 * Call Fingo Pay STK Push API to initiate a seller subscription payment.
 * Scheduled by the `initiateSubscription` mutation.
 *
 * On success the payment is confirmed asynchronously via the Fingo webhook
 * at /webhooks/fingo which calls `activateSubscription`.
 */
export const callFingoPaySubscriptionSTKPush = internalAction({
  args: {
    merchantTransactionId: v.string(),
    amountKes: v.number(),
    phoneNumber: v.string(),
    tier: v.union(v.literal('starter'), v.literal('growth'), v.literal('premium')),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: {
      merchantTransactionId: string;
      amountKes: number;
      phoneNumber: string;
      tier: 'starter' | 'growth' | 'premium';
    }
  ): Promise<null> => {
    const apiKey = process.env.FINGO_LIVE_KEY;
    if (!apiKey) {
      console.error('[FINGO SUBSCRIPTION] FINGO_LIVE_KEY not configured');
      await ctx.runMutation(internal.sellers.subscriptions.failSubscription, {
        merchantTransactionId: args.merchantTransactionId,
        reason: 'Payment service not configured',
      });
      return null;
    }

    // Fingo Pay expects the amount in cents (KES * 100)
    const amountCents = args.amountKes * 100;
    const narration = `Nima ${args.tier.charAt(0).toUpperCase() + args.tier.slice(1)} plan subscription`;

    try {
      console.log(
        `[FINGO SUBSCRIPTION] Initiating STK Push for ${args.merchantTransactionId}, ` +
        `tier: ${args.tier}, amount: ${amountCents} cents, phone: ${args.phoneNumber}`
      );

      const response = await fetch('https://api.fingopay.io/v1/mpesa/charge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': args.merchantTransactionId,
        },
        body: JSON.stringify({
          merchantTransactionId: args.merchantTransactionId,
          amount: amountCents,
          phoneNumber: args.phoneNumber,
          narration,
        }),
      });

      const data = await response.json();

      if (response.status === 202 || response.ok) {
        // STK Push sent — payment will be confirmed via the /webhooks/fingo webhook
        console.log(`[FINGO SUBSCRIPTION] STK Push initiated successfully: ${JSON.stringify(data)}`);
      } else {
        const errorMessage = data?.error?.message || `HTTP ${response.status}`;
        console.error(`[FINGO SUBSCRIPTION] STK Push failed: ${errorMessage}`);
        await ctx.runMutation(internal.sellers.subscriptions.failSubscription, {
          merchantTransactionId: args.merchantTransactionId,
          reason: errorMessage,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error(`[FINGO SUBSCRIPTION] STK Push error: ${errorMessage}`);
      await ctx.runMutation(internal.sellers.subscriptions.failSubscription, {
        merchantTransactionId: args.merchantTransactionId,
        reason: errorMessage,
      });
    }

    return null;
  },
});
