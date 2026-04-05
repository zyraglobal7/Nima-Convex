---
name: Onboarding Flow Architecture
description: New 4-step auth-first onboarding redesign replacing the old 8-step flow
type: project
---

Auth happens first (GateSplash "Continue with Google" → /sign-in), then the 4-step wizard runs authenticated.

**Why:** Old flow had too many steps causing friction. New flow: auth → photos → chat → loading → success.

**How to apply:** When modifying onboarding, remember the wizard now assumes the user is always authenticated. `completeOnboardingV2` mutation is used (not the old `completeOnboarding`). Old users with localStorage data still use the old `useOnboardingCompletion` hook path.

## New Flow (4 steps in OnboardingWizard)
1. PhotoUploadStep — "Be the model in every look", requires ≥1 image, no back button
2. StyleChatStep — Conversational: outfit grid (≥2 picks) → occasions (checkboxes) → budget; calls `completeOnboardingV2` on budget select
3. LoadingStep — Mascot + spinning ring, starts `startOnboardingWorkflow`, polls `getOnboardingWorkflowStatus`
4. SuccessStep — "Your Looks are ready", 5 FREE CREDITS badge, 3 look circles, "Check it Out" → /discover

## Backend changes
- `convex/schema.ts`: added `occasions: v.optional(v.array(v.string()))` to users table
- `convex/users/mutations.ts`: added `completeOnboardingV2` (stylePreferences + occasions + budgetRange; defaults country=KE, currency=KES)
- `convex/users/queries.ts`: `hasProfileData` now uses `onboardingCompleted || stylePreferences.length > 0` (removed gender requirement)
- `convex/users/mutations.ts`: same fix in `markOnboardingComplete`

## Key files
- `components/onboarding/GateSplash.tsx` — "Continue with Google" button (href=/sign-in)
- `components/onboarding/OnboardingWizard.tsx` — 4-step flow, no progress bar on steps 2-3
- `components/onboarding/steps/StyleChatStep.tsx` — NEW: conversational chat UI
- `components/onboarding/steps/LoadingStep.tsx` — NEW: mascot loader + workflow polling
- `components/onboarding/steps/SuccessStep.tsx` — Redesigned success screen
- `app/onboarding/OnboardingPageClient.tsx` — Unauthenticated path now redirects to /sign-in
