# Nima AI — Recommendation Engine, Wardrobe & Ask Nima Redesign

## Feature Specification + Claude Code Implementation Prompt

---

# PART 1: FEATURE SPECIFICATION

---

## Feature 1: Style Memory (AI-Generated Style Profile)

### What It Is
An AI-generated, structured style profile stored on each user's record. Built from onboarding inputs (gender, outfit selections, occasion preferences, budget) and progressively enriched from Nima chat conversations. This is the intelligence layer that powers personalised recommendations.

The AI (Claude Sonnet) takes the raw onboarding tags like `["Casual", "Minimalist", "Vintage"]` and infers a deep, structured profile — color palette preferences, silhouette preferences, occasion frequency, experimentation level, lifestyle signals, and a written style narrative.

### What It Is NOT
- Not a replacement for the existing `stylePreferences` array — that stays as a fallback
- Not manually editable by the user (it's AI-inferred)
- Not a static snapshot — it evolves as the user chats with Nima and uploads wardrobe items
- Not a separate page or screen — it's a backend data model that powers recommendations and chat context

### Data Structure
```typescript
styleProfile: {
  styleIdentity: {
    primary: string,          // "Smart Casual"
    secondary: string,        // "Modern Streetwear"  
    personalityType: string,  // "curator" | "explorer" | "classicist" | "chameleon" | "trendsetter"
  },
  occasions: Record<string, {
    frequency: 'high' | 'medium' | 'low',
    formality: string,        // "business-casual", "elevated-casual"
  }>,
  aestheticPreferences: {
    colorPalette: string[],     // ["earth-tones", "neutrals", "warm-blacks"]
    silhouette: string,         // "relaxed-tailored"
    patterns: string[],         // ["minimal", "solid-tones"]
    brandAffinity: string,      // "international-modern"
  },
  experimentationLevel: 'low' | 'moderate' | 'high',
  styleNarrative: string,       // 2-3 sentence Nima-voice description
  lifestyle: {
    career: string | null,
    careerFormality: string | null,
    hobbies: string[],
    inferredFrom: 'onboarding' | 'conversation',
  },
  generatedAt: number,
  version: 1,
}
```

### Generation Flow
1. User completes onboarding (gender + outfit selections + occasions + budget)
2. Convex action sends these raw inputs to Claude Sonnet with a structured-output prompt
3. Claude returns the full `styleProfile` JSON
4. Stored on the user document via `updateStyleProfile` mutation
5. Loading/teaser screen shows while this generates

---

## Feature 2: Wardrobe (User's Physical Closet)

### What It Is
Users upload photos of items they already own — either individual item photos or a wide shot of their closet. Nima processes these into clean, background-removed item images with AI-generated descriptions, categories, and tags. These wardrobe items become a second data source for recommendations: "Pair this new jacket with the navy chinos already in your closet."

### What It Is NOT
- Not an e-commerce inventory — these are items the user already owns, not items for sale
- Not a manual data entry form — the user uploads photos, AI does the tagging
- Not a social feature — wardrobes are private to each user
- Not a replacement for the items catalog — wardrobe items complement catalog recommendations
- Not a virtual try-on input — wardrobe items are for recommendation context, not try-on generation (yet)

### Two Upload Flows

**Flow A — Single Item Upload:**
User photographs one garment/shoe/accessory. Image goes to Gemini for:
1. Background removal → clean isolated item image
2. Description generation → "Navy blue slim-fit chinos"
3. Category/tag extraction → category: "bottoms", tags: ["navy", "slim-fit", "casual", "smart-casual"]

**Flow B — Closet Scan:**
User photographs their open closet. Image goes to Gemini for:
1. Item identification → list of visible garments with descriptions
2. For each identified item, generate a clean isolated image without background
3. Each item gets its own `wardrobeItem` record

### Data Structure
```typescript
// New table: wardrobeItems
{
  userId: Id<'users'>,
  imageStorageId: Id<'_storage'>,           // processed (background removed)
  originalImageStorageId: Id<'_storage'>,   // original upload
  description: string,                       // "Navy blue slim-fit chinos"
  category: string,                          // "tops" | "bottoms" | "shoes" | "outerwear" | "accessories"
  subcategory?: string,                      // "chinos", "sneakers", "sunglasses"
  tags: string[],                            // ["navy", "slim-fit", "cotton", "casual"]
  color: string,                             // primary color: "navy blue"
  season?: string[],                         // ["all-season"] or ["warm", "cool"]
  formality: string,                         // "casual" | "smart-casual" | "formal" | "athletic"
  source: 'single_upload' | 'closet_scan',
  createdAt: number,
}
```

### How Wardrobe Feeds Into Recommendations
The recommendation engine has two modes (visible as tabs in the UI):

- **"New" tab (default):** Recommendations from the Nima catalog — new items to buy, styled into outfits. This is the core recommendation engine.
- **"My Wardrobe" tab:** Recommendations that mix catalog items with items the user already owns. E.g., "You have great navy chinos — pair them with this new linen shirt for your next Friday meeting."

---

## Feature 3: Ask Nima Page Redesign

### What It Is
The current "Ask Nima" tab (bottom nav) is a full-screen chat. It gets redesigned into two layers:

**Layer 1 — Recommendations Feed (main view):**
- Header: "Hey, {userName}" + "Here are some recommendations based on your style profile"
- Toggle tabs: "New" | "My wardrobe"  
- Grid of outfit recommendation cards — each card shows a collage of item images, a contextual Nima comment ("This combo would kill it on the golf course"), and a "Try it On" CTA
- Floating glassmorphic "Ask Nima" pill button centered above the bottom tab bar

**Layer 2 — Nima Chat (bottom sheet):**
- Triggered by tapping the floating "Ask Nima" button
- `@gorhom/bottom-sheet` slides up to 50% → user can swipe to 92% (full) or drag down to close
- Contains the full Nima chat UI (existing components moved here)
- When closed, the floating button fades back in

### What It Is NOT
- Not removing the chat — the chat moves into the sheet, not deleted
- Not changing the bottom tab bar structure — the tab is still called "Ask Nima", same icon, same position
- Not generating try-on images upfront — recommendations show product images, user taps "Try it On" to generate (saves credits/compute)
- Not a web-only change — this is the native (React Native) app. Convex backend changes are shared.

### Floating "Ask Nima" Button Design
- Pill-shaped, centered horizontally, positioned just above the bottom tab bar (~24px above)
- Glassmorphic / liquid glass: semi-transparent background with blur (`rgba(255,255,255,0.15)` + `backdropFilter: blur(20)`), subtle border with slight tint
- Nima egg mascot avatar on the left, "Ask Nima" text on the right
- Shadow for depth
- Haptic feedback on press (medium)
- Fades out when sheet opens, fades back in when sheet closes

### Recommendation Card Layout
Each card is a distinct outfit recommendation:
- Item images in a collage grid (2-4 product photos arranged in a masonry-ish layout)
- Below images: Nima's contextual comment in her voice ("This would be a killing for your next concert")
- Below comment: "Try it On" text CTA
- Cards have rounded corners, subtle shadow, warm background tint

---

## Feature 4: Weekly Recommendation Engine (Backend)

### What It Is
A Convex cron job that runs every Monday at 6am EAT (3am UTC). For each user with a `styleProfile`, it:
1. Reads the user's style profile (occasions, aesthetics, lifestyle)
2. Queries the items catalog and matches 3-5 outfit combinations
3. Calls Claude Sonnet to generate a contextual Nima comment for each outfit
4. Stores them as `recommendation` records
5. Sends a push notification: "Your weekly looks are ready!"

### What It Is NOT
- Not real-time — recommendations are pre-generated weekly, not computed on page load
- Not a look generation (no try-on images) — it's item curation + comment generation
- Not replacing the chat's ability to create on-demand looks — the chat still works for "I need an outfit for X"

### Data Structure
```typescript
// New table: recommendations
{
  userId: Id<'users'>,
  itemIds: Id<'items'>[],         // 2-4 items forming an outfit
  occasion: string,                // "golf", "concert", "deal closing meeting"
  nimaComment: string,             // "This combo would kill it on the golf course"
  status: 'pending_comment' | 'active' | 'expired' | 'tried_on',
  weekOf: number,                  // timestamp of the Monday this was generated for
  createdAt: number,
  expiresAt: number,               // 1 week after creation
  // Optional: wardrobe integration
  wardrobeItemIds?: Id<'wardrobeItems'>[], // user's own items included in this look
  isWardrobeMix?: boolean,         // true if this rec includes wardrobe items
}
```

---

# PART 2: CLAUDE CODE IMPLEMENTATION PROMPT

---

```
I need to build the recommendation engine, wardrobe feature, and Ask Nima page redesign for Nima-Native (React Native + Expo) with shared Convex backend. Read CLAUDE.md first for full architecture context.

This is a large feature set. Work through it in order. After each major section, confirm it compiles before moving on.

---

## SECTION 1: Convex Schema Changes (Shared Backend — affects web + native)

### 1a. Add styleProfile to users table

In `convex/schema.ts`, add to the `users` table definition:

```typescript
// AI-generated rich style profile (replaces flat stylePreferences for recommendation logic)
styleProfile: v.optional(v.object({
  styleIdentity: v.object({
    primary: v.string(),
    secondary: v.string(),
    personalityType: v.string(),
  }),
  occasions: v.any(),  // Record<string, { frequency, formality }> — v.any() because Record types are complex in Convex validators
  aestheticPreferences: v.object({
    colorPalette: v.array(v.string()),
    silhouette: v.string(),
    patterns: v.array(v.string()),
    brandAffinity: v.string(),
  }),
  experimentationLevel: v.string(),
  styleNarrative: v.string(),
  lifestyle: v.object({
    career: v.optional(v.string()),
    careerFormality: v.optional(v.string()),
    hobbies: v.array(v.string()),
    inferredFrom: v.string(),
  }),
  generatedAt: v.number(),
  version: v.number(),
})),
```

Keep the existing `stylePreferences: v.optional(v.array(v.string()))` field — it's the fallback.

### 1b. Add wardrobeItems table

New table in `convex/schema.ts`:

```typescript
wardrobeItems: defineTable({
  userId: v.id('users'),
  imageStorageId: v.id('_storage'),
  originalImageStorageId: v.id('_storage'),
  description: v.string(),
  category: v.string(),           // "tops", "bottoms", "shoes", "outerwear", "accessories"
  subcategory: v.optional(v.string()),
  tags: v.array(v.string()),
  color: v.string(),
  season: v.optional(v.array(v.string())),
  formality: v.string(),          // "casual", "smart-casual", "formal", "athletic"
  source: v.union(v.literal('single_upload'), v.literal('closet_scan')),
  createdAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_user_and_category', ['userId', 'category'])
  .index('by_user_and_formality', ['userId', 'formality']),
```

### 1c. Add recommendations table

```typescript
recommendations: defineTable({
  userId: v.id('users'),
  itemIds: v.array(v.id('items')),
  occasion: v.string(),
  nimaComment: v.string(),
  status: v.union(
    v.literal('pending_comment'),
    v.literal('active'),
    v.literal('expired'),
    v.literal('tried_on'),
  ),
  weekOf: v.number(),
  createdAt: v.number(),
  expiresAt: v.number(),
  wardrobeItemIds: v.optional(v.array(v.id('wardrobeItems'))),
  isWardrobeMix: v.optional(v.boolean()),
})
  .index('by_user_and_status', ['userId', 'status'])
  .index('by_user_and_created', ['userId', 'createdAt'])
  .index('by_expires', ['expiresAt']),
```

Run `npx convex dev` to verify schema compiles.

---

## SECTION 2: Style Profile Generation (Convex Backend)

### 2a. New mutation: convex/users/mutations.ts

Add `updateStyleProfile` mutation:

```typescript
export const updateStyleProfile = mutation({
  args: {
    styleProfile: v.any(), // accepts the full styleProfile object
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('tokenIdentifier'), identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error('User not found');
    
    await ctx.db.patch(user._id, {
      styleProfile: args.styleProfile,
    });
  },
});
```

### 2b. New action: convex/users/actions.ts (or add to existing)

Add `generateStyleProfile` action that takes the user's raw onboarding inputs and calls Claude Sonnet to generate the structured profile:

```typescript
export const generateStyleProfile = action({
  args: {
    gender: v.string(),
    stylePreferences: v.array(v.string()),  // ["Casual", "Minimalist", "Vintage"]
    occasions: v.optional(v.array(v.string())),
    budget: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Use @ai-sdk/anthropic — check existing imports in convex/workflows/actions.ts
    // or convex/chat/actions.ts for the pattern already in the codebase
    
    const prompt = `You are Nima, an AI fashion stylist for the Kenyan market. Given a user's onboarding data, generate a comprehensive style profile.

User data:
- Gender: ${args.gender}
- Style preferences selected: ${args.stylePreferences.join(', ')}
${args.occasions ? `- Occasions: ${args.occasions.join(', ')}` : ''}
${args.budget ? `- Budget level: ${args.budget}` : ''}

INFER deeper preferences from the combination of signals:
- Color palette preferences from the styles they selected
- Silhouette preferences (relaxed, tailored, oversized, fitted)
- Brand/aesthetic affinity from budget + style combination
- Lifestyle context from occasions
- Experimentation level from the diversity of styles chosen

Return ONLY valid JSON matching this schema exactly (no markdown, no backticks, no explanation):

{
  "styleIdentity": {
    "primary": "string - dominant style e.g. Smart Casual",
    "secondary": "string - secondary influence e.g. Modern Streetwear",
    "personalityType": "one of: curator, explorer, classicist, chameleon, trendsetter"
  },
  "occasions": {
    "occasionName": { "frequency": "high|medium|low", "formality": "e.g. business-casual" }
  },
  "aestheticPreferences": {
    "colorPalette": ["array of palette descriptors e.g. earth-tones, neutrals"],
    "silhouette": "e.g. relaxed-tailored",
    "patterns": ["e.g. minimal, solid-tones"],
    "brandAffinity": "e.g. international-modern"
  },
  "experimentationLevel": "low|moderate|high",
  "styleNarrative": "2-3 sentences in Nima's warm, friendly voice describing this person's style DNA",
  "lifestyle": {
    "career": null,
    "careerFormality": null,
    "hobbies": [],
    "inferredFrom": "onboarding"
  },
  "generatedAt": ${Date.now()},
  "version": 1
}`;

    // Call Claude Sonnet using the same pattern as existing actions
    // Parse the JSON response
    // Call the updateStyleProfile mutation to save it
    
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
      temperature: 0.3,
    });
    
    const profileJson = JSON.parse(result.text.trim());
    
    await ctx.runMutation(api.users.mutations.updateStyleProfile, {
      styleProfile: profileJson,
    });
    
    return profileJson;
  },
});
```

Use the existing `@ai-sdk/anthropic` setup already in the codebase. Check `convex/workflows/actions.ts` or `convex/chat/actions.ts` for how `anthropic()` and `generateText` are imported/configured.

---

## SECTION 3: Wardrobe Backend (Convex)

### 3a. New file: convex/wardrobe/mutations.ts

```typescript
// addWardrobeItem — called after image processing is complete
export const addWardrobeItem = mutation({
  args: {
    imageStorageId: v.id('_storage'),
    originalImageStorageId: v.id('_storage'),
    description: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    tags: v.array(v.string()),
    color: v.string(),
    season: v.optional(v.array(v.string())),
    formality: v.string(),
    source: v.union(v.literal('single_upload'), v.literal('closet_scan')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (!user) throw new Error('User not found');
    
    return await ctx.db.insert('wardrobeItems', {
      userId: user._id,
      ...args,
      createdAt: Date.now(),
    });
  },
});

// removeWardrobeItem
export const removeWardrobeItem = mutation({
  args: { itemId: v.id('wardrobeItems') },
  handler: async (ctx, { itemId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error('Item not found');
    // Verify ownership
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (item.userId !== user?._id) throw new Error('Not authorized');
    
    // Delete the stored images too
    await ctx.storage.delete(item.imageStorageId);
    await ctx.storage.delete(item.originalImageStorageId);
    await ctx.db.delete(itemId);
  },
});
```

### 3b. New file: convex/wardrobe/queries.ts

```typescript
// getWardrobeItems — all items for the current user, optionally filtered by category
export const getWardrobeItems = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, { category }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (!user) return [];
    
    let items;
    if (category) {
      items = await ctx.db
        .query('wardrobeItems')
        .withIndex('by_user_and_category', q =>
          q.eq('userId', user._id).eq('category', category)
        )
        .collect();
    } else {
      items = await ctx.db
        .query('wardrobeItems')
        .withIndex('by_user', q => q.eq('userId', user._id))
        .collect();
    }
    
    // Hydrate with image URLs
    return Promise.all(items.map(async item => ({
      ...item,
      imageUrl: await ctx.storage.getUrl(item.imageStorageId),
    })));
  },
});

// getWardrobeItemCount
export const getWardrobeItemCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (!user) return 0;
    
    const items = await ctx.db
      .query('wardrobeItems')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect();
    return items.length;
  },
});
```

### 3c. New file: convex/wardrobe/actions.ts

This is the AI processing action — takes uploaded image, sends to Gemini for background removal + tagging:

```typescript
export const processWardrobeUpload = action({
  args: {
    storageId: v.id('_storage'),     // the raw uploaded image
    source: v.union(v.literal('single_upload'), v.literal('closet_scan')),
  },
  handler: async (ctx, { storageId, source }) => {
    // 1. Get the image from Convex storage
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new Error('Image not found');
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    if (source === 'single_upload') {
      // SINGLE ITEM FLOW
      // Step 1: Send to Gemini for description/tagging (text model)
      // Use gemini-2.0-flash for fast analysis (same pattern as photo validation)
      const analysisPrompt = `Analyze this clothing/fashion item image. Return ONLY valid JSON:
{
  "description": "concise description e.g. Navy blue slim-fit chinos",
  "category": "one of: tops, bottoms, shoes, outerwear, accessories, dresses",
  "subcategory": "specific type e.g. chinos, sneakers, sunglasses, blazer",
  "tags": ["array", "of", "descriptive", "tags", "for", "matching"],
  "color": "primary color",
  "season": ["all-season"] or specific seasons,
  "formality": "one of: casual, smart-casual, semi-formal, formal, athletic"
}`;
      
      // Call Gemini 2.0 Flash with the image for analysis
      // Parse JSON response
      
      // Step 2: Send to Gemini image generation for background removal
      // Use gemini-2.5-flash-image-preview (or current image model)
      // Prompt: "Generate a clean product photo of this exact item on a pure white background. Remove all background. Keep the item exactly as it is — same color, same texture, same details. No changes to the item itself."
      // Store the clean image to Convex storage
      
      // Step 3: Call addWardrobeItem mutation with all the data
      await ctx.runMutation(api.wardrobe.mutations.addWardrobeItem, {
        imageStorageId: cleanImageStorageId,  // processed image
        originalImageStorageId: storageId,     // original upload
        description: analysis.description,
        category: analysis.category,
        subcategory: analysis.subcategory,
        tags: analysis.tags,
        color: analysis.color,
        season: analysis.season,
        formality: analysis.formality,
        source: 'single_upload',
      });
      
    } else {
      // CLOSET SCAN FLOW
      // Step 1: Send to Gemini text model to identify individual items
      const scanPrompt = `This is a photo of someone's closet/wardrobe. Identify each visible clothing item. Return ONLY valid JSON:
{
  "items": [
    {
      "description": "Navy blue slim-fit chinos",
      "category": "bottoms",
      "subcategory": "chinos",
      "tags": ["navy", "slim-fit"],
      "color": "navy blue",
      "formality": "smart-casual",
      "position": "brief description of where in image for reference"
    }
  ]
}
Only include items you can clearly identify. Skip items that are too obscured or unclear.`;
      
      // Step 2: For each identified item, generate a clean isolated image
      // Use Gemini image generation with the original closet photo as reference:
      // "From this closet photo, generate a clean product photo of ONLY the [description] on a pure white background."
      
      // Step 3: Store each clean image and call addWardrobeItem for each
    }
  },
});
```

Follow the existing patterns in `convex/workflows/actions.ts` for how Gemini API calls are made (check for `generateContentWithFallback` or direct `@google/generative-ai` usage). Use the same API key env var (`GOOGLE_AI_STUDIO_KEY`).

---

## SECTION 4: Recommendation Engine Backend (Convex)

### 4a. New file: convex/recommendations/queries.ts

```typescript
export const getWeeklyRecommendations = query({
  args: {
    includeWardrobe: v.optional(v.boolean()), // false = "New" tab, true = "My wardrobe" tab
  },
  handler: async (ctx, { includeWardrobe }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    if (!user) return [];
    
    const recs = await ctx.db
      .query('recommendations')
      .withIndex('by_user_and_status', q =>
        q.eq('userId', user._id).eq('status', 'active')
      )
      .order('desc')
      .take(20);
    
    // Filter by tab
    const filtered = includeWardrobe
      ? recs.filter(r => r.isWardrobeMix === true)
      : recs.filter(r => !r.isWardrobeMix);
    
    // Hydrate with item data + image URLs
    return Promise.all(filtered.map(async rec => {
      const items = await Promise.all(
        rec.itemIds.map(async id => {
          const item = await ctx.db.get(id);
          if (!item) return null;
          return {
            ...item,
            imageUrl: item.primaryImageUrl || (item.imageStorageId ? await ctx.storage.getUrl(item.imageStorageId) : null),
          };
        })
      );
      
      // If wardrobe mix, also hydrate wardrobe items
      let wardrobeItems = [];
      if (rec.wardrobeItemIds?.length) {
        wardrobeItems = await Promise.all(
          rec.wardrobeItemIds.map(async id => {
            const item = await ctx.db.get(id);
            if (!item) return null;
            return {
              ...item,
              imageUrl: await ctx.storage.getUrl(item.imageStorageId),
            };
          })
        );
      }
      
      return {
        ...rec,
        items: items.filter(Boolean),
        wardrobeItems: wardrobeItems.filter(Boolean),
      };
    }));
  },
});
```

### 4b. New file: convex/recommendations/mutations.ts

```typescript
// Internal mutation: generate recommendations for a single user
export const generateWeeklyRecommendations = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;
    
    const profile = user.styleProfile;
    const preferences = profile
      ? Object.keys(profile.occasions || {})
      : (user.stylePreferences || ['casual']);
    
    // Get the user's gender for catalog filtering
    const gender = user.gender || 'unisex';
    
    // For each occasion (up to 5), query items catalog and pick a coherent outfit
    // Look at existing item matching/scoring logic in convex/chat/mutations.ts
    // Adapt that pattern here — match items by:
    //   - gender compatibility
    //   - formality level matching the occasion
    //   - color palette alignment with profile aestheticPreferences
    //   - category diversity (need tops + bottoms + shoes minimum)
    //   - tag overlap with profile
    
    const weekOf = getMonday(Date.now()); // helper: get timestamp of this week's Monday
    
    for (const occasion of preferences.slice(0, 5)) {
      // Query items, score them, pick top 3-4 forming a complete outfit
      // Ensure at least one top, one bottom, one shoe/accessory
      
      // Create recommendation record
      await ctx.db.insert('recommendations', {
        userId,
        itemIds: selectedItemIds,
        occasion,
        nimaComment: '', // filled by action in next step
        status: 'pending_comment' as const,
        weekOf,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    }
    
    // Schedule the comment generation action
    await ctx.scheduler.runAfter(0, internal.recommendations.actions.generateComments, {
      userId,
    });
  },
});

// Internal mutation: generate for ALL users
export const generateWeeklyRecommendationsForAll = internalMutation({
  handler: async (ctx) => {
    // Query all users who have either styleProfile or stylePreferences
    const users = await ctx.db.query('users').collect();
    const activeUsers = users.filter(u => u.styleProfile || u.stylePreferences?.length);
    
    for (const user of activeUsers) {
      await ctx.scheduler.runAfter(0, internal.recommendations.mutations.generateWeeklyRecommendations, {
        userId: user._id,
      });
    }
  },
});

// Internal mutation: clean up expired recommendations
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query('recommendations')
      .withIndex('by_expires')
      .filter(q => q.lt(q.field('expiresAt'), now))
      .collect();
    
    for (const rec of expired) {
      if (rec.status !== 'tried_on') {
        await ctx.db.patch(rec._id, { status: 'expired' });
      }
    }
  },
});

// Public mutation: mark as tried on (called from "Try it On" button)
export const markTriedOn = mutation({
  args: { recommendationId: v.id('recommendations') },
  handler: async (ctx, { recommendationId }) => {
    await ctx.db.patch(recommendationId, { status: 'tried_on' });
  },
});
```

### 4c. New file: convex/recommendations/actions.ts

```typescript
export const generateComments = internalAction({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    // Get all pending_comment recommendations for this user
    const recs = await ctx.runQuery(internal.recommendations.queries.getPendingComments, { userId });
    const user = await ctx.runQuery(api.users.queries.getUser); // get user profile
    
    for (const rec of recs) {
      // Build context from user's style profile
      const profileContext = user.styleProfile
        ? `Style: ${user.styleProfile.styleIdentity.primary}. Narrative: ${user.styleProfile.styleNarrative}. ${user.styleProfile.lifestyle.career ? `Career: ${user.styleProfile.lifestyle.career}.` : ''} Hobbies: ${user.styleProfile.lifestyle.hobbies?.join(', ') || 'unknown'}.`
        : `Style preferences: ${user.stylePreferences?.join(', ') || 'casual'}`;
      
      const itemDescriptions = rec.items.map(i => i.name || i.description).join(', ');
      
      const prompt = `You are Nima, a warm, witty Kenyan fashion stylist. Generate a SHORT contextual comment (1-2 sentences max) for this outfit recommendation.

User profile: ${profileContext}
Occasion: ${rec.occasion}
Items: ${itemDescriptions}

The comment should:
- Reference the specific occasion naturally
- Feel personal and warm, like a friend giving advice
- Use Nima's voice (confident, playful, encouraging)
- Be concise — this displays under outfit images in a feed

Examples of good comments:
- "This combo would kill it on the golf course"
- "This would be a killing for your next concert"
- "Wear this on your next Deal closing meeting"
- "Perfect for those Saturday brunch vibes"

Return ONLY the comment text, nothing else.`;
      
      const result = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        prompt,
        temperature: 0.7,
      });
      
      // Update the recommendation with the comment and mark active
      await ctx.runMutation(internal.recommendations.mutations.updateComment, {
        recommendationId: rec._id,
        nimaComment: result.text.trim(),
      });
    }
  },
});
```

### 4d. Cron jobs: convex/crons.ts

Create this file if it doesn't exist, or add to existing:

```typescript
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.weekly(
  'generate-weekly-recommendations',
  { hourUTC: 3, minuteUTC: 0, dayOfWeek: 'monday' },
  internal.recommendations.mutations.generateWeeklyRecommendationsForAll,
);

crons.daily(
  'cleanup-expired-recommendations',
  { hourUTC: 0, minuteUTC: 0 },
  internal.recommendations.mutations.cleanupExpired,
);

export default crons;
```

---

## SECTION 5: Ask Nima Page Redesign (React Native — Nima-Native repo)

### 5a. Rewrite app/(tabs)/ask.tsx

The current file is ~400 lines of chat state management. Replace it entirely with a recommendations feed + sheet container:

```typescript
// app/(tabs)/ask.tsx
export default function AskNimaScreen() {
  const sheetRef = useRef<BottomSheet>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const user = useQuery(api.users.queries.getCurrentUser);
  
  const handleOpenSheet = () => {
    sheetRef.current?.snapToIndex(0); // 50%
    setIsSheetOpen(true);
  };
  
  const handleSheetChange = (index: number) => {
    setIsSheetOpen(index >= 0);
  };
  
  return (
    <View className="flex-1 bg-background">
      {/* Recommendations Feed — the main content */}
      <RecommendationFeed userName={user?.name} />
      
      {/* Floating Ask Nima button — visible when sheet is closed */}
      {!isSheetOpen && (
        <FloatingAskButton onPress={handleOpenSheet} />
      )}
      
      {/* Bottom Sheet with Nima Chat */}
      <NimaChatSheet
        ref={sheetRef}
        onChange={handleSheetChange}
      />
    </View>
  );
}
```

### 5b. New file: components/ask/RecommendationFeed.tsx

The main recommendation feed view:

```
- Header: "Hey, {userName}" + subheading: "Here are some recommendations based on your style profile"
- Toggle tabs: "New" (default, active = filled primary background) | "My wardrobe" (inactive = outlined)
  - These tabs control the `includeWardrobe` param passed to getWeeklyRecommendations query
- ScrollView/FlatList of RecommendationCard components
- If no recommendations yet, show an empty state: "Nima is curating your first looks! Check back soon." with a subtle illustration or Nima mascot
- Pull-to-refresh to refetch
```

### 5c. New file: components/ask/RecommendationCard.tsx

Each card in the feed:

```
- Rounded container with subtle shadow and warm background tint
- Item images in a collage layout:
  - If 2 items: side by side
  - If 3 items: one large left, two stacked right
  - If 4 items: 2x2 grid
  - Images are product photos from the items catalog (use item.primaryImageUrl or item.imageUrl)
  - If the recommendation includes wardrobe items, show a small "From your closet" badge on those images
- Below images: Nima's comment text (the nimaComment field)
  - Warm, slightly muted text color
  - Max 2 lines
- Below comment: "Try it On" text button
  - On tap: navigate to the try-on flow with the recommendation's items
  - Call markTriedOn mutation to update status
  - Track PostHog: recommendation_try_on_tapped with recommendationId, occasion
```

### 5d. New file: components/ask/FloatingAskButton.tsx

Glassmorphic floating pill button:

```
- Position: absolute, centered horizontally, bottom ~90px (just above the 70px tab bar)
- Style: glassmorphic pill
  - Background: rgba(255, 255, 255, 0.15) (light mode) or rgba(30, 25, 22, 0.4) (dark mode)
  - Use BlurView from expo-blur for the frosted glass effect, OR
  - If BlurView has issues, fall back to semi-transparent background with shadow
  - Border: 1px solid rgba(255, 255, 255, 0.2)
  - Border radius: fully rounded (pill shape)
  - Shadow for depth
- Content: Nima egg mascot image on the left (use @/assets/nima-mascott.png), "Ask Nima" text on the right
- Padding: px-5 py-3
- On press: haptic feedback (expo-haptics, medium impact), then call onPress prop
- Animation: fade in/out using react-native-reanimated FadeIn/FadeOut when isSheetOpen changes
```

### 5e. New file: components/ask/NimaChatSheet.tsx

Bottom sheet containing the Nima chat (forwardRef):

```
- Use @gorhom/bottom-sheet (already in the project, check package.json)
- Snap points: ['50%', '92%']
- Start at index={-1} (fully hidden)
- enablePanDownToClose={true}
- Sheet background matches app background with warm tint
- Handle indicator styled with brand colors

- Sheet header: 
  - Left: Nima avatar + "Ask Nima" text
  - Right: History button (clock icon) that opens chat history drawer

- Sheet body (BottomSheetScrollView):
  - Move ALL existing chat logic from current ask.tsx into this component:
    - viewState, chatState management
    - Thread management (threadId, createThread, sendChatMessage)
    - Conversation history
    - Look generation state
    - handleSendMessage, handleFittingRoomClick, etc.
  - Reuse existing chat components inside the sheet:
    - ChatInput (at bottom of sheet)
    - MessageBubble
    - TypingIndicator
    - SearchingCard
    - FittingRoomCard
    - PromptSuggestions (when no active conversation)
    - ChatHistoryDrawer

- When Nima finds outfit items in chat, they render as ChatOutfitResult:
  - Horizontal scroll of item images
  - "Step into Fitting Room →" CTA
```

### 5f. Update tab navigator

The tab should still be called "Ask Nima" with the same icon and position. Only the content rendered inside changes. Check `app/(tabs)/_layout.tsx` for the tab configuration — no changes needed to the tab bar itself unless the icon needs updating.

### 5g. PostHog tracking

Add these events:
- `recommendation_feed_viewed` — when the feed loads with recommendations
- `recommendation_tab_switched` — when user switches between "New" and "My wardrobe", with property `tab: 'new' | 'wardrobe'`
- `recommendation_try_on_tapped` — when "Try it On" is tapped, with `recommendationId`, `occasion`, `itemCount`
- `ask_nima_button_tapped` — when the floating button is pressed
- `ask_nima_sheet_opened` — when sheet opens
- `ask_nima_sheet_closed` — when sheet closes
- `wardrobe_item_uploaded` — with `source: 'single_upload' | 'closet_scan'`, `category`
- `wardrobe_closet_scanned` — with `itemsIdentified: number`

Use the existing PostHog tracking pattern in `lib/analytics.ts`.

---

## SECTION 6: Wardrobe Upload UI (React Native)

### 6a. Wardrobe is accessed from the "My wardrobe" tab on the recommendations feed

When the user taps "My wardrobe" tab and has no wardrobe items, show an empty state with:
- Illustration or Nima mascot
- "Your wardrobe is empty"
- "Upload items from your closet so Nima can style them into new looks"
- Two CTAs:
  - "Upload an Item" (single item photo)
  - "Scan My Closet" (closet photo)

### 6b. New file: components/wardrobe/WardrobeUploadSheet.tsx

Bottom sheet (or modal) for uploading:

```
- Two options presented as large tappable cards:
  1. "Single Item" — camera icon — "Take a photo of one item"
  2. "Closet Scan" — panorama icon — "Take a wide shot of your closet"

- On selection, open camera (expo-image-picker with camera option)
- After photo taken:
  - Show a loading state: "Nima is analyzing your item..." (single) or "Nima is scanning your closet..." (scan)
  - Upload image to Convex storage (use generateUploadUrl pattern from existing photo upload code)
  - Call processWardrobeUpload action with the storageId
  - On success: show the processed item(s) with clean images and AI-generated descriptions
  - User can confirm or re-take

- For closet scan results:
  - Show a list of identified items with descriptions
  - User can deselect any incorrectly identified items
  - Confirm button saves all selected items
```

### 6c. Wardrobe grid view (when items exist)

When "My wardrobe" tab has items:
- Grid of wardrobe item thumbnails (3 columns)
- Each item shows clean image + brief description below
- Tap to see full detail (or long-press to delete)
- Floating "+" button to add more items
- Category filter chips at top: All, Tops, Bottoms, Shoes, Outerwear, Accessories

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Convex schema changes affect both web and native.** Use `v.optional()` for all new fields on existing tables. The web app must not break.

2. **Follow existing patterns.** Before writing new Convex functions, read the existing files in `convex/chat/`, `convex/workflows/`, `convex/users/` to match import patterns, auth patterns, and error handling.

3. **AI SDK imports.** Claude Sonnet is already integrated via `@ai-sdk/anthropic`. Gemini is accessed via `@google/generative-ai`. Check existing action files for the exact import patterns — do NOT install new packages if the SDK is already there.

4. **Image processing.** For Gemini image calls (wardrobe processing), follow the same pattern used in `convex/workflows/actions.ts` for try-on generation — same model constants, same `generateContentWithFallback` wrapper if it exists.

5. **The recommendation engine needs items in the catalog to work.** If the `items` table is empty or has few items, the engine won't produce good results. Check the items table structure and count before implementing the matching logic.

6. **Test incrementally.** After Section 1 (schema), run `npx convex dev` to verify. After Section 2-4 (backend), test mutations/actions individually. After Section 5-6 (UI), test on a device or simulator.

7. **Don't break existing features.** The current chat, try-on flow, lookbooks, and profile must all still work. The chat is *moving* into a sheet, not being deleted.
```

---

# PART 3: BUILD ORDER

| Phase | What | Effort | Unblocks |
|-------|------|--------|----------|
| 1 | Schema changes (Section 1) | Small | Everything |
| 2 | Style profile generation (Section 2) | Medium | Recommendation engine |
| 3 | Recommendation engine backend (Section 4) | Medium | Ask Nima redesign |
| 4 | Ask Nima page redesign (Section 5) | Large | The new UX |
| 5 | Wardrobe backend (Section 3) | Medium | Wardrobe UI |
| 6 | Wardrobe upload UI (Section 6) | Medium | "My wardrobe" tab |
| 7 | Wardrobe-aware recommendations | Small | Full wardrobe loop |

Phase 1-3 can potentially run in one Claude Code session. Phase 4 (the UI rewrite) should be its own session. Phase 5-6 (wardrobe) is a separate session.