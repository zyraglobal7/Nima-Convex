"use node";

import { internalAction, ActionCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * Call Fingo Pay STK Push API to initiate M-Pesa payment
 * This is scheduled by the initiatePurchase mutation
 */
export const callFingoPaySTKPush = internalAction({
  args: {
    purchaseId: v.id('credit_purchases'),
    merchantTransactionId: v.string(),
    amount: v.number(), // In cents (KES * 100)
    phoneNumber: v.string(),
    narration: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: {
      purchaseId: Id<'credit_purchases'>;
      merchantTransactionId: string;
      amount: number;
      phoneNumber: string;
      narration: string;
    }
  ): Promise<null> => {
    const apiKey = process.env.FINGO_LIVE_KEY;
    if (!apiKey) {
      console.error('[FINGO] FINGO_LIVE_KEY not configured');
      await ctx.runMutation(internal.credits.mutations.failPurchase, {
        merchantTransactionId: args.merchantTransactionId,
        reason: 'Payment service not configured',
      });
      return null;
    }

    try {
      console.log(`[FINGO] Initiating STK Push for ${args.merchantTransactionId}, amount: ${args.amount}, phone: ${args.phoneNumber}`);

      const response = await fetch('https://api.fingopay.io/v1/mpesa/charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': args.merchantTransactionId,
        },
        body: JSON.stringify({
          merchantTransactionId: args.merchantTransactionId,
          amount: args.amount,
          phoneNumber: args.phoneNumber,
          narration: args.narration,
        }),
      });

      const data = await response.json();

      if (response.status === 202 || response.ok) {
        // STK Push sent successfully - payment will be confirmed via webhook
        console.log(`[FINGO] STK Push initiated successfully: ${JSON.stringify(data)}`);
      } else {
        // API error - mark purchase as failed
        const errorMessage = data?.error?.message || `HTTP ${response.status}`;
        console.error(`[FINGO] STK Push failed: ${errorMessage}`);
        await ctx.runMutation(internal.credits.mutations.failPurchase, {
          merchantTransactionId: args.merchantTransactionId,
          reason: errorMessage,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error(`[FINGO] STK Push error: ${errorMessage}`);
      await ctx.runMutation(internal.credits.mutations.failPurchase, {
        merchantTransactionId: args.merchantTransactionId,
        reason: errorMessage,
      });
    }

    return null;
  },
});

