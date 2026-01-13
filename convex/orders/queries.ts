import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';

/**
 * Get order by order number (for order confirmation page)
 */
export const getOrderByNumber = query({
  args: {
    orderNumber: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('orders'),
      orderNumber: v.string(),
      status: v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('partially_shipped'),
        v.literal('shipped'),
        v.literal('delivered'),
        v.literal('cancelled')
      ),
      paymentStatus: v.union(
        v.literal('pending'),
        v.literal('paid'),
        v.literal('failed'),
        v.literal('refunded')
      ),
      subtotal: v.number(),
      serviceFee: v.number(),
      shippingCost: v.number(),
      total: v.number(),
      currency: v.string(),
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
      items: v.array(
        v.object({
          _id: v.id('order_items'),
          itemName: v.string(),
          itemBrand: v.optional(v.string()),
          itemPrice: v.number(),
          itemImageUrl: v.optional(v.string()),
          quantity: v.number(),
          selectedSize: v.optional(v.string()),
          selectedColor: v.optional(v.string()),
          lineTotal: v.number(),
          fulfillmentStatus: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('shipped'),
            v.literal('delivered'),
            v.literal('cancelled')
          ),
          trackingNumber: v.optional(v.string()),
        })
      ),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { orderNumber: string }
  ): Promise<{
    _id: Id<'orders'>;
    orderNumber: string;
    status: 'pending' | 'processing' | 'partially_shipped' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    subtotal: number;
    serviceFee: number;
    shippingCost: number;
    total: number;
    currency: string;
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
    items: Array<{
      _id: Id<'order_items'>;
      itemName: string;
      itemBrand?: string;
      itemPrice: number;
      itemImageUrl?: string;
      quantity: number;
      selectedSize?: string;
      selectedColor?: string;
      lineTotal: number;
      fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
      trackingNumber?: string;
    }>;
    createdAt: number;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', args.orderNumber))
      .unique();

    if (!order || order.userId !== user._id) {
      return null;
    }

    // Get order items
    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_order', (q) => q.eq('orderId', order._id))
      .collect();

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      serviceFee: order.serviceFee,
      shippingCost: order.shippingCost,
      total: order.total,
      currency: order.currency,
      shippingAddress: order.shippingAddress,
      items: orderItems.map((oi) => ({
        _id: oi._id,
        itemName: oi.itemName,
        itemBrand: oi.itemBrand,
        itemPrice: oi.itemPrice,
        itemImageUrl: oi.itemImageUrl,
        quantity: oi.quantity,
        selectedSize: oi.selectedSize,
        selectedColor: oi.selectedColor,
        lineTotal: oi.lineTotal,
        fulfillmentStatus: oi.fulfillmentStatus,
        trackingNumber: oi.trackingNumber,
      })),
      createdAt: order.createdAt,
    };
  },
});

/**
 * Get user's order history
 */
export const getUserOrders = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('orders'),
      orderNumber: v.string(),
      status: v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('partially_shipped'),
        v.literal('shipped'),
        v.literal('delivered'),
        v.literal('cancelled')
      ),
      total: v.number(),
      currency: v.string(),
      itemCount: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<
    Array<{
      _id: Id<'orders'>;
      orderNumber: string;
      status: 'pending' | 'processing' | 'partially_shipped' | 'shipped' | 'delivered' | 'cancelled';
      total: number;
      currency: string;
      itemCount: number;
      createdAt: number;
    }>
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const limit = Math.min(args.limit ?? 20, 50);

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);

    // Get item counts for each order
    const ordersWithCounts = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await ctx.db
          .query('order_items')
          .withIndex('by_order', (q) => q.eq('orderId', order._id))
          .collect();

        const itemCount = orderItems.reduce((sum, oi) => sum + oi.quantity, 0);

        return {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          currency: order.currency,
          itemCount,
          createdAt: order.createdAt,
        };
      })
    );

    return ordersWithCounts;
  },
});
