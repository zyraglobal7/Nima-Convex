import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// ── Formality helpers (mirrors chat/mutations.ts) ─────────────────────────────

type FormalityLevel = 'casual' | 'smart_casual' | 'formal' | 'evening';

const FORMALITY_ORDER: FormalityLevel[] = ['casual', 'smart_casual', 'formal', 'evening'];

const FORMALITY_KEYWORDS: Record<FormalityLevel, string[]> = {
  casual: [
    'sweatpants', 'hoodie', 'sneakers', 'track pants', 't-shirt', 'tee',
    'joggers', 'slides', 'flip-flops', 'cargo', 'denim', 'jeans', 'casual',
    'streetwear', 'athleisure', 'sporty', 'relaxed', 'everyday', 'weekend',
  ],
  smart_casual: [
    'chinos', 'polo', 'loafers', 'blazer', 'cardigan', 'khaki', 'button-up',
    'smart', 'brunch', 'date', 'work', 'office', 'business casual', 'preppy',
    'classic', 'timeless', 'versatile', 'refined',
  ],
  formal: [
    'dress pants', 'dress shirt', 'oxford', 'heels', 'boots', 'formal',
    'suit', 'tailored', 'professional', 'meeting', 'interview', 'elegant',
    'sophisticated', 'polished', 'structured',
  ],
  evening: [
    'gown', 'cocktail dress', 'tuxedo', 'evening', 'black tie', 'red carpet',
    'glamorous', 'luxe', 'party', 'gala', 'wedding', 'prom', 'ball',
  ],
};

function getFormalityLevel(item: Doc<'items'>): FormalityLevel {
  const text = [
    item.name.toLowerCase(),
    item.subcategory?.toLowerCase() ?? '',
    ...item.tags.map((t) => t.toLowerCase()),
    ...(item.occasion ?? []).map((o) => o.toLowerCase()),
  ].join(' ');

  for (const level of [...FORMALITY_ORDER].reverse()) {
    if (FORMALITY_KEYWORDS[level].some((kw) => text.includes(kw))) return level;
  }
  return 'smart_casual';
}

function formalityScore(item1: Doc<'items'>, item2: Doc<'items'>): number {
  const diff = Math.abs(
    FORMALITY_ORDER.indexOf(getFormalityLevel(item1)) -
      FORMALITY_ORDER.indexOf(getFormalityLevel(item2))
  );
  if (diff === 0) return 25;
  if (diff === 1) return 10;
  return -20;
}

function coherenceScore(item: Doc<'items'>, existing: Doc<'items'>[]): number {
  if (existing.length === 0) return 100;
  const scores = existing.map((e) => {
    let s = formalityScore(item, e);
    const sharedOccasions = (item.occasion ?? []).filter((o) =>
      (e.occasion ?? []).includes(o)
    );
    s += sharedOccasions.length * 15;
    const sharedTags = item.tags.filter((t) => e.tags.includes(t));
    s += sharedTags.length * 5;
    return s;
  });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ── Occasion → formality mapping ─────────────────────────────────────────────

const OCCASION_FORMALITY: Record<string, FormalityLevel> = {
  work: 'smart_casual',
  office: 'smart_casual',
  meeting: 'formal',
  date: 'smart_casual',
  weekend: 'casual',
  casual: 'casual',
  gym: 'casual',
  travel: 'casual',
  golf: 'smart_casual',
  wedding: 'evening',
  party: 'evening',
  concert: 'smart_casual',
  brunch: 'smart_casual',
};

function occasionToFormality(occasion: string): FormalityLevel {
  const lower = occasion.toLowerCase();
  for (const [key, level] of Object.entries(OCCASION_FORMALITY)) {
    if (lower.includes(key)) return level;
  }
  return 'smart_casual';
}

// ── Monday helper ─────────────────────────────────────────────────────────────

function getMondayTimestamp(ts: number): number {
  const d = new Date(ts);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since last Monday
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - diff);
  return d.getTime();
}

// ── Core item selection for a single occasion ─────────────────────────────────

async function selectItemsForOccasion(
  db: MutationCtx['db'],
  gender: 'male' | 'female' | 'unisex',
  occasion: string,
  styleProfile: unknown
): Promise<Id<'items'>[]> {
  const targetFormality = occasionToFormality(occasion);

  // Pull active items for this gender (and unisex)
  const genderItems = await db
    .query('items')
    .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', gender))
    .take(200);

  const unisexItems = await db
    .query('items')
    .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', 'unisex'))
    .take(100);

  const pool = [...genderItems, ...unisexItems];
  if (pool.length === 0) return [];

  // Score each item against the target occasion formality
  const scored = pool
    .filter((item) => item.inStock)
    .map((item) => {
      const formalityDiff = Math.abs(
        FORMALITY_ORDER.indexOf(getFormalityLevel(item)) -
          FORMALITY_ORDER.indexOf(targetFormality)
      );
      // Tag/occasion relevance
      const occasionMatch = (item.occasion ?? []).some((o) =>
        o.toLowerCase().includes(occasion.toLowerCase())
      )
        ? 20
        : 0;

      // Style profile color alignment (basic)
      let profileBonus = 0;
      if (
        styleProfile &&
        typeof styleProfile === 'object' &&
        'aestheticPreferences' in (styleProfile as Record<string, unknown>)
      ) {
        const sp = styleProfile as { aestheticPreferences?: { colorPalette?: string[] } };
        const palette = sp.aestheticPreferences?.colorPalette ?? [];
        const hasMatch = item.colors.some((c) =>
          palette.some((p) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()))
        );
        if (hasMatch) profileBonus = 10;
      }

      return {
        item,
        score: 30 - formalityDiff * 10 + occasionMatch + profileBonus,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Build a coherent outfit: 1 top + 1 bottom (or dress/outfit) + 1 shoes + optional accessory
  const outfit: Doc<'items'>[] = [];
  const usedCategories = new Set<string>();

  // Priority order for category filling
  const categoryPriority = ['top', 'bottom', 'dress', 'outfit', 'shoes', 'outerwear', 'accessory'];

  for (const priority of categoryPriority) {
    if (outfit.length >= 4) break;

    // If we already have a dress/outfit, skip tops/bottoms
    if (
      (priority === 'top' || priority === 'bottom') &&
      (usedCategories.has('dress') || usedCategories.has('outfit'))
    ) {
      continue;
    }

    // Only one item per category
    if (usedCategories.has(priority)) continue;

    const candidates = scored.filter(
      ({ item }) =>
        item.category === priority &&
        !usedCategories.has(item.category) &&
        coherenceScore(item, outfit) >= 0
    );

    if (candidates.length > 0) {
      // Pick from top 3 candidates (some randomness)
      const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
      outfit.push(pick.item);
      usedCategories.add(pick.item.category);
    }
  }

  // Need at least 2 items to be a valid recommendation
  if (outfit.length < 2) return [];

  return outfit.map((i) => i._id);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Internal: generate recommendations for a single user.
 * Called by the weekly cron via generateWeeklyRecommendationsForAll.
 */
export const generateWeeklyRecommendations = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'> }
  ): Promise<null> => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.isActive) return null;

    // Determine occasions to generate recs for
    let occasions: string[] = user.occasions ?? [];
    if (occasions.length === 0) {
      // Fall back to style preferences as occasion hints
      occasions = (user.stylePreferences ?? []).slice(0, 3);
    }
    if (occasions.length === 0) {
      occasions = ['casual', 'work'];
    }

    const gender = user.gender === 'prefer-not-to-say' ? 'unisex' : (user.gender ?? 'unisex');
    const weekOf = getMondayTimestamp(Date.now());
    const expiresAt = weekOf + 7 * 24 * 60 * 60 * 1000;

    // Check if we already generated this week
    const existingThisWeek = await ctx.db
      .query('recommendations')
      .withIndex('by_user_and_created', (q) => q.eq('userId', args.userId))
      .filter((q) => q.gte(q.field('weekOf'), weekOf))
      .first();

    if (existingThisWeek) {
      console.log(`[RECS] Already generated this week for user ${args.userId}`);
      return null;
    }

    // Generate one recommendation per occasion (up to 5)
    const createdIds: Id<'recommendations'>[] = [];
    for (const occasion of occasions.slice(0, 5)) {
      const itemIds = await selectItemsForOccasion(
        ctx.db,
        gender as 'male' | 'female' | 'unisex',
        occasion,
        user.styleProfile
      );

      if (itemIds.length >= 2) {
        const recId = await ctx.db.insert('recommendations', {
          userId: args.userId,
          itemIds,
          occasion,
          nimaComment: '', // filled by generateComments action
          status: 'pending_comment',
          weekOf,
          createdAt: Date.now(),
          expiresAt,
        });
        createdIds.push(recId);
      }
    }

    // Trigger comment generation if we created any recommendations
    if (createdIds.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.recommendations.actions.generateComments,
        { userId: args.userId }
      );
    }

    return null;
  },
});

/**
 * Internal: generate recommendations for ALL active users with a style profile.
 * Triggered by the weekly cron job.
 */
export const generateWeeklyRecommendationsForAll = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx: MutationCtx, _args: Record<string, never>): Promise<null> => {
    const users = await ctx.db.query('users').collect();
    const eligible = users.filter(
      (u) => u.isActive && (u.styleProfile || (u.stylePreferences ?? []).length > 0)
    );

    for (const user of eligible) {
      await ctx.scheduler.runAfter(
        0,
        internal.recommendations.mutations.generateWeeklyRecommendations,
        { userId: user._id }
      );
    }

    console.log(`[RECS] Scheduled recommendation generation for ${eligible.length} users`);
    return null;
  },
});

/**
 * Internal: update a recommendation with the AI-generated comment and mark it active.
 */
export const updateComment = internalMutation({
  args: {
    recommendationId: v.id('recommendations'),
    nimaComment: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { recommendationId: Id<'recommendations'>; nimaComment: string }
  ): Promise<null> => {
    await ctx.db.patch(args.recommendationId, {
      nimaComment: args.nimaComment,
      status: 'active',
    });
    return null;
  },
});

/**
 * Internal: mark expired recommendations as expired.
 */
export const cleanupExpired = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx: MutationCtx, _args: Record<string, never>): Promise<null> => {
    const now = Date.now();
    const expired = await ctx.db
      .query('recommendations')
      .withIndex('by_expires', (q) => q.lt('expiresAt', now))
      .collect();

    for (const rec of expired) {
      if (rec.status !== 'tried_on' && rec.status !== 'expired') {
        await ctx.db.patch(rec._id, { status: 'expired' });
      }
    }
    return null;
  },
});

/**
 * Public: mark a recommendation as tried_on (called when user taps "Try it On").
 */
export const markTriedOn = mutation({
  args: { recommendationId: v.id('recommendations') },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { recommendationId: Id<'recommendations'> }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const rec = await ctx.db.get(args.recommendationId);
    if (!rec) throw new Error('Recommendation not found');

    // Verify ownership
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || rec.userId !== user._id) throw new Error('Not authorized');

    await ctx.db.patch(args.recommendationId, { status: 'tried_on' });
    return null;
  },
});
