# Seller Tier System — Feature Audit & Testing Walkthrough

**Last updated:** 2026-02-23
**Branch:** brian-dev

---

## 1. Source of Truth — Which config actually runs the system?

### The short answer
**`tier_config` DB table → `getTierConfig()` helper → every query/mutation** is the live source of truth.

### How it works

```
Admin billing page
       │  saves via updateTierConfig mutation
       ▼
tier_config table (Convex DB)
       │  read by getTierConfig() on every request
       ▼
Every seller query/mutation (getSellerAnalytics, getSellerDashboardStats,
getSellerProducts, getSellerRevenueChart, getProductEngagementBreakdown, etc.)
```

`getTierConfig(ctx, tier)` in `convex/sellers/tierConfig.ts`:
1. Queries `tier_config` table by `tier` index
2. If a DB row exists → uses **those values** (what admin set)
3. If no DB row exists → falls back to `TIER_LIMITS` in `convex/types.ts`

### What the admin tier config controls (server-enforced)

| Field | Effect |
|---|---|
| `maxProducts` | Backend enforces in `createItem` mutation — rejects if seller is at limit. Frontend disables Add button. |
| `revenueChartDays` | Controls how many days `getSellerRevenueChart` returns. 0 = empty array (no chart). |
| `orderHistoryDays` | Controls how far back `getSellerOrderItems` returns. null = all history. |
| `topProductsLimit` | How many products appear in `getSellerAnalytics` top products. 0 = none shown. null = all. |
| `showEngagementCounts` | If false, views/try-ons/lookbook saves are omitted from ALL seller queries. |
| `showCartCounts` | If false, cartAddCount/purchaseCount/conversion funnel omitted from ALL seller queries. |
| `priceKes` | Stored for display/billing reference only — does not affect feature access. |

### The billing page feature cards

The billing page at `/seller/billing` shows **marketing copy** — feature lists like "Priority placement in feeds & search". These are **not** enforced by the admin config. The admin config only controls the 6 fields above.

### Mismatch between admin config and billing cards

The admin tier config has **no fields** for:
- Placement boosts
- Spotlighting
- Lookbook inclusion
- Promotional credits
- Account manager assignment
- Campaign access

These features either do not exist yet, or would be enforced through other mechanisms (human ops, future implementation).

---

## 2. Feature-by-Feature Status

### ✅ Fully implemented and enforced in code

#### Product Limit (`maxProducts`)
- **Backend:** `convex/sellers/mutations.ts` — `createItem` checks `getTierConfig` before inserting
- **Frontend:** `/seller/products` — shows "X / Y products" badge, disables Add Product + AI Generate buttons, shows warning banner when at limit
- **Admin:** Editable in `/admin/billing` tier config
- ✅ Works end-to-end

#### Revenue Chart Days (`revenueChartDays`)
- **Backend:** `getSellerRevenueChart` filters `order_items` by cutoff date. 0 = empty array.
- **Frontend:** `/seller/analytics` — chart hidden for basic, shown for starter+ with correct window
- **Admin:** Editable in `/admin/billing`
- ✅ Works end-to-end

#### Order History Days (`orderHistoryDays`)
- **Backend:** `getSellerOrderItems` applies cutoff. null = all history.
- **Frontend:** `/seller/orders` order list is limited accordingly
- **Admin:** Editable in `/admin/billing`
- ✅ Works end-to-end

#### Engagement Counts (`showEngagementCounts`)
- **Controls:** viewCount, tryOnCount, lookbookSaveCount visibility in all seller queries
- **Backend:** `getSellerProducts`, `getSellerAnalytics`, `getProductEngagementBreakdown` all gate on this flag
- **Frontend:** Analytics page shows/hides views, try-ons, lookbook saves based on tier
- **Admin:** Toggle in `/admin/billing`
- ✅ Works end-to-end

#### Cart & Conversion Counts (`showCartCounts`)
- **Controls:** cartAddCount, purchaseCount, conversion funnel, try-on→purchase rate
- **Backend:** Same queries gate these fields on this flag
- **Frontend:** Analytics page shows/hides cart adds, purchases, funnel, CVR
- **Admin:** Toggle in `/admin/billing`
- ✅ Works end-to-end

#### Top Products Limit (`topProductsLimit`)
- **Backend:** `getSellerAnalytics` slices the sorted product list. 0 = none. null = all.
- **Frontend:** Analytics top products table
- **Admin:** Editable in `/admin/billing`
- ✅ Works end-to-end

#### Subscription Lifecycle
- **Payment:** Fingo Pay webhook → `activateSubscription` → sets `seller.tier`
- **Expiry:** Daily cron `expireSubscriptions` → downgrades expired sellers to basic
- **Admin cancel:** `/admin/sellers` cancel dialog → `cancelSellerSubscription`
- **Admin override:** `/admin/sellers` tier override dialog → `overrideSellerTier`
- ✅ Works end-to-end

#### View Count (`viewCount`)
- `incrementItemView` called from `/product/[id]` page on mount (connected this session)
- Used in: total views KPI, top products ranking, price sensitivity CVR calculation
- ✅ Works

#### Save Count (`saveCount`)
- `quickSave` in `convex/lookbooks/mutations.ts` increments `item.saveCount`
- ✅ Works

#### Cart Add Count (`cartAddCount`)
- `addToCart` in `convex/cart/mutations.ts` increments on first add (not on quantity update)
- ✅ Works

#### Purchase Count (`purchaseCount`)
- `convex/orders/mutations.ts:184` — incremented when order is placed
- ✅ Works

#### Try-on Count (`tryOnCount`)
- `convex/itemTryOns/mutations.ts` — incremented when try-on is started
- ✅ Works

#### Lookbook Save Count (`lookbookSaveCount`)
- `convex/lookbooks/mutations.ts` — incremented when item is saved to a lookbook
- ✅ Works

#### Product Drill-down Modal
- All analytics KPI cards clickable → opens modal sorted by that metric
- All products listed with image, rank, price, full counter breakdown
- Sort tabs: Views, Saves, Lookbook Saves, Try-ons, Cart Adds, Purchases (gated by tier)
- Conversion rate (CVR) shown per product for Growth+
- Top product for selected sort gets a border highlight
- Inactive products show a grayed-out overlay
- ✅ Works

#### Deep Buyer Analytics (Premium only — `getPremiumAnalytics`)
- **Day-of-week breakdown:** Revenue + orders by day, best day highlighted
- **Repeat buyer rate:** Unique userId analysis across orders, contextual advice text
- **Price sensitivity buckets:** 5 price bands, avg CVR and revenue per band, "Best CVR" badge
- **12-month seasonal heatmap:** Area chart + mini heatmap tiles with opacity scaled to revenue
- Returns null for non-premium (server-enforced)
- ✅ Works

---

### ❌ Tracked in DB but never incremented

#### `lookInclusionCount`
- Defined in `convex/schema.ts:206`
- Returned in `getSellerProducts` and `getProductEngagementBreakdown`
- **No mutation anywhere in the codebase writes to it**
- Will always be 0/undefined until implemented

---

### ❌ Marketing copy only — on billing cards but not implemented in code

These features appear on `/seller/billing` pricing cards. There is **zero corresponding backend logic** for any of them.

| Feature | Tier | Status |
|---|---|---|
| Light placement boost in select feeds | Starter | ❌ Not implemented |
| Category-based spotlighting ("Summer Tops") | Starter | ❌ Not implemented |
| Access to NIMA community lookbooks | Starter | ❌ Not implemented |
| Basic trend insights (top styles, seasons) | Starter | ❌ Not implemented |
| Priority placement in feeds & search | Growth | ❌ Not implemented |
| Branded lookbooks & creator collaborations | Growth | ❌ Not implemented |
| Inclusion in themed lookbooks (Workwear, Events) | Growth | ❌ Not implemented |
| 5 monthly promotional credits for campaigns | Growth | ❌ Not implemented |
| Top-tier placement platform-wide | Premium | ❌ Not implemented |
| Dedicated campaigns, seasonal pushes & exclusive drops | Premium | ❌ Not implemented |
| Trending looks, NIMA-styled collections | Premium | ❌ Not implemented |
| Multiple branded lookbooks | Premium | ❌ Not implemented |
| Dedicated account manager | Premium | ❌ Not implemented (human ops) |
| Co-marketing & future API integrations | Premium | ❌ Not implemented |

**Root cause:** Every "placement", "spotlighting", "lookbook inclusion", "promotional credits", "campaign", and "account manager" feature is marketing intent. The discover/feed queries do not currently rank or filter by seller tier at all.

---

## 3. Admin Tier Config — What It Controls vs What the Cards Say

The admin config editor at `/admin/billing` exposes exactly the right fields — the ones that are actually enforced. Do not add fields for unimplemented features, as that would create a false impression they work.

| Admin field | Billing card language it maps to |
|---|---|
| Max Products | "Up to X product slots" |
| Revenue Chart (days) | "30/90/365-day chart" |
| Order History (days) | (not explicitly mentioned on cards) |
| Top Products Shown | (part of analytics gating) |
| Engagement counts toggle | "Basic trend insights" (partially) |
| Cart & conversion counts toggle | "Advanced analytics & conversion insights" |

Everything else on the cards (placement, lookbooks, credits, account manager) has no corresponding admin field because it doesn't exist in code yet.

---

## 4. Testing Walkthrough

### Prerequisites
- Dev server running: `npm run dev`
- Seller account at `/seller`
- Admin access at `/admin`

---

### Test 1: Product Limit Enforcement

1. Go to `/admin/billing` → Expand **Tier Configuration**
2. For Basic tier, set **Max Products = 2**, click **Save**
3. Go to `/seller/products` as a basic seller
   - ✅ Badge shows "X / 2 products"
   - ✅ If at/over limit: "Add Product" button disabled, red warning banner with upgrade link
4. Try going directly to `/seller/products/create` and submitting
   - ✅ Backend rejects the mutation (Convex throws before insert)
5. Reset Max Products back to 20

---

### Test 2: Revenue Chart Window

1. `/admin/billing` → Tier Config → set your tier's **Revenue Chart = 0**, Save
2. `/seller/analytics`
   - ✅ Chart section shows "No revenue data yet"
3. Set Revenue Chart = 365, Save → reload
   - ✅ Chart appears covering up to 365 days of orders

---

### Test 3: Analytics Gating

1. `/admin/billing` → turn **OFF** "Engagement counts" for your tier → Save
2. `/seller/analytics`
   - ✅ Views and Try-ons KPI cards show locked state
   - ✅ Top products table hides those columns
3. Turn **ON** → Save → reload
   - ✅ Views and Try-ons appear with real numbers
4. Turn **ON** "Cart & conversion counts" → Save
   - ✅ Cart Adds, Purchases, Conversion Funnel unlock

---

### Test 4: View Count Tracking

1. Open any product page at `/product/[id]`
2. Go to `/seller/analytics` → click any KPI card → **Product Breakdown** modal → sort by **Views**
   - ✅ That product's viewCount incremented by 1
3. Open the same product page in a new tab → check again
   - ✅ viewCount incremented again

---

### Test 5: Full Purchase Funnel Tracking

1. Open a product page → click **Add to Cart**
   - ✅ `cartAddCount` increments (check modal → Cart Adds)
2. Complete checkout
   - ✅ `purchaseCount` increments (check modal → Purchases)
3. Do a virtual try-on on any product
   - ✅ `tryOnCount` increments (check modal → Try-ons)
4. Save an item to a lookbook
   - ✅ `lookbookSaveCount` increments (check modal → Lookbook Saves)

---

### Test 6: Admin Tier Override

1. `/admin/sellers` → click the tier badge on a seller → override dialog
2. Select a different tier → confirm
   - ✅ Seller's tier changes immediately
3. As that seller, go to `/seller/analytics`
   - ✅ Tier badge in header updated, features locked/unlocked accordingly

---

### Test 7: Premium Deep Analytics

1. Override a seller to **Premium** (Test 6)
2. As that seller, go to `/seller/analytics` → scroll to amber section
   - ✅ "Deep Buyer & Trend Analytics" section is visible (not locked)
   - ✅ **Repeat Buyer Rate:** percentage + contextual advice text
   - ✅ **Day of Week chart:** bars with best day highlighted in primary colour
   - ✅ **Price Sensitivity:** buckets for your price ranges, "Best CVR" badge on top bucket
   - ✅ **12-Month Heatmap:** area chart + mini month tiles
3. Override seller back to Growth
   - ✅ Section shows the amber locked card again

---

### Test 8: Product Drill-Down Modal

1. As any Starter+ seller, go to `/seller/analytics`
2. Click the **Total Views** KPI card
   - ✅ Modal opens, "Views" pill tab active, products sorted by views
3. Click **Saves** pill tab
   - ✅ List re-sorts by saves immediately
4. Click **Try-ons** → **Cart Adds** (Growth+) → **Purchases** (Growth+)
   - ✅ Each re-sorts correctly
5. Top product gets a subtle bordered highlight
6. Inactive products have a grayed-out ✕ overlay on their image
7. Conversion funnel steps on the analytics page are also clickable → opens modal

---

### Test 9: Subscription Events Feed

1. `/admin/billing` → scroll to **Recent Subscription Events**
   - ✅ List of subscription rows with shop name, date, amount, status badge, tier badge
   - ✅ Status colours: green = active, red = expired/failed, orange = cancelled

---

## 5. Known Gaps to Address Before Launch

| Gap | Impact | Suggested fix |
|---|---|---|
| `lookInclusionCount` never incremented | Counter always 0 | Increment in look generation workflow when item is added to a look |
| All placement/spotlighting features | Sellers paying for features that don't exist | Either implement (rank discover query by tier) or remove from billing cards |
| Promotional credits (5/month for Growth) | No credit system for sellers | Add to billing cards as "coming soon" or remove |
| Branded lookbooks | No concept in schema | Requires schema change + UI |
| Account manager | Human ops only | Add a contact/support link on Premium dashboard |
