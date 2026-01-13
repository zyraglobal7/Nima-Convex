import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

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
 * Create an order from the current cart
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
  },
  returns: v.object({
    orderId: v.id('orders'),
    orderNumber: v.string(),
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
    }
  ): Promise<{ orderId: Id<'orders'>; orderNumber: string }> => {
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
    const shippingCost = 1500; // $15.00 flat rate
    const total = subtotal + serviceFee + shippingCost;

    const now = Date.now();
    const orderNumber = generateOrderNumber();

    // Create order
    const orderId = await ctx.db.insert('orders', {
      userId: user._id,
      orderNumber,
      shippingAddress: args.shippingAddress,
      subtotal,
      serviceFee,
      shippingCost,
      total,
      currency: 'USD',
      paymentStatus: 'pending',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Create order items
    for (const { cartItem, item, lineTotal, imageUrl } of itemsWithDetails) {
      await ctx.db.insert('order_items', {
        orderId,
        sellerId: item.sellerId, // Can be undefined for Nima curated items
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

    return { orderId, orderNumber };
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
