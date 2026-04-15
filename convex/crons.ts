import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// ============================================
// NIMA WRAPPED CRON JOB
// ============================================

/**
 * Daily check at midnight UTC to see if we should generate Nima Wrapped
 * This checks the wrapped_settings table for the configured run date
 * and triggers generation if today matches.
 */
crons.daily(
  'check-wrapped-generation',
  { hourUTC: 0, minuteUTC: 0 },
  internal.wrapped.actions.checkAndGenerateWrapped
);

// ============================================
// SELLER SUBSCRIPTION EXPIRY
// ============================================

/**
 * Daily check at 1am UTC: expire any active subscriptions past their periodEnd
 * and downgrade those sellers back to the basic tier.
 */
crons.daily(
  'expire-seller-subscriptions',
  { hourUTC: 1, minuteUTC: 0 },
  internal.sellers.subscriptions.expireSubscriptions
);

// ============================================
// RECOMMENDATION ENGINE — WEEKLY + DAILY CLEANUP
// ============================================

/**
 * Every Monday at 6am EAT (3am UTC): generate personalised weekly recommendations
 * for all users who have a style profile or style preferences.
 */
crons.weekly(
  'generate-weekly-recommendations',
  { hourUTC: 3, minuteUTC: 0, dayOfWeek: 'monday' },
  internal.recommendations.mutations.generateWeeklyRecommendationsForAll
);

/**
 * Daily at midnight UTC: mark expired recommendations as expired.
 */
crons.daily(
  'cleanup-expired-recommendations',
  { hourUTC: 0, minuteUTC: 30 },
  internal.recommendations.mutations.cleanupExpired
);

export default crons;

