/**
 * Admin Migrations
 * One-time migration scripts for database updates
 */

import { internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Migration: Divide all item prices by 100
 * 
 * This fixes items that were incorrectly stored with a * 100 conversion.
 * Run this ONCE after removing the cents conversion from the admin forms.
 * 
 * Usage: npx convex run admin/migrations:fixItemPrices --no-push
 */
export const fixItemPrices = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, only log what would change
  },
  returns: v.object({
    totalItems: v.number(),
    updatedItems: v.number(),
    skippedItems: v.number(),
    changes: v.array(v.object({
      itemId: v.string(),
      name: v.string(),
      oldPrice: v.number(),
      newPrice: v.number(),
    })),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { dryRun?: boolean }
  ): Promise<{
    totalItems: number;
    updatedItems: number;
    skippedItems: number;
    changes: Array<{
      itemId: string;
      name: string;
      oldPrice: number;
      newPrice: number;
    }>;
  }> => {
    const dryRun = args.dryRun ?? false;
    
    // Get all items
    const items = await ctx.db.query('items').collect();
    
    const changes: Array<{
      itemId: string;
      name: string;
      oldPrice: number;
      newPrice: number;
    }> = [];
    
    let updatedItems = 0;
    let skippedItems = 0;
    
    for (const item of items) {
      // Only update items with prices that look like they were multiplied by 100
      // (i.e., prices >= 10000, which would be >= 100 KES after division)
      if (item.price >= 10000) {
        const newPrice = Math.round(item.price / 100);
        const newOriginalPrice = item.originalPrice 
          ? Math.round(item.originalPrice / 100) 
          : undefined;
        
        changes.push({
          itemId: item._id,
          name: item.name,
          oldPrice: item.price,
          newPrice: newPrice,
        });
        
        if (!dryRun) {
          await ctx.db.patch(item._id, {
            price: newPrice,
            originalPrice: newOriginalPrice,
            updatedAt: Date.now(),
          });
        }
        
        updatedItems++;
      } else {
        // Skip items that seem to have correct prices already
        skippedItems++;
        console.log(`[Migration] Skipped "${item.name}" - price ${item.price} seems correct`);
      }
    }
    
    console.log(`[Migration] ${dryRun ? 'DRY RUN - ' : ''}Fixed ${updatedItems} items, skipped ${skippedItems}`);
    
    return {
      totalItems: items.length,
      updatedItems,
      skippedItems,
      changes,
    };
  },
});

