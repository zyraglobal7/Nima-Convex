'use node';

import { action, internalAction, ActionCtx } from '../_generated/server';
import { internal, api } from '../_generated/api';
import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import * as crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  starter: 500,
  growth: 5000,
  enterprise: 999999,
};

/**
 * Generate a new API key, hash it, and create the partner record.
 * Returns the full key (only time it's visible).
 */
export const generateApiKey = internalAction({
  args: {
    name: v.string(),
    slug: v.string(),
    websiteUrl: v.string(),
    allowedDomains: v.array(v.string()),
    plan: v.union(
      v.literal('free'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('enterprise'),
    ),
    sellerId: v.optional(v.id('sellers')),
  },
  returns: v.object({
    partnerId: v.id('api_partners'),
    fullKey: v.string(),
    prefix: v.string(),
  }),
  handler: async (
    ctx: ActionCtx,
    args: {
      name: string;
      slug: string;
      websiteUrl: string;
      allowedDomains: string[];
      plan: 'free' | 'starter' | 'growth' | 'enterprise';
      sellerId?: Id<'sellers'>;
    }
  ): Promise<{ partnerId: Id<'api_partners'>; fullKey: string; prefix: string }> => {
    // Generate 32 random hex chars
    const randomPart = crypto.randomBytes(16).toString('hex'); // 32 hex chars
    const fullKey = `nima_pk_${randomPart}`;
    const prefix = randomPart.slice(0, 16); // first 16 chars for lookup

    // SHA-256 hash the full key
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const monthlyTryOnLimit = PLAN_LIMITS[args.plan] ?? 50;

    const partnerId = await ctx.runMutation(internal.connect.mutations.createPartner, {
      name: args.name,
      slug: args.slug,
      websiteUrl: args.websiteUrl,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
      allowedDomains: args.allowedDomains,
      plan: args.plan,
      monthlyTryOnLimit,
      sellerId: args.sellerId,
    });

    return { partnerId, fullKey, prefix };
  },
});

/**
 * Rotate an existing partner's API key.
 * Returns the new full key (only time it's visible).
 */
export const rotateApiKey = internalAction({
  args: { partnerId: v.id('api_partners') },
  returns: v.object({ fullKey: v.string(), prefix: v.string() }),
  handler: async (
    ctx: ActionCtx,
    args: { partnerId: Id<'api_partners'> }
  ): Promise<{ fullKey: string; prefix: string }> => {
    const randomPart = crypto.randomBytes(16).toString('hex');
    const fullKey = `nima_pk_${randomPart}`;
    const prefix = randomPart.slice(0, 16);
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

    await ctx.runMutation(internal.connect.mutations.updatePartner, {
      partnerId: args.partnerId,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
    });

    return { fullKey, prefix };
  },
});

/**
 * Generate a try-on image for a Connect session.
 * Works on api_sessions — no Nima user record required for guests.
 */
export const generateConnectTryOn = internalAction({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({ success: v.literal(true), resultImageUrl: v.string() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (
    ctx: ActionCtx,
    args: { sessionToken: string }
  ): Promise<
    | { success: true; resultImageUrl: string }
    | { success: false; error: string }
  > => {
    const startTime = Date.now();
    console.log(`[CONNECT_TRYON] Starting generation for session=${args.sessionToken}`);

    // Mark as processing
    await ctx.runMutation(internal.connect.mutations.updateSessionStatus, {
      sessionToken: args.sessionToken,
      status: 'processing',
    });

    const session = await ctx.runQuery(internal.connect.queries.getSessionByToken, {
      sessionToken: args.sessionToken,
    });

    if (!session) {
      console.error(`[CONNECT_TRYON] Session not found: ${args.sessionToken}`);
      return { success: false as const, error: 'Session not found' };
    }

    /** Fetch an image and return base64 + detected MIME type */
    async function fetchImage(url: string): Promise<{ data: string; mimeType: string } | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type') ?? '';
        // Normalize to a Gemini-supported MIME type
        let mimeType = 'image/jpeg';
        if (contentType.includes('image/png')) mimeType = 'image/png';
        else if (contentType.includes('image/webp')) mimeType = 'image/webp';
        else if (contentType.includes('image/gif')) mimeType = 'image/gif';
        else if (contentType.includes('image/heic') || contentType.includes('image/heif')) mimeType = 'image/jpeg'; // convert unsupported → jpeg label (Gemini doesn't support heic)
        const buf = await res.arrayBuffer();
        return { data: Buffer.from(buf).toString('base64'), mimeType };
      } catch {
        return null;
      }
    }

    try {
      // Get user photo: prefer linked Nima user's primary image, else guest upload
      let userImage: { data: string; mimeType: string } | null = null;

      if (session.nimaUserId) {
        const primaryImage = await ctx.runQuery(internal.workflows.queries.getUserPrimaryImage, {
          userId: session.nimaUserId,
        });
        if (primaryImage?.url) {
          userImage = await fetchImage(primaryImage.url);
          console.log(`[CONNECT_TRYON] Using authenticated user photo, session=${args.sessionToken}`);
        }
      }

      if (!userImage && session.guestImageStorageId) {
        const guestImageUrl = await ctx.storage.getUrl(session.guestImageStorageId);
        if (guestImageUrl) {
          userImage = await fetchImage(guestImageUrl);
          console.log(`[CONNECT_TRYON] Using guest upload photo, session=${args.sessionToken}`);
        }
      }

      if (!userImage) {
        throw new Error('No user photo available for try-on');
      }

      // Fetch product image
      const productImage = await fetchImage(session.productImageUrl);
      if (!productImage) {
        console.warn('[CONNECT_TRYON] Failed to fetch product image');
      }

      // Generate prompt via GPT-4o
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const productLabel = session.productName ?? 'clothing item';
      const categoryLabel = session.productCategory ?? 'outfit';

      const promptResult = await generateText({
        model: openai('gpt-4o'),
        prompt: `You are a fashion photography director. Write a detailed image generation prompt for a virtual try-on photo.

The person in the reference photo should be shown wearing this single clothing item:
- ${productLabel}
- Category: ${categoryLabel}

Create a prompt that:
1. Describes how the person should be wearing this item naturally
2. Maintains the person's identity, face, and body from the reference
3. Shows ONLY this single item - do not add other clothing items
4. Results in a high-quality, professional fashion photography style image
5. Specifies natural lighting and a clean background

Keep the prompt concise but detailed (under 400 characters). Do not include any markdown formatting.`,
        temperature: 0.7,
      });

      const generatedPrompt = promptResult.text.trim();

      // Call Gemini for image generation
      const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_KEY });

      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      contents.push({
        text: `Virtual try-on fashion photo: Create an image of this person (shown in Reference Image 1) wearing the product shown in Reference Image 2.

Reference Image 1: Photo of the person
Reference Image 2: ${productLabel}

${generatedPrompt}

Important:
- Keep the person's face, body type & size, and identity exactly as shown in Reference Image 1
- Dress them in ONLY the product from Reference Image 2
- Make it look like a professional fashion photograph`,
      });

      contents.push({ inlineData: { mimeType: userImage.mimeType, data: userImage.data } });
      if (productImage) {
        contents.push({ inlineData: { mimeType: productImage.mimeType, data: productImage.data } });
      }

      const response = await genAI.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents,
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      let generatedImageBase64: string | null = null;

      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            generatedImageBase64 = part.inlineData.data;
            break;
          }
        }
      }

      // First attempt returned no image — retry once with a simpler prompt but
      // keeping both reference images so identity is preserved
      if (!generatedImageBase64) {
        console.warn('[CONNECT_TRYON] No image on first attempt, retrying with simplified prompt...');

        const retryContents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
          {
            text: `Show the person from Reference Image 1 wearing the clothing item from Reference Image 2. Keep the person's face, skin tone, and body exactly as they appear. Professional fashion photo, clean background.`,
          },
          { inlineData: { mimeType: userImage.mimeType, data: userImage.data } },
        ];
        if (productImage) {
          retryContents.push({ inlineData: { mimeType: productImage.mimeType, data: productImage.data } });
        }

        const retryResponse = await genAI.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: retryContents,
          config: { responseModalities: ['TEXT', 'IMAGE'] },
        });

        const retryParts = retryResponse.candidates?.[0]?.content?.parts;
        if (retryParts) {
          for (const part of retryParts) {
            if (part.inlineData?.data) {
              generatedImageBase64 = part.inlineData.data;
              console.log('[CONNECT_TRYON] Retry succeeded');
              break;
            }
          }
        }
      }

      if (!generatedImageBase64) {
        throw new Error('Image generation failed — model did not return an image');
      }

      // Store result in Convex storage
      const imageBytes = Buffer.from(generatedImageBase64, 'base64');
      const imageBlob = new Blob([imageBytes], { type: 'image/png' });
      const resultStorageId: Id<'_storage'> = await ctx.storage.store(imageBlob);

      const generationTimeMs = Date.now() - startTime;

      // For authenticated sessions: deduct 1 credit
      if (session.nimaUserId) {
        const creditResult = await ctx.runMutation(internal.credits.mutations.deductCredit, {
          userId: session.nimaUserId,
          count: 1,
        });
        if (!creditResult.success) {
          console.error(`[CONNECT_TRYON] Insufficient credits for user=${session.nimaUserId}, session=${args.sessionToken}`);
          await ctx.runMutation(internal.connect.mutations.updateSessionStatus, {
            sessionToken: args.sessionToken,
            status: 'failed',
            errorMessage: 'insufficient_credits',
          });
          return { success: false as const, error: 'insufficient_credits' };
        }
        console.log(`[CONNECT_TRYON] Credit deducted for user=${session.nimaUserId}, session=${args.sessionToken}`);
      }

      // For guest sessions: increment try-on count (gate fires at >= 2)
      const newGuestCount = session.nimaUserId ? undefined : (session.guestTryOnCount ?? 0) + 1;

      // Update session to completed
      await ctx.runMutation(internal.connect.mutations.updateSessionStatus, {
        sessionToken: args.sessionToken,
        status: 'completed',
        resultStorageId,
        guestTryOnUsed: session.nimaUserId ? false : (newGuestCount ?? 0) >= 2,
        ...(newGuestCount !== undefined ? { guestTryOnCount: newGuestCount } : {}),
      });

      // Increment partner usage
      await ctx.runMutation(internal.connect.mutations.incrementPartnerUsage, {
        partnerId: session.partnerId,
      });

      // Log the event
      await ctx.runMutation(internal.connect.mutations.logUsageEvent, {
        partnerId: session.partnerId,
        sessionId: session._id,
        eventType: 'tryon_generated',
        externalProductId: session.externalProductId,
        wasAuthenticated: !!session.nimaUserId,
        generationTimeMs,
      });

      console.log(`[CONNECT_TRYON] Success: session=${args.sessionToken}, generationTimeMs=${generationTimeMs}`);
      const resultImageUrl = await ctx.storage.getUrl(resultStorageId);
      return { success: true as const, resultImageUrl: resultImageUrl ?? '' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CONNECT_TRYON] Failed:', errorMessage);

      await ctx.runMutation(internal.connect.mutations.updateSessionStatus, {
        sessionToken: args.sessionToken,
        status: 'failed',
        errorMessage,
      });

      // Log failure
      try {
        await ctx.runMutation(internal.connect.mutations.logUsageEvent, {
          partnerId: session.partnerId,
          sessionId: session._id,
          eventType: 'tryon_failed',
          externalProductId: session.externalProductId,
          wasAuthenticated: !!session.nimaUserId,
        });
      } catch {
        // ignore log failure
      }

      return { success: false as const, error: errorMessage };
    }
  },
});

/**
 * Public: rotate API key (admin or linked seller)
 */
export const rotateApiKeyPublic = action({
  args: { partnerId: v.id('api_partners') },
  returns: v.object({ fullKey: v.string(), prefix: v.string() }),
  handler: async (
    ctx: ActionCtx,
    args: { partnerId: Id<'api_partners'> }
  ): Promise<{ fullKey: string; prefix: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const user = await ctx.runQuery(api.users.queries.getUserByWorkosId, {
      workosUserId: identity.subject,
    });
    if (!user) throw new Error('Unauthorized');

    // Allow admins or sellers linked to the partner
    if (user.role !== 'admin') {
      const seller = await ctx.runQuery(api.sellers.queries.getCurrentSeller);
      if (!seller) throw new Error('Unauthorized');
      const partner = await ctx.runQuery(internal.connect.queries.getPartnerBySeller, {
        sellerId: seller._id,
      });
      if (!partner || partner._id !== args.partnerId) throw new Error('Unauthorized');
    }

    return ctx.runAction(internal.connect.actions.rotateApiKey, {
      partnerId: args.partnerId,
    });
  },
});

/**
 * Public: create a partner (admin only)
 */
export const adminCreatePartnerPublic = action({
  args: {
    name: v.string(),
    slug: v.string(),
    websiteUrl: v.string(),
    allowedDomains: v.array(v.string()),
    plan: v.union(
      v.literal('free'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('enterprise'),
    ),
  },
  returns: v.object({
    partnerId: v.id('api_partners'),
    fullKey: v.string(),
  }),
  handler: async (
    ctx: ActionCtx,
    args: {
      name: string;
      slug: string;
      websiteUrl: string;
      allowedDomains: string[];
      plan: 'free' | 'starter' | 'growth' | 'enterprise';
    }
  ): Promise<{ partnerId: Id<'api_partners'>; fullKey: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const user = await ctx.runQuery(api.users.queries.getUserByWorkosId, {
      workosUserId: identity.subject,
    });
    if (!user || user.role !== 'admin') throw new Error('Admin access required');

    const result = await ctx.runAction(internal.connect.actions.generateApiKey, {
      name: args.name,
      slug: args.slug,
      websiteUrl: args.websiteUrl,
      allowedDomains: args.allowedDomains,
      plan: args.plan,
    });
    return { partnerId: result.partnerId, fullKey: result.fullKey };
  },
});

/**
 * Public: seller self-creates a free API partner (no admin approval needed)
 */
export const sellerCreatePartner = action({
  args: { websiteUrl: v.optional(v.string()) },
  returns: v.object({ partnerId: v.id('api_partners'), fullKey: v.string(), prefix: v.string() }),
  handler: async (
    ctx: ActionCtx,
    args: { websiteUrl?: string }
  ): Promise<{ partnerId: Id<'api_partners'>; fullKey: string; prefix: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const user = await ctx.runQuery(api.users.queries.getUserByWorkosId, {
      workosUserId: identity.subject,
    });
    if (!user) throw new Error('Unauthorized');

    const seller = await ctx.runQuery(api.sellers.queries.getCurrentSeller);
    if (!seller) throw new Error('Seller account required');

    // Prevent duplicate partner
    const existing = await ctx.runQuery(internal.connect.queries.getPartnerBySeller, {
      sellerId: seller._id,
    });
    if (existing) throw new Error('API partner already exists for this seller');

    const result = await ctx.runAction(internal.connect.actions.generateApiKey, {
      name: seller.shopName,
      slug: seller.slug,
      websiteUrl: args.websiteUrl ?? '',
      allowedDomains: [],
      plan: 'free',
      sellerId: seller._id,
    });

    return result;
  },
});

/**
 * Admin action: create a partner (exposed publicly with admin check)
 */
export const adminCreatePartner = internalAction({
  args: {
    name: v.string(),
    slug: v.string(),
    websiteUrl: v.string(),
    allowedDomains: v.array(v.string()),
    plan: v.union(
      v.literal('free'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('enterprise'),
    ),
  },
  returns: v.object({
    partnerId: v.id('api_partners'),
    fullKey: v.string(),
  }),
  handler: async (
    ctx: ActionCtx,
    args: {
      name: string;
      slug: string;
      websiteUrl: string;
      allowedDomains: string[];
      plan: 'free' | 'starter' | 'growth' | 'enterprise';
    }
  ): Promise<{ partnerId: Id<'api_partners'>; fullKey: string }> => {
    const result = await ctx.runAction(internal.connect.actions.generateApiKey, {
      name: args.name,
      slug: args.slug,
      websiteUrl: args.websiteUrl,
      allowedDomains: args.allowedDomains,
      plan: args.plan,
    });
    return { partnerId: result.partnerId, fullKey: result.fullKey };
  },
});
