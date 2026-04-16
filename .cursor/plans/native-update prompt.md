# Native App Update Prompt — Nima Expo Go

You are working on the **React Native / Expo Go** version of Nima AI (`~/WORK/nima-native`). This project shares the same **Convex backend** as a sibling Next.js web app. All Convex queries, mutations, and actions referenced below already exist — you are only building **native UI / client-side logic**.

## What already exists (do NOT rebuild these)

- **Quick Try-On** — `components/quick-try-on/QuickTryOnModal.tsx` is fully complete (camera, gallery, upload, polling, result, save to lookbook, credit gate, no-photo gate). Leave it alone.
- **Credits Modal** — `components/credits/CreditsModal.tsx` is fully built (M-Pesa STK push, package selection, polling, success/fail). Leave it alone.
- **Ask / Chat** — `app/(tabs)/ask.tsx` is fully built with non-streaming `sendChatMessage` action, thread management, `MATCH_ITEMS` parsing, history drawer, credits modal integration. Needs targeted additions only (see Section 4).
- **Discover tab** — exists, shows looks + apparel browser. Leave structure intact.

---

## What needs to be built

### 1. Recommendation Engine Screen ( replace Ask nima route)

Add a **new tab** to the tab navigator (`app/(tabs)/engine.tsx`) named "For You" with a home/sparkles icon. This is the personalised home feed.

**Tab bar position:** Insert it as the second tab (after Discover, before Ask Nima), shifting others right.

The screen has **two sub-tabs** controlled by local state: **"New"** and **"My Wardrobe"**.

---

#### 1a. "New" sub-tab — Weekly Recommendations Feed

```ts
useQuery(api.recommendations.queries.getWeeklyRecommendations, { includeWardrobe: false })
```

Returns an array of recommendation objects. Each has:
- `_id` — `Id<'recommendations'>`
- `occasion: string`
- `nimaComment: string`
- `status: string`
- `isWardrobeMix?: boolean`
- `items: Array<{ _id, name, brand?, imageUrl?, price, currency, category }>`
- `wardrobeItems?: Array<{ _id, name, imageUrl?, price, currency, category }>`

Render as a vertical `FlatList` of **RecommendationCards** (`components/engine/RecommendationCard.tsx` — create this):

Each card:
- A horizontal `ScrollView` of item images (each ~120×160, rounded-xl, `objectFit: cover`). Show up to 4; user scrolls for more.
- Below the images: occasion label pill (small, uppercase, muted), then Nima's comment in italic serif text.
- If `isWardrobeMix === true`: small "From your wardrobe ✓" chip in accent colour above the images.
- Two action buttons: **"Try This Look"** (primary, full-width) → navigate to `/(tabs)/discover` (for now, the fitting room flow from Discover handles looks), and a **discard icon** (trash/X, top-right corner of card).
  - "Try This Look": `api.lookInteractions.mutations.saveLook` or simply navigate to `/look/${rec._id}` if that route exists.
  - Discard: call `api.recommendations.mutations.dismissRecommendation` if it exists, otherwise just remove from local state.

Loading skeleton: 3 placeholder cards, each with a grey bar for images and two grey lines for text, pulsing with `Animated` or `react-native-reanimated`.

Empty state (no recommendations yet):
```
[Sparkles icon]
"Nima is curating your looks"
"Your personalised weekly picks will appear here every Monday."
```

---

#### 1b. "My Wardrobe" sub-tab

Queries:
```ts
useQuery(api.wardrobe.queries.getWardrobeItems, { category: activeCategory === 'All' ? undefined : activeCategory })
useQuery(api.wardrobe.queries.getWardrobeItemCount)
```

**Category filter chips** (horizontal `ScrollView`, `showsHorizontalScrollIndicator={false}`):
`All`, `tops`, `bottoms`, `shoes`, `outerwear`, `accessories`, `dresses`
Active chip: primary background, white text. Inactive: surface background, muted text.

**Item count** text: "12 items" or "3 items in tops" (when filtered).

**2-column grid** (`FlatList` with `numColumns={2}`). Each tile:
- Fills a square cell. Show `imageUrl` via `Image` component or a clothing emoji placeholder.
- Description overlay at the bottom (small text, gradient from transparent to black/60).
- **Long-press** → show a delete confirmation or an inline delete button overlay.
- **Tap** → open full-screen item viewer (see Section 1c).
- Remove: `useMutation(api.wardrobe.mutations.removeWardrobeItem)` with `{ itemId }`.

Below the grid, if recommendations exist for the wardrobe tab (`getWeeklyRecommendations` with `{ includeWardrobe: true }`), show them under a "Styled with your wardrobe" section header as `RecommendationCard`s.

**Floating + button** (`position: absolute`, bottom-right, 56px circle, primary background): opens the Wardrobe Upload Sheet (Section 2).

**Empty state:**
```
[🗂️ emoji]
"Your wardrobe is empty"
"Upload items from your closet so Nima can style them."
[Upload an Item]  [Scan My Closet]
```
Both buttons open the Wardrobe Upload Sheet with the appropriate `defaultSource` prop.

---

#### 1c. Full-Screen Wardrobe Item Viewer (Modal)

A `Modal` component (`presentationStyle="overFullScreen"`, black background) triggered by tapping a wardrobe tile.

- Full-screen `Image` of the item (`resizeMode="contain"`).
- Top bar: "X / N" count (top-left), close button (top-right, white circular).
- Bottom info bar (gradient from transparent to black/80): item `description`, `category · color · formality`.
- **Remove button**: `flex-row`, red-ish, `Trash2` icon + "Remove from wardrobe" text.
- **Swipe left/right** to navigate between items (use `PanGestureHandler` from `react-native-gesture-handler` or a simple `onTouchStart`/`onTouchEnd` dx threshold). Show previous/next chevron buttons as overlay.
- Dot indicator row at the bottom (active dot is wider/white, inactive are white/40).

---

### 2. Wardrobe Upload Sheet (Bottom Sheet Modal)

Create `components/wardrobe/WardrobeUploadSheet.tsx`.

Props:
```ts
interface WardrobeUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  defaultSource?: 'single_upload' | 'closet_scan';
}
```

Use a `Modal` with `animationType="slide"` + `transparent` + backdrop press to dismiss, rendered as a bottom sheet (white/surface rounded-t-3xl container, max height 70% of screen).

**Convex calls:**
```ts
const generateUploadUrl = useMutation(api.wardrobe.mutations.generateUploadUrl);
const processWardrobeUpload = useAction(api.wardrobe.actions.processWardrobeUpload);
```

**Upload source options (idle state):**

Three large tappable rows (each: icon on left in a rounded-xl tinted box, title + subtitle on right):

1. **Upload an Item** (Camera icon, primary tint) — `ImagePicker.launchImageLibraryAsync`
2. **Scan My Closet** (Layers icon, secondary tint) — `ImagePicker.launchCameraAsync` (wide shot)
3. **Take a Picture** (ScanLine / ZoomIn icon, primary tint) — `ImagePicker.launchCameraAsync` (single item)

If `defaultSource` is set, skip idle and trigger the corresponding picker immediately on mount.

**Upload flow (all three options share this):**
```
idle → uploading → processing → done | error
```

1. `uploading`: Call `generateUploadUrl()`, then `fetch(uploadUrl, { method: 'POST', body: blob })` to get `storageId`.
2. `processing`: Call `processWardrobeUpload({ storageId, source })`. This is an action that calls Google Gemini — it may take 10–30 seconds. Keep the spinner up.
3. `done`: Show checkmark + "X items added to your wardrobe" + "Add More" (reset to idle) / "Done" (close).
4. `error`: Show alert icon + error message + "Try Again".

Processing copy:
- `single_upload`: "Nima is identifying your item…" / "Removing background and tagging style details"
- `closet_scan`: "Nima is scanning your closet…" / "Isolating each item and removing backgrounds"

Use `expo-image-picker` (already in the project) for both library and camera access.

---

### 3. Floating "Ask Nima" Button

Add a persistent floating pill button on the **Discover** and **For You (engine)** screens. It should sit above the tab bar.

Implementation: In `app/(tabs)/_layout.tsx`, after the `<Tabs>` component and before the existing `<QuickTryOnModal>`, add:

```tsx
<FloatingAskNimaButton
  visible={!isAskTabActive}  // hide when ask tab is active
  onPress={() => router.push('/(tabs)/ask')}
/>
```

Create `components/engine/FloatingAskNimaButton.tsx`:

```
Props: { visible: boolean; onPress: () => void }
```

Visual:
- Pill (`borderRadius: 50`, `paddingHorizontal: 20`, `paddingVertical: 10`)
- Background: semi-transparent background color with `backdropFilter`-like blur (use `expo-blur`'s `BlurView` as background if available, otherwise just `rgba` surface colour at 0.9 opacity)
- Border: `rgba(255,255,255,0.2)` thin border
- Left: 28px circle with `Sparkles` icon (gradient from primary to secondary — use `expo-linear-gradient`)
- Right: "Ask Nima" medium-weight text in `text-text-primary`
- Shadow: `shadowColor: '#000'`, `shadowOffset: { width: 0, height: 2 }`, `shadowOpacity: 0.12`, `shadowRadius: 8`, `elevation: 6`
- Position: `position: 'absolute'`, `bottom: 82` (sits above the 70px tab bar + 12px gap), `alignSelf: 'center'`, `zIndex: 40`
- Animate in/out with `react-native-reanimated` `FadeIn`/`FadeOut` (duration 200ms)

To know if the ask tab is active: pass `activeTab` state from `_layout.tsx` which tracks which tab is focused via the `Tabs` `screenListeners` prop.

---

### 4. Chat Sharpening (targeted additions to `app/(tabs)/ask.tsx`)

Two specific additions to the existing working chat — **do not restructure** the file:

#### 4a. Wardrobe Context

Before calling `sendChatMessage`, also fetch wardrobe items and include them in the call body.

Add near the top of `AskScreen`:
```ts
const wardrobeItemsRaw = useQuery(api.wardrobe.queries.getWardrobeItems, {});
const wardrobeItems = (wardrobeItemsRaw ?? []).map(item => ({
  description: item.description,
  category: item.category,
  color: item.color,
  formality: item.formality,
}));
```

Then in `handleSendMessage`, pass `wardrobeItems` alongside `userData` to `sendChatMessage`:
```ts
const aiResult = await sendChatMessage({
  messages: newHistory,
  userData,
  wardrobeItems,  // add this
});
```

The `sendChatMessage` action already accepts this optional field in the web version — if the Convex action validator doesn't include it yet, add `wardrobeItems: v.optional(v.array(v.object({ description: v.string(), category: v.string(), color: v.string(), formality: v.string() })))` to its `args` in `convex/chat/actions.ts`.

#### 4b. Pass `source` to `createLooksFromChat`

In `handleMatchItems`, the `createLooksFromChat` call currently doesn't pass a `source`. Update it to parse the source from the `[MATCH_ITEMS:occasion|source]` tag:

```ts
// In handleSendMessage, update the regex capture:
const matchItemsMatch = aiContent.match(/\[MATCH_ITEMS:([^\]]+)\]/);
if (matchItemsMatch) {
  const parts = matchItemsMatch[1].split('|');
  const occasion = parts[0].trim();
  const source = (['new', 'wardrobe', 'both'].includes(parts[1]?.trim() ?? ''))
    ? parts[1].trim() as 'new' | 'wardrobe' | 'both'
    : 'new';
  await handleMatchItems(occasion, source, currentThreadId);
}
```

Update `handleMatchItems` signature to accept `source: 'new' | 'wardrobe' | 'both' = 'new'` and pass it:
```ts
const result = await createLooksFromChat({ occasion, context: occasion, source });
```

#### 4c. Visual Search (image upload in chat input)

Add a camera/image icon to the existing `ChatInput` component (`components/ask/ChatInput.tsx`). When tapped:

1. `ImagePicker.launchImageLibraryAsync` (or camera)
2. Upload to Convex storage:
   ```ts
   const generateUploadUrl = useMutation(api.userImages.mutations.generateUploadUrl);
   // POST blob to uploadUrl → get storageId
   ```
3. Call visual search:
   ```ts
   const findSimilarItems = useAction(api.search.visualSearch.findSimilarItems);
   const result = await findSimilarItems({ imageStorageId: storageId });
   ```
4. If `result.success && result.items.length > 0`:
   - Build a natural-language message: `"I'm looking for items similar to this: ${result.extractedAttributes?.description}. Found matches like ${result.items.slice(0,3).map(i=>i.name).join(', ')}. Can you help me style these?"`
   - Send it through the normal `handleSendMessage` flow.
5. If no matches: show a brief toast or inline message "No similar items found".

Add a loading state (`isUploadingImage`) that disables the icon and shows a small spinner in its place while the upload + search is running.

---

## File Summary

Files to **create**:
- `app/(tabs)/engine.tsx` — For You screen (recommendations + wardrobe tabs)
- `components/engine/RecommendationCard.tsx` — single recommendation card
- `components/engine/FloatingAskNimaButton.tsx` — floating pill button
- `components/wardrobe/WardrobeUploadSheet.tsx` — wardrobe upload modal

Files to **modify**:
- `app/(tabs)/_layout.tsx` — add engine tab + FloatingAskNimaButton
- `app/(tabs)/ask.tsx` — wardrobe context, source parsing, visual search
- `components/ask/ChatInput.tsx` — add image upload icon
- `convex/chat/actions.ts` — add `wardrobeItems` to `sendChatMessage` args if not already present

---

## Design System Reminders

- Colors (from `tailwind.config.js`): primary `#5C2A33` (light) / `#C9A07A` (dark), background `#FAF8F5` / `#1A1614`, surface `#F5F0E8` / `#252220`, border `#E0D8CC` / `#3D3835`, text-primary `#2D2926` / `#F5F0E8`, text-secondary `#6B635B` / `#C4B8A8`
- Use `useTheme()` from `@/lib/contexts/ThemeContext` for `isDark` checks when NativeWind class-based dark mode isn't sufficient
- Fonts: `DMSans` for body, `CormorantGaramond_600SemiBold` for serif headings
- Icons: `lucide-react-native`
- All new Convex functions must follow the mandatory explicit typing rules in `CLAUDE.md`
