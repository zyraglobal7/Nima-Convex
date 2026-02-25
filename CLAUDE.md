# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Next.js frontend + Convex backend in parallel)
npm run dev

# Run only frontend
npm run dev:frontend

# Run only Convex backend
npm run dev:backend

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

There are no automated tests in this codebase.

When starting fresh, `npm run predev` runs first to ensure Convex is deployed and opens the dashboard.

## Architecture Overview

**Nima AI** is an AI-powered personal styling app (fashion discovery + virtual try-on). Stack: Next.js 16 (App Router) + Convex (backend) + WorkOS AuthKit (auth) + AI SDK (Google Gemini / OpenAI).

### Authentication Flow

WorkOS AuthKit handles auth entirely. Key pieces:
- `middleware.ts` — protects all routes except public ones (`/`, `/discover`, `/sign-in`, etc.)
- `components/ConvexClientProvider.tsx` — bridges WorkOS JWT tokens to Convex's `ConvexProviderWithAuth`. Uses a deferred mount pattern to avoid SSR issues.
- `components/UserDataSync.tsx` — syncs WorkOS user profile data into Convex on login (WorkOS JWTs don't include profile data, so this client-side sync is necessary)
- `convex/auth.config.ts` — configures Convex to validate WorkOS JWTs via JWKS
- `convex/http.ts` — handles `POST /webhooks/workos` for user lifecycle events (created/updated/deleted)

Users are identified in Convex by `workosUserId` (the JWT `subject` field). All Convex queries/mutations call `ctx.auth.getUserIdentity()` then look up users by `by_workos_user_id` index.

### Frontend Structure

```
app/
  (main)/          # Authenticated app shell with Navigation
    ask/           # AI stylist chat
    discover/      # Browse looks/items
    fitting/       # Virtual try-on fitting room
    lookbooks/     # Saved collections
    messages/      # Direct messages
    orders/        # Order history
    profile/       # User profile
    explore/       # Public look discovery
    activity/      # Social activity feed
    look/[id]/     # Individual look page
    product/[id]/  # Individual product page
    cart/          # Shopping cart
  onboarding/      # Onboarding flow (pre-auth photo upload + preferences)
  checkout/        # Checkout flow
  seller/
    (dashboard)/   # Seller dashboard (products, orders, finance, analytics, billing, settings)
    onboarding/    # Seller registration flow
  admin/           # Admin panel (analytics, items, sellers, billing, wrapped)
  api/chat/        # Next.js Route Handler for AI streaming (Vercel AI SDK)
  wrapped/[year]/  # Nima Wrapped yearly recap
components/        # Feature-organized React components mirroring app/ routes
lib/
  analytics.ts     # PostHog analytics
  contexts/        # React context providers
  hooks/           # Custom React hooks
  utils/           # Shared utilities
```

The `(main)` route group wraps all authenticated pages with `Navigation` (bottom nav on mobile, sidebar on desktop).

### Convex Backend Structure

```
convex/
  schema.ts        # Single source of truth for all DB tables
  types.ts         # Shared TS types + constants (credits, limits, tier config)
  http.ts          # HTTP endpoints: WorkOS webhook, Fingo Pay webhook, /health
  crons.ts         # Daily cron: Nima Wrapped generation check
  convex.config.ts # Registers @convex-dev/workflow component
  auth.config.ts   # WorkOS JWT validation config
  auth.ts          # WorkOS token exchange/refresh actions (for mobile)
  [feature]/       # Per-feature: queries.ts, mutations.ts, actions.ts
  workflows/       # @convex-dev/workflow: look generation, item try-on, onboarding
  lib/             # rateLimiter.ts, sanitize.ts
  webhooks/        # WorkOS + Fingo Pay webhook handlers
  search/
    visualSearch.ts  # Visual search: upload image → GPT-4o extracts attributes → find similar items
  emails/
    actions.ts     # Email sending via external provider
    templates.ts   # Email template definitions
  sellers/
    tierConfig.ts        # getTierConfig() helper — reads tier_config table, falls back to TIER_LIMITS
    subscriptions.ts     # Subscription lifecycle queries/mutations (get, initiate, activate, etc.)
    subscriptionActions.ts # Fingo Pay STK push initiation for subscriptions
  admin/
    sellers.ts     # overrideSellerTier, cancelSellerSubscription, updateTierConfig, seedTierConfigs
    queries.ts     # listSellersAdmin, getSubscriptionStats, getTierConfigs, getRecentSubscriptionEvents
    migrations.ts  # One-time migration scripts (run with: npx convex run admin/migrations:fnName --no-push)
```

Convex functions are organized by feature domain (users, items, looks, chat, cart, orders, sellers, etc.). Internal functions use `internal.*` API; public functions use `api.*`.

### Key Domain Concepts

- **Looks** — AI-curated outfit combinations (multiple items). Created via onboarding workflow or chat. Have `generationStatus` (pending/processing/completed/failed) and `status` (pending/saved/discarded).
- **Look Images** — AI-generated virtual try-on images showing the user wearing a look. Cached in Convex storage.
- **Item Try-Ons** — Single-item virtual try-on (distinct from full-look try-ons). Uses Google Gemini for image generation.
- **Credits System** — Users get 5 free credits/week. Purchased credits (via Fingo Pay M-Pesa in KES) persist. 1 credit = 1 item try-on; 3 credits = 3 new looks.
- **Onboarding Workflow** — Uses `@convex-dev/workflow` to orchestrate AI look selection + image generation. Images can be uploaded before auth via `onboardingToken`.
- **Sellers** — Multi-vendor marketplace. Sellers own items; orders route to sellers for fulfillment. Payouts tracked separately.
- **Seller Tiers** — basic (free, 20 products), starter (KES 5k/mo), growth (KES 15k/mo), premium (KES 30k/mo). Tier limits stored in `tier_config` DB table (admin-editable), with fallback to `TIER_LIMITS` in `types.ts`. Use `getTierConfig(ctx, tier)` from `convex/sellers/tierConfig.ts` to read limits.
- **Visual Search** — Users upload a photo; GPT-4o extracts fashion attributes; catalog is searched for similar items. See `convex/search/visualSearch.ts`.
- **Nima Wrapped** — Year-end personalized style recap. Generated by cron job, controlled via `wrapped_settings` table.

### AI Integration

- **Chat** (`app/api/chat/route.ts`) — Vercel AI SDK streaming route using Google Gemini / OpenAI. Nima is the AI stylist persona.
- **Look generation** — Convex actions in `convex/workflows/` call external AI APIs to generate outfit combinations and try-on images.
- **Dependencies**: `@ai-sdk/google`, `@ai-sdk/openai`, `ai` (Vercel AI SDK), `@google/genai`

### Payments

Fingo Pay (M-Pesa) for all KES transactions. Webhook at `POST /webhooks/fingo`. Merchant transaction IDs:
- `nima_cr_*` — credit purchases
- `nima_ord_*` — orders
- `nima_sub_*` — seller subscription payments

### Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_CONVEX_URL`, `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`, `WORKOS_COOKIE_PASSWORD`.

Convex dashboard env vars: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `FINGO_WEBHOOK_SECRET`, AI API keys.

### Convex Patterns

- Always use `.withIndex()` for queries — never `.filter()` on indexed fields
- `internal.*` for server-to-server calls; `api.*` for client-callable functions
- `convex/types.ts` exports document types (`Doc<'tableName'>`) and constants — import from here, not re-declare
- `getTierConfig(ctx, tier)` — always use this helper (not raw `TIER_LIMITS`) to read seller tier limits, as admins can override them in the `tier_config` table
- Actions that call Node.js-only APIs (e.g. `crypto`, `fetch` with streaming) must start with `'use node';` at the top of the file
- Migration scripts in `convex/admin/migrations.ts` are `internalMutation` functions run manually: `npx convex run admin/migrations:fnName --no-push`
- UI components use shadcn/ui (configured via `components.json`), Radix UI primitives, Tailwind CSS v4
- Path alias `@/` maps to project root
