import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import {
  MAX_USER_PHOTOS,
  MAX_ONBOARDING_PHOTOS,
  MAX_IMAGE_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
} from '../types';

// ============================================
// ONBOARDING IMAGE MUTATIONS (No auth required)
// ============================================

/**
 * Generate an upload URL for onboarding images
 * No authentication required - rate limited by onboardingToken
 */
export const generateOnboardingUploadUrl = mutation({
  args: {
    onboardingToken: v.string(),
  },
  returns: v.string(),
  handler: async (
    ctx: MutationCtx,
    args: { onboardingToken: string }
  ): Promise<string> => {
    // Validate token format
    if (!args.onboardingToken.startsWith('onb_') || args.onboardingToken.length < 30) {
      throw new Error('Invalid onboarding token format');
    }

    // Check existing onboarding images count
    const existingImages = await ctx.db
      .query('user_images')
      .withIndex('by_onboarding_token', (q) => q.eq('onboardingToken', args.onboardingToken))
      .collect();

    if (existingImages.length >= MAX_ONBOARDING_PHOTOS) {
      throw new Error(`Maximum ${MAX_ONBOARDING_PHOTOS} photos allowed during onboarding`);
    }

    // Generate upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save an onboarding image after upload
 * No authentication required - tracked by onboardingToken
 */
export const saveOnboardingImage = mutation({
  args: {
    onboardingToken: v.string(),
    storageId: v.id('_storage'),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    imageType: v.union(
      v.literal('full_body'),
      v.literal('upper_body'),
      v.literal('face'),
      v.literal('other')
    ),
  },
  returns: v.id('user_images'),
  handler: async (
    ctx: MutationCtx,
    args: {
      onboardingToken: string;
      storageId: Id<'_storage'>;
      filename?: string;
      contentType?: string;
      sizeBytes?: number;
      imageType: 'full_body' | 'upper_body' | 'face' | 'other';
    }
  ): Promise<Id<'user_images'>> => {
    // Validate token format
    if (!args.onboardingToken.startsWith('onb_') || args.onboardingToken.length < 30) {
      await ctx.storage.delete(args.storageId);
      throw new Error('Invalid onboarding token format');
    }

    // Validate file size
    if (args.sizeBytes && args.sizeBytes > MAX_IMAGE_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`File size exceeds maximum of ${MAX_IMAGE_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate content type
    if (args.contentType && !ALLOWED_IMAGE_TYPES.includes(args.contentType as typeof ALLOWED_IMAGE_TYPES[number])) {
      await ctx.storage.delete(args.storageId);
      throw new Error('Only JPG and PNG images are allowed');
    }

    // Check existing images count
    const existingImages = await ctx.db
      .query('user_images')
      .withIndex('by_onboarding_token', (q) => q.eq('onboardingToken', args.onboardingToken))
      .collect();

    if (existingImages.length >= MAX_ONBOARDING_PHOTOS) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`Maximum ${MAX_ONBOARDING_PHOTOS} photos allowed during onboarding`);
    }

    // First image is primary by default
    const isPrimary = existingImages.length === 0;

    const now = Date.now();
    const imageId = await ctx.db.insert('user_images', {
      userId: undefined, // Will be set after auth
      storageId: args.storageId,
      onboardingToken: args.onboardingToken,
      filename: args.filename,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      imageType: args.imageType,
      isPrimary,
      status: 'onboarding',
      createdAt: now,
      updatedAt: now,
    });

    return imageId;
  },
});

/**
 * Delete an onboarding image
 * No authentication required - must provide correct onboardingToken
 */
export const deleteOnboardingImage = mutation({
  args: {
    onboardingToken: v.string(),
    imageId: v.id('user_images'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: {
      onboardingToken: string;
      imageId: Id<'user_images'>;
    }
  ): Promise<boolean> => {
    // Get the image
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      return false; // Image doesn't exist - consider it "deleted"
    }

    // Verify onboarding token matches
    if (image.onboardingToken !== args.onboardingToken) {
      throw new Error('Not authorized to delete this image');
    }

    // Only allow deletion of onboarding images
    if (image.status !== 'onboarding') {
      throw new Error('Cannot delete processed images');
    }

    // Delete from storage
    await ctx.storage.delete(image.storageId);

    // Delete the record
    await ctx.db.delete(args.imageId);

    // If this was primary, set another one as primary
    if (image.isPrimary) {
      const remainingImages = await ctx.db
        .query('user_images')
        .withIndex('by_onboarding_token', (q) => q.eq('onboardingToken', args.onboardingToken))
        .collect();

      if (remainingImages.length > 0) {
        await ctx.db.patch(remainingImages[0]._id, {
          isPrimary: true,
          updatedAt: Date.now(),
        });
      }
    }

    return true;
  },
});

/**
 * Claim onboarding images after user authenticates
 * Links images to user and changes status from 'onboarding' to 'pending'
 */
export const claimOnboardingImages = mutation({
  args: {
    onboardingToken: v.string(),
  },
  returns: v.object({
    claimedCount: v.number(),
    imageIds: v.array(v.id('user_images')),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { onboardingToken: string }
  ): Promise<{
    claimedCount: number;
    imageIds: Id<'user_images'>[];
  }> => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    // Get all onboarding images with this token
    const onboardingImages = await ctx.db
      .query('user_images')
      .withIndex('by_onboarding_token', (q) => q.eq('onboardingToken', args.onboardingToken))
      .collect();

    // Filter only images in 'onboarding' status (not already claimed)
    const imagesToClaim = onboardingImages.filter((img) => img.status === 'onboarding');

    if (imagesToClaim.length === 0) {
      return { claimedCount: 0, imageIds: [] };
    }

    // Check user's existing image count
    const existingUserImages = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const availableSlots = MAX_USER_PHOTOS - existingUserImages.length;
    const imagesToProcess = imagesToClaim.slice(0, availableSlots);

    // If user already has a primary, don't set any new ones as primary
    const hasPrimary = existingUserImages.some((img) => img.isPrimary);
    const now = Date.now();

    const claimedIds: Id<'user_images'>[] = [];

    for (let i = 0; i < imagesToProcess.length; i++) {
      const image = imagesToProcess[i];
      const shouldBePrimary = !hasPrimary && i === 0 && image.isPrimary;

      await ctx.db.patch(image._id, {
        userId: user._id,
        onboardingToken: undefined, // Clear the token
        status: 'pending', // Ready for processing
        isPrimary: shouldBePrimary,
        updatedAt: now,
      });

      claimedIds.push(image._id);
    }

    // Delete any excess images that couldn't be claimed due to limit
    const excessImages = imagesToClaim.slice(availableSlots);
    for (const image of excessImages) {
      await ctx.storage.delete(image.storageId);
      await ctx.db.delete(image._id);
    }

    return {
      claimedCount: claimedIds.length,
      imageIds: claimedIds,
    };
  },
});

/**
 * Delete all onboarding images for a given token
 * Used when user wants to "start fresh" with photo uploads
 * No authentication required - uses onboarding token
 */
export const deleteAllOnboardingImages = mutation({
  args: {
    onboardingToken: v.string(),
  },
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { onboardingToken: string }
  ): Promise<{
    deletedCount: number;
  }> => {
    // Validate token format
    if (!args.onboardingToken.startsWith('onb_') || args.onboardingToken.length < 30) {
      throw new Error('Invalid onboarding token format');
    }

    // Get all images for this onboarding token
    const images = await ctx.db
      .query('user_images')
      .withIndex('by_onboarding_token', (q) => q.eq('onboardingToken', args.onboardingToken))
      .collect();

    // Only delete images that are still in 'onboarding' status
    const imagesToDelete = images.filter((img) => img.status === 'onboarding');

    // Delete storage and records
    for (const image of imagesToDelete) {
      await ctx.storage.delete(image.storageId);
      await ctx.db.delete(image._id);
    }

    return {
      deletedCount: imagesToDelete.length,
    };
  },
});

/**
 * Delete all user images for authenticated user
 * Used when authenticated user wants to "start fresh" with photo uploads
 */
export const deleteAllUserImages = mutation({
  args: {},
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    _args: Record<string, never>
  ): Promise<{
    deletedCount: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    // Get all images for this user
    const images = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Delete storage and records
    for (const image of images) {
      await ctx.storage.delete(image.storageId);
      await ctx.db.delete(image._id);
    }

    return {
      deletedCount: images.length,
    };
  },
});

// ============================================
// AUTHENTICATED USER IMAGE MUTATIONS
// ============================================

/**
 * Generate an upload URL for a user image
 * Returns an upload URL that the client can use to upload the image directly to storage
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx, _args: Record<string, never>): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Verify user exists
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    // Check image count limit
    const existingImages = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    if (existingImages.length >= MAX_USER_PHOTOS) {
      throw new Error(`Maximum ${MAX_USER_PHOTOS} photos allowed`);
    }

    // Generate upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save a user image after it's been uploaded to storage
 */
export const saveUserImage = mutation({
  args: {
    storageId: v.id('_storage'),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    imageType: v.union(
      v.literal('full_body'),
      v.literal('upper_body'),
      v.literal('face'),
      v.literal('other')
    ),
    isPrimary: v.optional(v.boolean()),
  },
  returns: v.id('user_images'),
  handler: async (
    ctx: MutationCtx,
    args: {
      storageId: Id<'_storage'>;
      filename?: string;
      contentType?: string;
      sizeBytes?: number;
      imageType: 'full_body' | 'upper_body' | 'face' | 'other';
      isPrimary?: boolean;
    }
  ): Promise<Id<'user_images'>> => {
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

    // Check image count limit
    const existingImages = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    if (existingImages.length >= MAX_USER_PHOTOS) {
      // Delete the uploaded file since we can't use it
      await ctx.storage.delete(args.storageId);
      throw new Error(`Maximum ${MAX_USER_PHOTOS} photos allowed`);
    }

    // Determine if this should be primary
    let isPrimary = args.isPrimary ?? false;

    // If this is the first image, make it primary
    if (existingImages.length === 0) {
      isPrimary = true;
    }

    // If setting as primary, unset any existing primary
    if (isPrimary) {
      const currentPrimary = existingImages.find((img) => img.isPrimary);
      if (currentPrimary) {
        await ctx.db.patch(currentPrimary._id, {
          isPrimary: false,
          updatedAt: Date.now(),
        });
      }
    }

    const now = Date.now();
    const imageId = await ctx.db.insert('user_images', {
      userId: user._id,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      imageType: args.imageType,
      isPrimary,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return imageId;
  },
});

/**
 * Delete a user image
 */
export const deleteUserImage = mutation({
  args: {
    imageId: v.id('user_images'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { imageId: Id<'user_images'> }
  ): Promise<boolean> => {
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

    // Get the image
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error('Image not found');
    }

    // Verify ownership
    if (image.userId !== user._id) {
      throw new Error('Not authorized to delete this image');
    }

    // Delete from storage
    await ctx.storage.delete(image.storageId);

    // Delete the record
    await ctx.db.delete(args.imageId);

    // If this was the primary image, set another one as primary
    if (image.isPrimary) {
      const remainingImages = await ctx.db
        .query('user_images')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();

      if (remainingImages.length > 0) {
        await ctx.db.patch(remainingImages[0]._id, {
          isPrimary: true,
          updatedAt: Date.now(),
        });
      }
    }

    return true;
  },
});

/**
 * Set an image as the primary image for try-on
 */
export const setPrimaryImage = mutation({
  args: {
    imageId: v.id('user_images'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { imageId: Id<'user_images'> }
  ): Promise<boolean> => {
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

    // Get the image to set as primary
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error('Image not found');
    }

    // Verify ownership
    if (image.userId !== user._id) {
      throw new Error('Not authorized to modify this image');
    }

    // If already primary, nothing to do
    if (image.isPrimary) {
      return true;
    }

    // Get all user images and unset current primary
    const allImages = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const now = Date.now();
    for (const img of allImages) {
      if (img.isPrimary) {
        await ctx.db.patch(img._id, {
          isPrimary: false,
          updatedAt: now,
        });
      }
    }

    // Set the new primary
    await ctx.db.patch(args.imageId, {
      isPrimary: true,
      updatedAt: now,
    });

    return true;
  },
});

/**
 * Update image type classification
 */
export const updateImageType = mutation({
  args: {
    imageId: v.id('user_images'),
    imageType: v.union(
      v.literal('full_body'),
      v.literal('upper_body'),
      v.literal('face'),
      v.literal('other')
    ),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: {
      imageId: Id<'user_images'>;
      imageType: 'full_body' | 'upper_body' | 'face' | 'other';
    }
  ): Promise<boolean> => {
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

    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error('Image not found');
    }

    if (image.userId !== user._id) {
      throw new Error('Not authorized to modify this image');
    }

    await ctx.db.patch(args.imageId, {
      imageType: args.imageType,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// ============================================
// CLEANUP MUTATIONS (Internal only)
// ============================================

/**
 * Fix duplicate primary images for all users
 * Finds users with multiple isPrimary: true images and ensures only one is primary.
 * Keeps the oldest image (by _creationTime) as primary.
 * 
 * Run via: npx convex run userImages/mutations:fixDuplicatePrimaryImages
 */
export const fixDuplicatePrimaryImages = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, only logs what would happen
  },
  returns: v.object({
    usersWithDuplicates: v.number(),
    imagesFixed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { dryRun?: boolean }
  ): Promise<{
    usersWithDuplicates: number;
    imagesFixed: number;
    errors: Array<string>;
  }> => {
    const dryRun = args.dryRun ?? true; // Default to dry run for safety
    const errors: Array<string> = [];
    let usersWithDuplicates = 0;
    let imagesFixed = 0;

    // Get all user_images that are marked as primary
    const allPrimaryImages = await ctx.db
      .query('user_images')
      .filter((q) => q.eq(q.field('isPrimary'), true))
      .collect();

    // Group by userId
    const userIdToImages = new Map<Id<'users'>, Array<Doc<'user_images'>>>();
    for (const image of allPrimaryImages) {
      if (!image.userId) continue; // Skip images without userId (onboarding)
      
      const existing = userIdToImages.get(image.userId) || [];
      existing.push(image);
      userIdToImages.set(image.userId, existing);
    }

    // Find users with multiple primaries
    for (const [userId, images] of userIdToImages) {
      if (images.length <= 1) continue; // No duplicates

      usersWithDuplicates++;
      console.log(`User ${userId} has ${images.length} primary images`);

      // Sort by _creationTime ascending - oldest first
      images.sort((a, b) => a._creationTime - b._creationTime);

      // Keep the first one as primary, unset the rest
      const keepPrimary = images[0];
      const toUnset = images.slice(1);

      for (const image of toUnset) {
        try {
          if (!dryRun) {
            await ctx.db.patch(image._id, {
              isPrimary: false,
              updatedAt: Date.now(),
            });
          }
          imagesFixed++;
          console.log(`  Unset primary on image ${image._id} (keeping ${keepPrimary._id})`);
        } catch (error) {
          const errMsg = `Error unsetting primary on image ${image._id}: ${error}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    }

    const result = {
      usersWithDuplicates,
      imagesFixed,
      errors,
    };

    console.log('Fix complete:', result);
    if (dryRun) {
      console.log('DRY RUN - no changes were made. Run with dryRun: false to apply changes.');
    }

    return result;
  },
});

