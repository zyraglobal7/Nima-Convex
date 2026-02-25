"use node";

import { internalAction, ActionCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * Send an Expo push notification to a list of tokens
 * Uses the Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
 */
async function sendExpoPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId: string = 'default',
  imageUrl?: string,
): Promise<void> {
  if (tokens.length === 0) {
    console.log('[PUSH] No tokens to send to');
    return;
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default' as const,
    title,
    body,
    data: { ...(data || {}), ...(imageUrl ? { senderImageUrl: imageUrl } : {}) },
    priority: 'high' as const,
    channelId,
    ...(imageUrl ? { image: imageUrl } : {}),
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log(`[PUSH] Sent ${messages.length} notifications:`, JSON.stringify(result));
  } catch (error) {
    console.error(`[PUSH] Failed to send notifications:`, error);
  }
}

/**
 * Send low-credit reminder push notification
 * Triggered when user's remaining credits <= 2 after a deduction
 */
export const sendLowCreditNotification = internalAction({
  args: {
    userId: v.id('users'),
    remaining: v.number(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'>; remaining: number }
  ): Promise<null> => {
    // Get user's push tokens
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.userId}, skipping low credit notification`);
      return null;
    }

    const title = '⚡ Running Low on Credits';
    const body = args.remaining === 0
      ? "You're out of credits! Top up to keep discovering looks."
      : `Only ${args.remaining} credit${args.remaining === 1 ? '' : 's'} left. Top up to keep discovering looks.`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'low_credits',
      remaining: args.remaining,
    }, 'credits');

    return null;
  },
});

/**
 * Send credit purchase success push notification
 * Triggered after a Fingo Pay webhook confirms payment
 */
export const sendCreditPurchaseNotification = internalAction({
  args: {
    userId: v.id('users'),
    creditsAdded: v.number(),
    newBalance: v.number(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'>; creditsAdded: number; newBalance: number }
  ): Promise<null> => {
    // Get user's push tokens
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.userId}, skipping purchase notification`);
      return null;
    }

    const title = '🎉 Credits Added!';
    const body = `${args.creditsAdded} credits added to your account. You now have ${args.newBalance} credits.`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'credits_purchased',
      creditsAdded: args.creditsAdded,
      newBalance: args.newBalance,
    }, 'credits');

    return null;
  },
});

/**
 * Send push notification when a user receives a direct message (look shared)
 * Triggered when sendDirectMessage mutation succeeds
 */
export const sendMessageNotification = internalAction({
  args: {
    recipientId: v.id('users'),
    senderName: v.string(),
    lookId: v.id('looks'),
    senderProfileImageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { recipientId: Id<'users'>; senderName: string; lookId: Id<'looks'>; senderProfileImageUrl?: string }
  ): Promise<null> => {
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.recipientId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.recipientId}, skipping message notification`);
      return null;
    }

    const title = '📩 New Look Shared With You';
    const body = `${args.senderName} shared a look with you! Tap to check it out.`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'message_received',
      lookId: args.lookId,
    }, 'messages', args.senderProfileImageUrl);

    return null;
  },
});

/**
 * Send push notification when a look image generation is complete
 * Triggered when updateLookGenerationStatus sets status to 'completed'
 */
export const sendLookReadyNotification = internalAction({
  args: {
    userId: v.id('users'),
    lookId: v.id('looks'),
    lookName: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'>; lookId: Id<'looks'>; lookName: string }
  ): Promise<null> => {
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.userId}, skipping look ready notification`);
      return null;
    }

    const title = '✨ Your Look is Ready!';
    const body = `"${args.lookName}" has been generated. Tap to see yourself in this outfit!`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'look_ready',
      lookId: args.lookId,
    }, 'looks');

    return null;
  },
});

/**
 * Send push notification when a single item try-on image is complete
 * Triggered when updateItemTryOnStatus sets status to 'completed'
 */
export const sendTryOnReadyNotification = internalAction({
  args: {
    userId: v.id('users'),
    itemTryOnId: v.id('item_try_ons'),
    itemName: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'>; itemTryOnId: Id<'item_try_ons'>; itemName: string }
  ): Promise<null> => {
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.userId}, skipping try-on ready notification`);
      return null;
    }

    const title = '👗 Try-On Ready!';
    const body = `Your virtual try-on for "${args.itemName}" is ready. Tap to see how it looks on you!`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'tryon_ready',
      itemTryOnId: args.itemTryOnId,
    }, 'looks');

    return null;
  },
});

/**
 * Send push notification when a user's first 3 onboarding looks are ready
 * Triggered at the end of the onboarding workflow
 */
export const sendOnboardingLooksReadyNotification = internalAction({
  args: {
    userId: v.id('users'),
    successCount: v.number(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'>; successCount: number }
  ): Promise<null> => {
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.userId}, skipping onboarding looks notification`);
      return null;
    }

    const title = '🎉 Your First Looks Are Ready!';
    const body = args.successCount >= 3
      ? 'We\'ve created 3 personalized outfits just for you. Come see yourself in them!'
      : `We\'ve created ${args.successCount} personalized outfit${args.successCount === 1 ? '' : 's'} for you. Tap to check them out!`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'onboarding_looks_ready',
      successCount: args.successCount,
    }, 'looks');

    return null;
  },
});

/**
 * Send push notification when an order payment is confirmed
 * Triggered from completeOrderPayment mutation
 */
export const sendOrderConfirmationNotification = internalAction({
  args: {
    userId: v.id('users'),
    orderNumber: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'>; orderNumber: string }
  ): Promise<null> => {
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.userId}, skipping order confirmation notification`);
      return null;
    }

    const title = '🛍️ Order Confirmed!';
    const body = `Your order ${args.orderNumber} has been confirmed! We'll start processing it right away.`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'order_confirmed',
      orderNumber: args.orderNumber,
    }, 'orders');

    return null;
  },
});

/**
 * Send push notification when someone loves or saves a user's look
 * Triggered from toggleLove and recordSave mutations
 */
export const sendLookInteractionNotification = internalAction({
  args: {
    ownerId: v.id('users'),
    interactorName: v.string(),
    interactionType: v.union(v.literal('love'), v.literal('save')),
    lookId: v.id('looks'),
    interactorProfileImageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: {
      ownerId: Id<'users'>;
      interactorName: string;
      interactionType: 'love' | 'save';
      lookId: Id<'looks'>;
      interactorProfileImageUrl?: string;
    }
  ): Promise<null> => {
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.ownerId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.ownerId}, skipping ${args.interactionType} notification`);
      return null;
    }

    const isLove = args.interactionType === 'love';
    const title = isLove ? '❤️ Someone Loved Your Look!' : '🔖 Someone Saved Your Look!';
    const body = isLove
      ? `${args.interactorName} loved your look. Tap to see it!`
      : `${args.interactorName} saved your look. Tap to see it!`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: `look_${args.interactionType}`,
      lookId: args.lookId,
    }, 'looks', args.interactorProfileImageUrl);

    return null;
  },
});

/**
 * Send push notification when someone recreates a user's look
 * Triggered from the recreateLook mutation
 */
export const sendRecreateLookNotification = internalAction({
  args: {
    ownerId: v.id('users'),
    recreatorName: v.string(),
    lookId: v.id('looks'),
    recreatorProfileImageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: {
      ownerId: Id<'users'>;
      recreatorName: string;
      lookId: Id<'looks'>;
      recreatorProfileImageUrl?: string;
    }
  ): Promise<null> => {
    const tokens = await ctx.runMutation(internal.notifications.mutations.getUserPushTokens, {
      userId: args.ownerId,
    });

    if (tokens.length === 0) {
      console.log(`[PUSH] No push tokens for user ${args.ownerId}, skipping recreate notification`);
      return null;
    }

    const title = '🔥 Someone Recreated Your Look!';
    const body = `${args.recreatorName} recreated your look. Tap to see it!`;

    await sendExpoPushNotifications(tokens, title, body, {
      type: 'look_recreated',
      lookId: args.lookId,
    }, 'looks', args.recreatorProfileImageUrl);

    return null;
  },
});

