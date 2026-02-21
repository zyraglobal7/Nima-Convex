import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';

/**
 * Generate a unique order number
 */
function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${randomPart}`;
}

/**
 * Generate a unique merchant transaction ID for order payments
 */
function generateOrderMerchantTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `nima_ord_${result}`;
}

/**
 * Create an order from the current cart and initiate Fingo Pay M-Pesa STK Push
 */
export const createOrder = mutation({
  args: {
    shippingAddress: v.object({
      fullName: v.string(),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    }),
    mpesaPhoneNumber: v.string(),
  },
  returns: v.object({
    orderId: v.id('orders'),
    orderNumber: v.string(),
    merchantTransactionId: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      shippingAddress: {
        fullName: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state?: string;
        postalCode: string;
        country: string;
        phone: string;
      };
      mpesaPhoneNumber: string;
    }
  ): Promise<{ orderId: Id<'orders'>; orderNumber: string; merchantTransactionId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    // Validate phone number (basic Kenyan format check)
    const phoneRegex = /^(?:\+254|254|0)(?:7|1)\d{8}$/;
    if (!phoneRegex.test(args.mpesaPhoneNumber)) {
      throw new Error('Invalid phone number format. Use Kenyan format (e.g., +254712345678)');
    }

    // Get cart items
    const cartItems = await ctx.db
      .query('cart_items')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Get item details and calculate totals
    let subtotal = 0;
    const itemsWithDetails = await Promise.all(
      cartItems.map(async (cartItem) => {
        const item = await ctx.db.get(cartItem.itemId);
        if (!item) {
          throw new Error(`Item ${cartItem.itemId} not found`);
        }
        if (!item.isActive || !item.inStock) {
          throw new Error(`Item "${item.name}" is no longer available`);
        }

        const lineTotal = item.price * cartItem.quantity;
        subtotal += lineTotal;

        // Get primary image
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
          .unique();

        let imageUrl: string | undefined;
        if (primaryImage) {
          if (primaryImage.storageId) {
            imageUrl = (await ctx.storage.getUrl(primaryImage.storageId)) ?? undefined;
          } else if (primaryImage.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          }
        }

        return {
          cartItem,
          item,
          lineTotal,
          imageUrl,
        };
      })
    );

    // Calculate fees
    const serviceFee = Math.round(subtotal * 0.1); // 10% service fee
    const shippingCost = 500; // KES 1500 flat rate
    const total = subtotal + serviceFee + shippingCost;

    const now = Date.now();
    const orderNumber = generateOrderNumber();
    const merchantTransactionId = generateOrderMerchantTransactionId();

    // Create order
    const orderId = await ctx.db.insert('orders', {
      userId: user._id,
      orderNumber,
      shippingAddress: args.shippingAddress,
      subtotal,
      serviceFee,
      shippingCost,
      total,
      currency: 'KES',
      paymentStatus: 'pending',
      paymentMethod: 'mpesa',
      status: 'pending',
      merchantTransactionId,
      mpesaPhoneNumber: args.mpesaPhoneNumber,
      createdAt: now,
      updatedAt: now,
    });

    // Create order items
    for (const { cartItem, item, lineTotal, imageUrl } of itemsWithDetails) {
      await ctx.db.insert('order_items', {
        orderId,
        sellerId: item.sellerId,
        itemId: item._id,
        itemName: item.name,
        itemBrand: item.brand,
        itemPrice: item.price,
        itemImageUrl: imageUrl,
        quantity: cartItem.quantity,
        selectedSize: cartItem.selectedSize,
        selectedColor: cartItem.selectedColor,
        lineTotal,
        fulfillmentStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      // Update item purchase count
      await ctx.db.patch(item._id, {
        purchaseCount: (item.purchaseCount ?? 0) + cartItem.quantity,
        updatedAt: now,
      });
    }

    // Clear cart
    for (const cartItem of cartItems) {
      await ctx.db.delete(cartItem._id);
    }

    // Save shipping address to user profile for next time
    await ctx.db.patch(user._id, {
      savedShippingAddress: args.shippingAddress,
      updatedAt: now,
    });

    // Save phone to user profile if not set
    if (!user.phoneNumber) {
      await ctx.db.patch(user._id, {
        phoneNumber: args.mpesaPhoneNumber,
        updatedAt: now,
      });
    }

    // Schedule Fingo Pay STK Push
    await ctx.scheduler.runAfter(0, internal.orders.actions.callFingoPayOrderSTKPush, {
      orderId,
      merchantTransactionId,
      amount: total * 100, // Fingo Pay expects cents
      phoneNumber: args.mpesaPhoneNumber,
      narration: `Nima Order ${orderNumber}`,
    });

    return { orderId, orderNumber, merchantTransactionId };
  },
});

/**
 * Complete an order payment (called from Fingo Pay webhook)
 */
export const completeOrderPayment = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    fingoTransactionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    orderId: v.optional(v.id('orders')),
    orderNumber: v.optional(v.string()),
    userId: v.optional(v.id('users')),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; fingoTransactionId: string }
  ): Promise<{
    success: boolean;
    orderId?: Id<'orders'>;
    orderNumber?: string;
    userId?: Id<'users'>;
  }> => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_merchant_transaction_id', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!order) {
      console.error(`[ORDERS] Order not found for merchantTransactionId: ${args.merchantTransactionId}`);
      return { success: false };
    }

    // Idempotency: if already paid, skip
    if (order.paymentStatus === 'paid') {
      console.log(`[ORDERS] Order already paid: ${args.merchantTransactionId}`);
      return { success: true, orderId: order._id, orderNumber: order.orderNumber, userId: order.userId };
    }

    const now = Date.now();

    // Mark order as paid & processing
    await ctx.db.patch(order._id, {
      paymentStatus: 'paid',
      paymentIntentId: args.fingoTransactionId,
      status: 'processing',
      updatedAt: now,
    });

    console.log(`[ORDERS] Order paid: ${order.orderNumber} (${args.merchantTransactionId})`);

    // Schedule push notification
    await ctx.scheduler.runAfter(0, internal.notifications.actions.sendOrderConfirmationNotification, {
      userId: order.userId,
      orderNumber: order.orderNumber,
    });

    return {
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
    };
  },
});

/**
 * Mark an order payment as failed (called from Fingo Pay webhook)
 */
export const failOrderPayment = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; reason?: string }
  ): Promise<null> => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_merchant_transaction_id', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!order) {
      console.error(`[ORDERS] Order not found for payment failure: ${args.merchantTransactionId}`);
      return null;
    }

    // Don't overwrite paid status
    if (order.paymentStatus === 'paid') {
      return null;
    }

    await ctx.db.patch(order._id, {
      paymentStatus: 'failed',
      updatedAt: Date.now(),
    });

    console.log(`[ORDERS] Order payment failed: ${order.orderNumber} - ${args.reason}`);
    return null;
  },
});

/**
 * Cancel an order (customer initiated, only if not shipped)
 */
export const cancelOrder = mutation({
  args: {
    orderId: v.id('orders'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { orderId: Id<'orders'> }): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId !== user._id) {
      throw new Error('You do not have permission to cancel this order');
    }

    // Can only cancel if order is pending or processing
    if (order.status !== 'pending' && order.status !== 'processing') {
      throw new Error('Order cannot be cancelled - items have already shipped');
    }

    const now = Date.now();

    // Cancel all order items
    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .collect();

    for (const oi of orderItems) {
      await ctx.db.patch(oi._id, {
        fulfillmentStatus: 'cancelled',
        updatedAt: now,
      });
    }

    // Cancel the order
    await ctx.db.patch(args.orderId, {
      status: 'cancelled',
      updatedAt: now,
    });

    return true;
  },
});
