import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Add an item to the current user's cart
 * If the item already exists in the cart, increment the quantity
 */
export const addToCart = mutation({
  args: {
    itemId: v.id('items'),
    quantity: v.optional(v.number()),
    selectedSize: v.optional(v.string()),
    selectedColor: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    cartItemId: v.optional(v.id('cart_items')),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      quantity?: number;
      selectedSize?: string;
      selectedColor?: string;
    }
  ): Promise<{
    success: boolean;
    cartItemId?: Id<'cart_items'>;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: 'You must be logged in to add items to cart' };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if item exists and is active
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    if (!item.isActive) {
      return { success: false, message: 'This item is no longer available' };
    }

    if (!item.inStock) {
      return { success: false, message: 'This item is out of stock' };
    }

    const quantity = args.quantity ?? 1;

    // Check if item already exists in cart
    const existingCartItem = await ctx.db
      .query('cart_items')
      .withIndex('by_user_and_item', (q) => q.eq('userId', user._id).eq('itemId', args.itemId))
      .unique();

    if (existingCartItem) {
      // Update quantity
      await ctx.db.patch(existingCartItem._id, {
        quantity: existingCartItem.quantity + quantity,
        selectedSize: args.selectedSize ?? existingCartItem.selectedSize,
        selectedColor: args.selectedColor ?? existingCartItem.selectedColor,
      });
      return {
        success: true,
        cartItemId: existingCartItem._id,
        message: 'Item quantity updated in cart',
      };
    }

    // Add new cart item
    const cartItemId = await ctx.db.insert('cart_items', {
      userId: user._id,
      itemId: args.itemId,
      quantity,
      selectedSize: args.selectedSize,
      selectedColor: args.selectedColor,
      addedAt: Date.now(),
    });

    return {
      success: true,
      cartItemId,
      message: 'Item added to cart',
    };
  },
});

/**
 * Remove an item from the current user's cart
 */
export const removeFromCart = mutation({
  args: {
    cartItemId: v.id('cart_items'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { cartItemId: Id<'cart_items'> }
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: 'You must be logged in' };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem) {
      return { success: false, message: 'Cart item not found' };
    }

    // Verify ownership
    if (cartItem.userId !== user._id) {
      return { success: false, message: 'Unauthorized' };
    }

    await ctx.db.delete(args.cartItemId);

    return { success: true, message: 'Item removed from cart' };
  },
});

/**
 * Update the quantity of an item in the cart
 */
export const updateQuantity = mutation({
  args: {
    cartItemId: v.id('cart_items'),
    quantity: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { cartItemId: Id<'cart_items'>; quantity: number }
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: 'You must be logged in' };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem) {
      return { success: false, message: 'Cart item not found' };
    }

    // Verify ownership
    if (cartItem.userId !== user._id) {
      return { success: false, message: 'Unauthorized' };
    }

    if (args.quantity < 1) {
      // Remove item if quantity is 0 or less
      await ctx.db.delete(args.cartItemId);
      return { success: true, message: 'Item removed from cart' };
    }

    await ctx.db.patch(args.cartItemId, { quantity: args.quantity });

    return { success: true, message: 'Quantity updated' };
  },
});

/**
 * Clear all items from the current user's cart
 */
export const clearCart = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    itemsRemoved: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    _args: Record<string, never>
  ): Promise<{
    success: boolean;
    message: string;
    itemsRemoved: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: 'You must be logged in', itemsRemoved: 0 };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, message: 'User not found', itemsRemoved: 0 };
    }

    const cartItems = await ctx.db
      .query('cart_items')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    for (const cartItem of cartItems) {
      await ctx.db.delete(cartItem._id);
    }

    return {
      success: true,
      message: 'Cart cleared',
      itemsRemoved: cartItems.length,
    };
  },
});








