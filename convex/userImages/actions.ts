'use node';

import { action, ActionCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const photoValidationSchema = z.object({
  valid: z.boolean(),
  face_visible: z.boolean(),
  face_clear: z.boolean(),
  is_portrait: z.boolean(),
  quality: z.enum(['good', 'acceptable', 'poor']),
  issue: z.string().nullable(),
});

/**
 * Validate an onboarding image using GPT-4o vision.
 * Checks for face visibility, image quality, and suitability as a styling reference.
 * No auth required — uses onboardingToken for access control.
 */
export const validateOnboardingImage = action({
  args: {
    storageId: v.id('_storage'),
    onboardingToken: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    faceVisible: v.boolean(),
    faceClear: v.boolean(),
    isPortrait: v.boolean(),
    quality: v.union(v.literal('good'), v.literal('acceptable'), v.literal('poor')),
    issue: v.union(v.string(), v.null()),
  }),
  handler: async (
    ctx: ActionCtx,
    args: {
      storageId: Id<'_storage'>;
      onboardingToken: string;
    }
  ): Promise<{
    valid: boolean;
    faceVisible: boolean;
    faceClear: boolean;
    isPortrait: boolean;
    quality: 'good' | 'acceptable' | 'poor';
    issue: string | null;
  }> => {
    // Validate token format (same check as mutations)
    if (!args.onboardingToken.startsWith('onb_') || args.onboardingToken.length < 30) {
      throw new Error('Invalid onboarding token format');
    }

    // Fetch image URL from Convex storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error('Image not found in storage');
    }

    try {
      const result = await generateObject({
        model: openai('gpt-4o'),
        schema: photoValidationSchema,
        schemaName: 'PhotoValidation',
        schemaDescription: 'Photo quality validation result for onboarding',
        messages: [
          {
            role: 'system',
            content: `You are a photo quality validator for a fashion styling app. Users upload photos of themselves so an AI can generate virtual try-on images of them wearing different outfits while maintaining their identity.

Evaluation rules:
- "face_visible": exactly ONE person's face is clearly shown (not a group, not faceless, not a pet/object)
- "face_clear": the face is not blurry, not obscured by hands/objects/masks, not too small (< ~15% of image), not extreme angle where features aren't visible
- "is_portrait": the photo is a selfie, portrait, or upper-body shot (preferred for try-on). Full-body shots are also acceptable.
- "quality": "good" = clear, well-lit, sharp. "acceptable" = slight issues but face is recognizable. "poor" = very blurry, very dark, extremely low resolution, or heavily filtered/distorted
- "valid": true ONLY if face_visible AND face_clear AND quality is NOT "poor"
- "issue": if not valid, a brief friendly message (max 15 words) explaining why. Examples: "We can't see your face clearly — try a front-facing selfie", "The photo is too blurry — try better lighting", "We spotted multiple people — please upload a solo photo". If valid, set to null.

Be lenient — this is onboarding, not a passport photo. Sunglasses are OK if face shape is clear. Slight filters are OK. The goal is: can we use this to generate a recognizable try-on image?`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: imageUrl,
              },
              {
                type: 'text',
                text: 'Please validate this photo for use as a styling reference.',
              },
            ],
          },
        ],
        temperature: 0.1,
      });

      const parsed = result.object;
      return {
        valid: parsed.valid,
        faceVisible: parsed.face_visible,
        faceClear: parsed.face_clear,
        isPortrait: parsed.is_portrait,
        quality: parsed.quality,
        issue: parsed.issue,
      };
    } catch (error) {
      console.error('[PHOTO_VALIDATION] Failed to validate photo:', error);
      // If validation fails, be lenient — don't block the user
      return {
        valid: true,
        faceVisible: true,
        faceClear: true,
        isPortrait: true,
        quality: 'acceptable',
        issue: null,
      };
    }
  },
});
