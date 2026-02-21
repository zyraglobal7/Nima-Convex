/**
 * Shared TypeScript types for Nima AI Convex backend
 * These types mirror the schema validators for use in function signatures
 */

import type { Id, Doc } from './_generated/dataModel';

// ============================================
// ENUMS & LITERALS
// ============================================

/** User gender options */
export type Gender = 'male' | 'female' | 'prefer-not-to-say';

/** Height measurement units */
export type HeightUnit = 'cm' | 'ft';

/** Shoe size systems */
export type ShoeSizeUnit = 'EU' | 'US' | 'UK';

/** Budget range tiers */
export type BudgetRange = 'low' | 'mid' | 'premium';

/** Subscription tiers */
export type SubscriptionTier = 'free' | 'style_pass' | 'vip';

/** Item categories */
export type ItemCategory =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outfit'
  | 'outerwear'
  | 'shoes'
  | 'accessory'
  | 'bag'
  | 'jewelry';

/** Item gender targeting */
export type ItemGender = 'male' | 'female' | 'unisex';

/** User image types for try-on */
export type UserImageType = 'full_body' | 'upper_body' | 'face' | 'other';

/** Image processing status */
export type ImageProcessingStatus = 'onboarding' | 'pending' | 'processed' | 'failed';

/** Item image types */
export type ItemImageType = 'front' | 'back' | 'side' | 'detail' | 'model' | 'flat_lay';

/** Look image generation status */
export type LookImageStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Lookbook item types */
export type LookbookItemType = 'look' | 'item';

/** Thread context types */
export type ThreadContextType = 'general' | 'look' | 'item' | 'outfit_help';

/** Message roles */
export type MessageRole = 'user' | 'assistant';

/** Message status */
export type MessageStatus = 'sent' | 'streaming' | 'error';

/** Message attachment types */
export type AttachmentType = 'image' | 'look' | 'item';

/** Look creator types */
export type LookCreatorType = 'system' | 'user';

// ============================================
// DOCUMENT TYPES (from schema)
// ============================================

export type User = Doc<'users'>;
export type UserImage = Doc<'user_images'>;
export type Item = Doc<'items'>;
export type ItemImage = Doc<'item_images'>;
export type Look = Doc<'looks'>;
export type LookImage = Doc<'look_images'>;
export type Lookbook = Doc<'lookbooks'>;
export type LookbookItem = Doc<'lookbook_items'>;
export type Thread = Doc<'threads'>;
export type Message = Doc<'messages'>;

// ============================================
// INPUT TYPES (for mutations)
// ============================================

/** Input for creating/updating user profile */
export interface UserProfileInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  age?: string;
  stylePreferences?: string[];
  shirtSize?: string;
  waistSize?: string;
  height?: string;
  heightUnit?: HeightUnit;
  shoeSize?: string;
  shoeSizeUnit?: ShoeSizeUnit;
  country?: string;
  currency?: string;
  budgetRange?: BudgetRange;
  phoneNumber?: string;
}

/** Input for completing onboarding */
export interface OnboardingInput {
  gender: Gender;
  age: string;
  stylePreferences: string[];
  shirtSize: string;
  waistSize: string;
  height: string;
  heightUnit: HeightUnit;
  shoeSize: string;
  shoeSizeUnit: ShoeSizeUnit;
  country: string;
  currency: string;
  budgetRange: BudgetRange;
}

/** Input for creating a user from WorkOS webhook */
export interface WorkOSUserInput {
  workosUserId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

/** Input for creating a lookbook */
export interface CreateLookbookInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

/** Input for creating a thread */
export interface CreateThreadInput {
  title?: string;
  contextType?: ThreadContextType;
  contextLookId?: Id<'looks'>;
  contextItemId?: Id<'items'>;
}

/** Input for sending a message */
export interface SendMessageInput {
  threadId: Id<'threads'>;
  content: string;
  attachments?: Array<{
    type: AttachmentType;
    storageId?: Id<'_storage'>;
    lookId?: Id<'looks'>;
    itemId?: Id<'items'>;
  }>;
}

// ============================================
// OUTPUT TYPES (for queries)
// ============================================

/** User with resolved profile image URL */
export interface UserWithImage extends User {
  resolvedProfileImageUrl?: string | null;
}

/** Item with primary image */
export interface ItemWithImage extends Item {
  primaryImage?: ItemImage | null;
  primaryImageUrl?: string | null;
}

/** Look with items and images */
export interface LookWithDetails extends Look {
  items: ItemWithImage[];
  primaryImage?: LookImage | null;
}

/** Lookbook with preview items */
export interface LookbookWithPreview extends Lookbook {
  previewItems: Array<ItemWithImage | LookWithDetails>;
  coverImageUrl?: string | null;
}

/** Thread with last message preview */
export interface ThreadWithPreview extends Thread {
  lastMessage?: Message | null;
}

// ============================================
// PAGINATION
// ============================================

/** Standard pagination options */
export interface PaginationOptions {
  cursor?: string | null;
  limit?: number;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string | null;
  hasMore: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a random public ID with prefix
 * @param prefix - The prefix for the ID (e.g., "item", "look", "user")
 * @returns A random ID like "item_abc123xyz"
 */
export function generatePublicId(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${result}`;
}

/**
 * Generate a share token for lookbooks
 * @returns A random share token
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate an onboarding token for tracking images before auth
 * @returns A random onboarding token
 */
export function generateOnboardingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `onb_${result}`;
}

/**
 * Check if a username is valid
 * - 3-20 characters
 * - Only lowercase letters, numbers, and underscores
 * - Must start with a letter
 * @param username - The username to validate
 * @returns Whether the username is valid
 */
export function isValidUsername(username: string): boolean {
  const regex = /^[a-z][a-z0-9_]{2,19}$/;
  return regex.test(username);
}

/**
 * Get the start of the current day in UTC (for daily limit resets)
 * @returns Timestamp of the start of the current UTC day
 */
export function getStartOfDayUTC(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Check if a daily limit should be reset
 * @param resetAt - The timestamp when the limit was last reset
 * @returns Whether the limit should be reset
 */
export function shouldResetDailyLimit(resetAt: number): boolean {
  const startOfToday = getStartOfDayUTC();
  return resetAt < startOfToday;
}

/**
 * Check if weekly free credits should be reset
 * @param resetAt - The timestamp when free credits were last reset
 * @returns Whether free credits should be reset
 */
export function shouldResetWeeklyCredits(resetAt: number): boolean {
  return Date.now() - resetAt >= ONE_WEEK_MS;
}

/**
 * Get the user's total available credits (free remaining + purchased)
 */
export function calculateAvailableCredits(
  freeCreditsUsedThisWeek: number,
  weeklyCreditsResetAt: number,
  purchasedCredits: number,
): { freeRemaining: number; purchased: number; total: number } {
  // Check if free credits should be reset
  const shouldReset = shouldResetWeeklyCredits(weeklyCreditsResetAt);
  const freeUsed = shouldReset ? 0 : freeCreditsUsedThisWeek;
  const freeRemaining = Math.max(0, FREE_WEEKLY_CREDITS - freeUsed);

  return {
    freeRemaining,
    purchased: purchasedCredits,
    total: freeRemaining + purchasedCredits,
  };
}

/**
 * Generate a unique merchant transaction ID for Fingo Pay
 */
export function generateMerchantTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `nima_cr_${result}`;
}

/** Credit purchase status */
export type CreditPurchaseStatus = 'pending' | 'completed' | 'failed';

/** Push notification platform */
export type PushPlatform = 'ios' | 'android' | 'web';

export type CreditPurchase = Doc<'credit_purchases'>;
export type PushToken = Doc<'push_tokens'>;

// ============================================
// CREDIT PACKAGES
// ============================================

/** Available credit packages */
export interface CreditPackage {
  id: string;
  credits: number;
  priceKes: number;
  label: string;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pack_10', credits: 10, priceKes: 500, label: '10 Credits' },
  { id: 'pack_20', credits: 20, priceKes: 1000, label: '20 Credits', popular: true },
  { id: 'pack_50', credits: 50, priceKes: 2500, label: '50 Credits' },
  { id: 'pack_100', credits: 100, priceKes: 5000, label: '100 Credits' },
];

/** Free credits per week */
export const FREE_WEEKLY_CREDITS = 5;

/** Milliseconds in a week */
export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================
// CONSTANTS
// ============================================

/** Daily try-on limits by subscription tier (deprecated - use credits system) */
export const DAILY_TRYON_LIMITS: Record<SubscriptionTier, number> = {
  free: 20,
  style_pass: 100,
  vip: -1, // Unlimited
};

/** Maximum items per lookbook */
export const MAX_LOOKBOOK_ITEMS = 100;

/** Maximum photos per user */
export const MAX_USER_PHOTOS = 10;

/** Maximum onboarding photos */
export const MAX_ONBOARDING_PHOTOS = 4;

/** Maximum file size for image uploads (10MB) */
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed image content types */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'] as const;

/** Allowed image extensions */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'] as const;

/** Maximum message length */
export const MAX_MESSAGE_LENGTH = 4000;

/** Default pagination limit */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum pagination limit */
export const MAX_PAGE_SIZE = 100;

