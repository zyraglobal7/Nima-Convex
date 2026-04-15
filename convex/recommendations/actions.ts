'use node';

/**
 * Recommendation AI Actions
 * Generates contextual Nima comments for pre-selected outfit recommendations.
 */

import { internalAction, ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate short contextual Nima comments for all pending_comment recommendations
 * belonging to a user, then mark them active.
 */
export const generateComments = internalAction({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'> }
  ): Promise<null> => {
    const recs = (await ctx.runQuery(
      internal.recommendations.queries.getPendingComments,
      { userId: args.userId }
    )) as Array<{
      _id: Id<'recommendations'>;
      occasion: string;
      items: Array<{ name: string; category: string }>;
    }>;

    const user = await ctx.runQuery(internal.users.queries.getUserById, { userId: args.userId });

    if (!recs.length) return null;

    // Build profile context
    let profileContext = '';
    if (user) {
      const sp = user.styleProfile;
      if (sp && typeof sp === 'object' && 'styleIdentity' in sp) {
        const structured = sp as {
          styleIdentity?: { primary?: string };
          styleNarrative?: string;
          lifestyle?: { career?: string; hobbies?: string[] };
        };
        profileContext = `Style: ${structured.styleIdentity?.primary ?? 'casual'}. ${structured.styleNarrative ?? ''}. ${structured.lifestyle?.career ? `Career: ${structured.lifestyle.career}.` : ''} Hobbies: ${structured.lifestyle?.hobbies?.join(', ') ?? 'unknown'}.`;
      } else if (typeof sp === 'string') {
        profileContext = sp;
      } else {
        profileContext = `Style preferences: ${(user.stylePreferences ?? []).join(', ') || 'casual'}`;
      }
    }

    for (const rec of recs) {
      try {
        const itemList = rec.items.map((i) => i.name).join(', ');

        const prompt = `You are Nima, a warm, witty Kenyan fashion stylist. Generate a SHORT contextual comment (1–2 sentences max) for this outfit recommendation.

User profile: ${profileContext}
Occasion: ${rec.occasion}
Items: ${itemList}

The comment should:
- Reference the specific occasion naturally
- Feel personal and warm, like a friend giving advice
- Use Nima's voice (confident, playful, encouraging)
- Be very concise — it displays under outfit images in a feed

Good examples:
- "This combo would kill it on the golf course"
- "Perfect for those Saturday brunch vibes"
- "Wear this to your next deal-closing meeting and own the room"
- "This would be a killing for your next concert"

Return ONLY the comment text, no quotes, no explanation.`;

        const result = await generateText({
          model: openai('gpt-4o-mini'),
          prompt,
          temperature: 0.75,
          maxOutputTokens: 80,
        });

        await ctx.runMutation(internal.recommendations.mutations.updateComment, {
          recommendationId: rec._id,
          nimaComment: result.text.trim(),
        });
      } catch (err) {
        console.error(`[RECS] Failed to generate comment for rec ${rec._id}:`, err);
        // Mark active with a default comment so it still shows
        await ctx.runMutation(internal.recommendations.mutations.updateComment, {
          recommendationId: rec._id,
          nimaComment: `A curated look for your ${rec.occasion} occasion`,
        });
      }
    }

    return null;
  },
});
