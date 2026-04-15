'use node';

/**
 * Wardrobe AI Actions
 * Processes uploaded wardrobe images: background removal + AI tagging via Google Gemini.
 */

import { action, ActionCtx } from '../_generated/server';
import { api } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { GoogleGenAI } from '@google/genai';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const IMAGE_MODEL_PRIMARY = 'gemini-3-pro-image-preview';
const IMAGE_MODEL_FALLBACK = 'gemini-3.1-flash-image-preview';

async function generateImageWithFallback(
  params: Omit<Parameters<typeof genAI.models.generateContent>[0], 'model'>
): ReturnType<typeof genAI.models.generateContent> {
  try {
    return await genAI.models.generateContent({ ...params, model: IMAGE_MODEL_PRIMARY });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
    if (!is503) throw err;
    console.warn(`[WARDROBE] Primary image model unavailable, falling back to ${IMAGE_MODEL_FALLBACK}`);
    return genAI.models.generateContent({ ...params, model: IMAGE_MODEL_FALLBACK });
  }
}

interface ItemAnalysis {
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  color: string;
  season?: string[];
  formality: string;
}

interface ClosetScanItem extends ItemAnalysis {
  position: string;
}

/**
 * Process a wardrobe image upload.
 * - single_upload: one item → analyze + clean background → store
 * - closet_scan: closet photo → identify items → for each, generate clean image + store
 */
export const processWardrobeUpload = action({
  args: {
    storageId: v.id('_storage'),
    source: v.union(v.literal('single_upload'), v.literal('closet_scan')),
  },
  returns: v.object({
    success: v.boolean(),
    itemCount: v.number(),
    itemIds: v.array(v.id('wardrobeItems')),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { storageId: Id<'_storage'>; source: 'single_upload' | 'closet_scan' }
  ): Promise<{ success: boolean; itemCount: number; itemIds: Id<'wardrobeItems'>[] }> => {
    // Get image from Convex storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error('Image not found in storage');

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const itemIds: Id<'wardrobeItems'>[] = [];

    if (args.source === 'single_upload') {
      // ── SINGLE UPLOAD FLOW (supports multiple items in one photo) ─────────
      // Step 1: Identify ALL clothing items visible in the photo
      const analysisResult = await generateText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: `data:${mimeType};base64,${base64Image}`,
              },
              {
                type: 'text',
                text: `Identify every distinct clothing or fashion item visible in this photo. There may be one item or many (e.g. multiple shirts, belts, shoes). Return ONLY valid JSON with no markdown:
{
  "items": [
    {
      "description": "concise description e.g. Navy blue slim-fit chinos",
      "category": "one of: tops, bottoms, shoes, outerwear, accessories, dresses",
      "subcategory": "specific type e.g. chinos, sneakers, sunglasses, blazer",
      "tags": ["array", "of", "descriptive", "tags"],
      "color": "primary color",
      "season": ["all-season"],
      "formality": "one of: casual, smart-casual, semi-formal, formal, athletic",
      "position": "brief description of where in the image this item is"
    }
  ]
}
Include every clearly visible item. Return a maximum of 12 items.`,
              },
            ],
          },
        ],
      });

      const cleanJson = analysisResult.text.replace(/```json\n?|\n?```/g, '').trim();
      const { items: uploadItems } = JSON.parse(cleanJson) as { items: ClosetScanItem[] };

      // Step 2: For each identified item generate a clean isolated image and store it
      for (const uploadItem of uploadItems.slice(0, 12)) {
        try {
          const cleanImageResponse = await generateImageWithFallback({
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType, data: base64Image } },
                  {
                    text: uploadItems.length === 1
                      ? 'Generate a clean product photo of this exact item on a pure white background. Remove all background. Keep the item exactly as it is — same color, same texture, same details. No changes to the item itself.'
                      : `From this photo, generate a clean product photo of ONLY the "${uploadItem.description}" (located ${uploadItem.position}) on a pure white background. Show just that single item, isolated.`,
                  },
                ],
              },
            ],
            config: { responseModalities: ['IMAGE'] },
          });

          const imageParts = cleanImageResponse.candidates?.[0]?.content?.parts ?? [];
          const imageDataPart = imageParts.find(
            (p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData?.data
          );

          let cleanImageStorageId: Id<'_storage'>;
          if (imageDataPart?.inlineData?.data) {
            const cleanImageBuffer = Buffer.from(imageDataPart.inlineData.data, 'base64');
            const cleanBlob = new Blob([cleanImageBuffer], { type: imageDataPart.inlineData.mimeType || 'image/png' });
            const uploadUrl = await ctx.storage.generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': cleanBlob.type },
              body: cleanBlob,
            });
            if (!uploadResponse.ok) throw new Error('Failed to upload clean image');
            const { storageId } = await uploadResponse.json() as { storageId: Id<'_storage'> };
            cleanImageStorageId = storageId;
          } else {
            console.warn('[WARDROBE] Background removal failed for item, using original image');
            cleanImageStorageId = args.storageId;
          }

          const itemId = await ctx.runMutation(api.wardrobe.mutations.addWardrobeItem, {
            imageStorageId: cleanImageStorageId,
            originalImageStorageId: args.storageId,
            description: uploadItem.description,
            category: uploadItem.category,
            subcategory: uploadItem.subcategory,
            tags: uploadItem.tags,
            color: uploadItem.color,
            season: uploadItem.season,
            formality: uploadItem.formality,
            source: 'single_upload',
          });

          itemIds.push(itemId);
        } catch (err) {
          console.warn(`[WARDROBE] Failed to process item "${uploadItem.description}":`, err);
        }
      }

    } else {
      // ── CLOSET SCAN FLOW ──────────────────────────────────
      // Step 1: Identify all visible items in the closet photo
      const scanPrompt = `This is a photo of someone's closet/wardrobe. Identify each clearly visible clothing item. Return ONLY valid JSON:
{
  "items": [
    {
      "description": "Navy blue slim-fit chinos",
      "category": "bottoms",
      "subcategory": "chinos",
      "tags": ["navy", "slim-fit"],
      "color": "navy blue",
      "formality": "smart-casual",
      "season": ["all-season"],
      "position": "brief description of where in image"
    }
  ]
}
Only include items you can clearly identify. Skip obscured or unclear items. Return a maximum of 10 items.`;

      const scanResult = await generateText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: `data:${mimeType};base64,${base64Image}`,
              },
              { type: 'text', text: scanPrompt },
            ],
          },
        ],
      });

      const scanCleanJson = scanResult.text.replace(/```json\n?|\n?```/g, '').trim();
      const { items: scanItems } = JSON.parse(scanCleanJson) as { items: ClosetScanItem[] };

      // Step 2: For each identified item, generate a clean isolated image
      for (const scanItem of scanItems.slice(0, 10)) {
        try {
          const itemImageResponse = await generateImageWithFallback({
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType, data: base64Image } },
                  {
                    text: `From this closet photo, generate a clean product photo of ONLY the "${scanItem.description}" (located ${scanItem.position}) on a pure white background. Show just that single item, isolated.`,
                  },
                ],
              },
            ],
            config: { responseModalities: ['IMAGE'] },
          });

          const itemParts = itemImageResponse.candidates?.[0]?.content?.parts ?? [];
          const itemDataPart = itemParts.find(
            (p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData?.data
          );

          let itemImageStorageId: Id<'_storage'>;
          if (itemDataPart?.inlineData?.data) {
            const buf = Buffer.from(itemDataPart.inlineData.data, 'base64');
            const blob = new Blob([buf], { type: itemDataPart.inlineData.mimeType || 'image/png' });
            const uploadUrl = await ctx.storage.generateUploadUrl();
            const res = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': blob.type },
              body: blob,
            });
            if (!res.ok) throw new Error('Failed to upload item image');
            const { storageId } = await res.json() as { storageId: Id<'_storage'> };
            itemImageStorageId = storageId;
          } else {
            // Use original closet photo as fallback
            itemImageStorageId = args.storageId;
          }

          const itemId = await ctx.runMutation(api.wardrobe.mutations.addWardrobeItem, {
            imageStorageId: itemImageStorageId,
            originalImageStorageId: args.storageId,
            description: scanItem.description,
            category: scanItem.category,
            subcategory: scanItem.subcategory,
            tags: scanItem.tags,
            color: scanItem.color,
            season: scanItem.season,
            formality: scanItem.formality,
            source: 'closet_scan',
          });

          itemIds.push(itemId);
        } catch (err) {
          console.warn(`[WARDROBE] Failed to process closet item "${scanItem.description}":`, err);
        }
      }
    }

    return { success: true, itemCount: itemIds.length, itemIds };
  },
});
