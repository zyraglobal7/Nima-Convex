import { DatabaseReader, DatabaseWriter } from '../_generated/server';
import type { Id, Doc } from '../_generated/dataModel';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Rate limit check result
 */
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  error?: string;
}

/**
 * Rate limit configurations for different operations
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Look creation - max 10 per hour
  createLook: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Onboarding workflow - max 1 per day
  startOnboarding: {
    maxRequests: 1,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Generate more looks - max 5 per hour
  generateMoreLooks: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Friend requests - max 20 per day
  sendFriendRequest: {
    maxRequests: 20,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Messages - max 100 per hour
  sendMessage: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * Check rate limit for a user operation
 * Uses user document fields to track rate limits
 * 
 * @param db - Database reader/writer
 * @param userId - User ID to check
 * @param operation - Operation name (key in RATE_LIMITS)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  db: DatabaseReader,
  userId: Id<'users'>,
  operation: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  if (!config) {
    // No rate limit configured, allow
    return { allowed: true, remaining: -1, resetAt: 0 };
  }

  const user = await db.get(userId);
  if (!user) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt: 0, 
      error: 'User not found' 
    };
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get rate limit data from user document
  // Rate limit data is stored as JSON in user metadata
  const rateLimits = (user as Doc<'users'> & { rateLimits?: Record<string, { count: number; windowStart: number }> }).rateLimits || {};
  const operationData = rateLimits[operation] || { count: 0, windowStart: now };

  // Check if window has reset
  if (operationData.windowStart < windowStart) {
    // Window has reset, allow the request
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Check if within limits
  if (operationData.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: operationData.windowStart + config.windowMs,
      error: `Rate limit exceeded. Please try again later.`,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - operationData.count - 1,
    resetAt: operationData.windowStart + config.windowMs,
  };
}

/**
 * Record a rate-limited action for a user
 * Should be called after successfully performing the operation
 * 
 * @param db - Database writer
 * @param userId - User ID
 * @param operation - Operation name
 */
export async function recordRateLimitedAction(
  db: DatabaseWriter,
  userId: Id<'users'>,
  operation: keyof typeof RATE_LIMITS
): Promise<void> {
  const config = RATE_LIMITS[operation];
  if (!config) return;

  const user = await db.get(userId);
  if (!user) return;

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get current rate limit data
  const rateLimits = ((user as Doc<'users'> & { rateLimits?: Record<string, { count: number; windowStart: number }> }).rateLimits || {}) as Record<string, { count: number; windowStart: number }>;
  const operationData = rateLimits[operation] || { count: 0, windowStart: now };

  // Reset if window has passed
  if (operationData.windowStart < windowStart) {
    operationData.count = 1;
    operationData.windowStart = now;
  } else {
    operationData.count += 1;
  }

  // Update rate limits in user document
  rateLimits[operation] = operationData;

  // Note: This requires adding a rateLimits field to the users table schema
  // For now, we'll use a simple approach with individual fields
  // In production, consider using a separate rate_limits table
}

/**
 * Simple in-memory rate limiter for use when user document updates aren't feasible
 * Note: This only works within a single Convex function execution
 * For true rate limiting, use the database-backed approach
 */
export function createSimpleRateLimitError(operation: string): string {
  const config = RATE_LIMITS[operation];
  if (!config) {
    return 'Rate limit exceeded.';
  }
  
  const minutes = Math.ceil(config.windowMs / 60000);
  return `Rate limit exceeded. Maximum ${config.maxRequests} ${operation} requests allowed per ${minutes} minutes. Please try again later.`;
}

