import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// Validators
const categoryValidator = v.union(
  v.literal('top'),
  v.literal('bottom'),
  v.literal('dress'),
  v.literal('outfit'),
  v.literal('swimwear'),
  v.literal('outerwear'),
  v.literal('shoes'),
  v.literal('accessory'),
  v.literal('bag'),
  v.literal('jewelry')
);

const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));

// Cart item with full item details validator
const cartItemWithDetailsValidator = v.object({
  _id: v.id('cart_items'),
  _creationTime: v.number(),
  userId: v.id('users'),
  itemId: v.id('items'),
  quantity: v.number(),
  selectedSize: v.optional(v.string()),
  selectedColor: v.optional(v.string()),
  addedAt: v.number(),
  item: v.object({
    _id: v.id('items'),
    name: v.string(),
    brand: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    originalPrice: v.optional(v.number()),
    category: categoryValidator,
    gender: genderValidator,
    colors: v.array(v.string()),
    sizes: v.array(v.string()),
    inStock: v.boolean(),
    isActive: v.boolean(),
    sourceStore: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  }),
  imageUrl: v.union(v.string(), v.null()),
});

/**
 * Get all items in the current user's cart with full item details
 */
export const getCart = query({
  args: {},
  returns: v.array(cartItemWithDetailsValidator),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<
    Array<{
      _id: Id<'cart_items'>;
      _creationTime: number;
      userId: Id<'users'>;
      itemId: Id<'items'>;
      quantity: number;
      selectedSize?: string;
      selectedColor?: string;
      addedAt: number;
      item: {
        _id: Id<'items'>;
        name: string;
        brand?: string;
        price: number;
        currency: string;
        originalPrice?: number;
        category: 'top' | 'bottom' | 'dress' | 'outfit' | 'swimwear' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
        gender: 'male' | 'female' | 'unisex';
        colors: string[];
        sizes: string[];
        inStock: boolean;
        isActive: boolean;
        sourceStore?: string;
        sourceUrl?: string;
      };
      imageUrl: string | null;
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

    const cartItems = await ctx.db
      .query('cart_items')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Get full item details for each cart item
    const cartItemsWithDetails = await Promise.all(
      cartItems.map(async (cartItem) => {
        const item = await ctx.db.get(cartItem.itemId);
        if (!item) {
          return null;
        }

        // Get primary image
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
          .unique();

        let imageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.storageId) {
            imageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          }
        }

        return {
          ...cartItem,
          item: {
            _id: item._id,
            name: item.name,
            brand: item.brand,
            price: item.price,
            currency: item.currency,
            originalPrice: item.originalPrice,
            category: item.category,
            gender: item.gender,
            colors: item.colors,
            sizes: item.sizes,
            inStock: item.inStock,
            isActive: item.isActive,
            sourceStore: item.sourceStore,
            sourceUrl: item.sourceUrl,
          },
          imageUrl,
        };
      })
    );

    // Filter out null entries (items that no longer exist)
    return cartItemsWithDetails.filter((item): item is NonNullable<typeof item> => item !== null);
  },
});

/**
 * Get the count of items in the current user's cart
 */
export const getCartCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx: QueryCtx, _args: Record<string, never>): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return 0;
    }

    const cartItems = await ctx.db
      .query('cart_items')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Sum up all quantities
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  },
});

/**
 * Get the total price of items in the current user's cart
 */
export const getCartTotal = query({
  args: {},
  returns: v.object({
    subtotal: v.number(),
    itemCount: v.number(),
    currency: v.string(),
  }),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<{
    subtotal: number;
    itemCount: number;
    currency: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { subtotal: 0, itemCount: 0, currency: 'KES' };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { subtotal: 0, itemCount: 0, currency: 'KES' };
    }

    const cartItems = await ctx.db
      .query('cart_items')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    let subtotal = 0;
    let itemCount = 0;
    let currency = 'KES';

    for (const cartItem of cartItems) {
      const item = await ctx.db.get(cartItem.itemId);
      if (item) {
        subtotal += item.price * cartItem.quantity;
        itemCount += cartItem.quantity;
        currency = item.currency; // Use the last item's currency (could be improved)
      }
    }

    return { subtotal, itemCount, currency };
  },
});








