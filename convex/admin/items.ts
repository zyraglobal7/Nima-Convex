import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { generatePublicId } from '../types';

// Validators
const categoryValidator = v.union(
  v.literal('top'),
  v.literal('bottom'),
  v.literal('dress'),
  v.literal('outfit'),
  v.literal('outerwear'),
  v.literal('shoes'),
  v.literal('accessory'),
  v.literal('bag'),
  v.literal('jewelry'),
  v.literal('swimwear')
);

const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));

const imageTypeValidator = v.union(
  v.literal('front'),
  v.literal('back'),
  v.literal('side'),
  v.literal('detail'),
  v.literal('model'),
  v.literal('flat_lay')
);

/**
 * Generate an upload URL for item images (admin)
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx, _args: Record<string, never>): Promise<string> => {
    // Note: In production, add admin authentication check here
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new item (admin)
 */
export const createItem = mutation({
  args: {
    name: v.string(),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    category: categoryValidator,
    subcategory: v.optional(v.string()),
    gender: genderValidator,
    price: v.number(),
    currency: v.string(),
    originalPrice: v.optional(v.number()),
    colors: v.array(v.string()),
    sizes: v.array(v.string()),
    material: v.optional(v.string()),
    tags: v.array(v.string()),
    occasion: v.optional(v.array(v.string())),
    season: v.optional(v.array(v.string())),
    sourceStore: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    affiliateUrl: v.optional(v.string()),
    inStock: v.optional(v.boolean()),
    stockQuantity: v.optional(v.number()),
    isFeatured: v.optional(v.boolean()),
    sku: v.optional(v.string()),
  },
  returns: v.id('items'),
  handler: async (
    ctx: MutationCtx,
    args: {
      name: string;
      brand?: string;
      description?: string;
      category: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry' | 'swimwear';
      subcategory?: string;
      gender: 'male' | 'female' | 'unisex';
      price: number;
      currency: string;
      originalPrice?: number;
      colors: string[];
      sizes: string[];
      material?: string;
      tags: string[];
      occasion?: string[];
      season?: string[];
      sourceStore?: string;
      sourceUrl?: string;
      affiliateUrl?: string;
      inStock?: boolean;
      stockQuantity?: number;
      isFeatured?: boolean;
      sku?: string;
    }
  ): Promise<Id<'items'>> => {
    // Note: In production, add admin authentication check here
    const now = Date.now();
    const publicId = generatePublicId('item');

    const itemId = await ctx.db.insert('items', {
      publicId,
      sku: args.sku,
      name: args.name,
      brand: args.brand,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      gender: args.gender,
      price: args.price,
      currency: args.currency,
      originalPrice: args.originalPrice,
      colors: args.colors,
      sizes: args.sizes,
      material: args.material,
      tags: args.tags,
      occasion: args.occasion,
      season: args.season,
      sourceStore: args.sourceStore,
      sourceUrl: args.sourceUrl,
      affiliateUrl: args.affiliateUrl,
      inStock: args.inStock ?? true,
      stockQuantity: args.stockQuantity,
      isActive: true,
      isFeatured: args.isFeatured ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

/**
 * Update an item (admin)
 */
export const updateItem = mutation({
  args: {
    itemId: v.id('items'),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(categoryValidator),
    subcategory: v.optional(v.string()),
    gender: v.optional(genderValidator),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    colors: v.optional(v.array(v.string())),
    sizes: v.optional(v.array(v.string())),
    material: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    occasion: v.optional(v.array(v.string())),
    season: v.optional(v.array(v.string())),
    sourceStore: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    affiliateUrl: v.optional(v.string()),
    inStock: v.optional(v.boolean()),
    stockQuantity: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    sku: v.optional(v.string()),
  },
  returns: v.id('items'),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      name?: string;
      brand?: string;
      description?: string;
      category?: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry' | 'swimwear';
      subcategory?: string;
      gender?: 'male' | 'female' | 'unisex';
      price?: number;
      currency?: string;
      originalPrice?: number;
      colors?: string[];
      sizes?: string[];
      material?: string;
      tags?: string[];
      occasion?: string[];
      season?: string[];
      sourceStore?: string;
      sourceUrl?: string;
      affiliateUrl?: string;
      inStock?: boolean;
      stockQuantity?: number;
      isActive?: boolean;
      isFeatured?: boolean;
      sku?: string;
    }
  ): Promise<Id<'items'>> => {
    // Note: In production, add admin authentication check here
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.brand !== undefined) updates.brand = args.brand;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.subcategory !== undefined) updates.subcategory = args.subcategory;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.price !== undefined) updates.price = args.price;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.originalPrice !== undefined) updates.originalPrice = args.originalPrice;
    if (args.colors !== undefined) updates.colors = args.colors;
    if (args.sizes !== undefined) updates.sizes = args.sizes;
    if (args.material !== undefined) updates.material = args.material;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.occasion !== undefined) updates.occasion = args.occasion;
    if (args.season !== undefined) updates.season = args.season;
    if (args.sourceStore !== undefined) updates.sourceStore = args.sourceStore;
    if (args.sourceUrl !== undefined) updates.sourceUrl = args.sourceUrl;
    if (args.affiliateUrl !== undefined) updates.affiliateUrl = args.affiliateUrl;
    if (args.inStock !== undefined) updates.inStock = args.inStock;
    if (args.stockQuantity !== undefined) updates.stockQuantity = args.stockQuantity;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.isFeatured !== undefined) updates.isFeatured = args.isFeatured;
    if (args.sku !== undefined) updates.sku = args.sku;

    await ctx.db.patch(args.itemId, updates);
    return args.itemId;
  },
});

/**
 * Add an image to an item (admin)
 */
export const addItemImage = mutation({
  args: {
    itemId: v.id('items'),
    storageId: v.optional(v.id('_storage')),
    externalUrl: v.optional(v.string()),
    altText: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isPrimary: v.optional(v.boolean()),
    imageType: imageTypeValidator,
  },
  returns: v.id('item_images'),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      storageId?: Id<'_storage'>;
      externalUrl?: string;
      altText?: string;
      sortOrder?: number;
      isPrimary?: boolean;
      imageType: 'front' | 'back' | 'side' | 'detail' | 'model' | 'flat_lay';
    }
  ): Promise<Id<'item_images'>> => {
    // Note: In production, add admin authentication check here

    // Verify item exists
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Must have either storageId or externalUrl
    if (!args.storageId && !args.externalUrl) {
      throw new Error('Must provide either storageId or externalUrl');
    }

    // Get existing images to determine sort order
    const existingImages = await ctx.db
      .query('item_images')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect();

    const sortOrder = args.sortOrder ?? existingImages.length;
    let isPrimary = args.isPrimary ?? false;

    // If this is the first image, make it primary
    if (existingImages.length === 0) {
      isPrimary = true;
    }

    // If setting as primary, unset existing primary
    if (isPrimary) {
      const currentPrimary = existingImages.find((img) => img.isPrimary);
      if (currentPrimary) {
        await ctx.db.patch(currentPrimary._id, { isPrimary: false });
      }
    }

    const imageId = await ctx.db.insert('item_images', {
      itemId: args.itemId,
      storageId: args.storageId,
      externalUrl: args.externalUrl,
      altText: args.altText,
      sortOrder,
      isPrimary,
      imageType: args.imageType,
      createdAt: Date.now(),
    });

    return imageId;
  },
});

/**
 * Delete an item image (admin)
 */
export const deleteItemImage = mutation({
  args: {
    imageId: v.id('item_images'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { imageId: Id<'item_images'> }
  ): Promise<boolean> => {
    // Note: In production, add admin authentication check here
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      return false;
    }

    // Delete from storage if it's a stored file
    if (image.storageId) {
      await ctx.storage.delete(image.storageId);
    }

    // Delete the record
    await ctx.db.delete(args.imageId);

    // If this was primary, set another one as primary
    if (image.isPrimary) {
      const remainingImages = await ctx.db
        .query('item_images')
        .withIndex('by_item', (q) => q.eq('itemId', image.itemId))
        .collect();

      if (remainingImages.length > 0) {
        await ctx.db.patch(remainingImages[0]._id, { isPrimary: true });
      }
    }

    return true;
  },
});

/**
 * Delete an item (soft delete - sets isActive to false)
 */
export const deleteItem = mutation({
  args: {
    itemId: v.id('items'),
    hardDelete: v.optional(v.boolean()),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { itemId: Id<'items'>; hardDelete?: boolean }
  ): Promise<boolean> => {
    // Note: In production, add admin authentication check here
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      return false;
    }

    if (args.hardDelete) {
      // Delete all images first
      const images = await ctx.db
        .query('item_images')
        .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
        .collect();

      for (const image of images) {
        if (image.storageId) {
          await ctx.storage.delete(image.storageId);
        }
        await ctx.db.delete(image._id);
      }

      // Delete the item
      await ctx.db.delete(args.itemId);
    } else {
      // Soft delete
      await ctx.db.patch(args.itemId, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

/**
 * Toggle item active status
 */
export const toggleItemActive = mutation({
  args: {
    itemId: v.id('items'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { itemId: Id<'items'> }): Promise<boolean> => {
    // Note: In production, add admin authentication check here
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    await ctx.db.patch(args.itemId, {
      isActive: !item.isActive,
      updatedAt: Date.now(),
    });

    return !item.isActive;
  },
});

/**
 * Get URL for a storage ID
 */
export const getStorageUrl = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (
    ctx: MutationCtx,
    args: { storageId: Id<'_storage'> }
  ): Promise<string | null> => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

