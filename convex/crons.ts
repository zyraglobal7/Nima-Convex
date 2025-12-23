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

export default crons;

