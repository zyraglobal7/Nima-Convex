import posthog from 'posthog-js';

/**
 * Analytics event names - use these constants for type safety
 */
export const ANALYTICS_EVENTS = {
  // Gate/Landing events
  GET_STARTED_CLICKED: 'get_started_clicked',
  SIGNIN_LINK_CLICKED: 'signin_link_clicked',

  // Onboarding step events
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_BACK_CLICKED: 'onboarding_back_clicked',

  // Specific interaction events
  GENDER_SELECTED: 'gender_selected',
  STYLE_PREFERENCE_TOGGLED: 'style_preference_toggled',
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_REMOVED: 'photo_removed',

  // Account events
  SIGNUP_INITIATED: 'signup_initiated',
  SIGNIN_CLICKED: 'signin_clicked',
  COMPLETE_PROFILE_CLICKED: 'complete_profile_clicked',

  // Completion events
  ONBOARDING_COMPLETED: 'onboarding_completed',
  START_EXPLORING_CLICKED: 'start_exploring_clicked',

  // Page events
  DISCOVER_PAGE_VIEWED: 'discover_page_viewed',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Step names for onboarding funnel tracking
 */
export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  GENDER_AGE: 'gender_age',
  STYLE_VIBE: 'style_vibe',
  SIZE_FIT: 'size_fit',
  LOCATION_BUDGET: 'location_budget',
  PHOTO_UPLOAD: 'photo_upload',
  ACCOUNT: 'account',
  SUCCESS: 'success',
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

/**
 * Step number mapping for funnel analysis
 */
export const STEP_NUMBERS: Record<OnboardingStep, number> = {
  [ONBOARDING_STEPS.WELCOME]: 0,
  [ONBOARDING_STEPS.GENDER_AGE]: 1,
  [ONBOARDING_STEPS.STYLE_VIBE]: 2,
  [ONBOARDING_STEPS.SIZE_FIT]: 3,
  [ONBOARDING_STEPS.LOCATION_BUDGET]: 4,
  [ONBOARDING_STEPS.PHOTO_UPLOAD]: 5,
  [ONBOARDING_STEPS.ACCOUNT]: 6,
  [ONBOARDING_STEPS.SUCCESS]: 7,
};

const TOTAL_STEPS = 8;

/**
 * Check if PostHog is available and initialized
 */
function isPostHogReady(): boolean {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

/**
 * Debounce map for preventing duplicate events
 * Stores eventName -> lastTimestamp
 */
const lastTrackedEvent = new Map<string, number>();
const EVENT_DEBOUNCE_MS = 1000; // 1 second debounce

/**
 * Check if an event should be debounced (fired too recently)
 */
function shouldDebounceEvent(eventName: string): boolean {
  const now = Date.now();
  const lastTime = lastTrackedEvent.get(eventName) || 0;
  
  if (now - lastTime < EVENT_DEBOUNCE_MS) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] Debouncing duplicate event: ${eventName}`);
    }
    return true;
  }
  
  lastTrackedEvent.set(eventName, now);
  return false;
}

/**
 * Track a generic analytics event
 */
export function trackEvent(
  eventName: AnalyticsEvent | string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogReady()) return;

  posthog.capture(eventName, properties);
}

/**
 * Track when a user views an onboarding step
 */
export function trackStepViewed(step: OnboardingStep): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, {
    step,
    step_number: STEP_NUMBERS[step],
    total_steps: TOTAL_STEPS,
  });
}

/**
 * Track when a user completes an onboarding step
 */
export function trackStepCompleted(
  step: OnboardingStep,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
    step,
    step_number: STEP_NUMBERS[step],
    total_steps: TOTAL_STEPS,
    ...properties,
  });
}

/**
 * Track when a user clicks back during onboarding
 */
export function trackBackClicked(step: OnboardingStep): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.ONBOARDING_BACK_CLICKED, {
    step,
    step_number: STEP_NUMBERS[step],
  });
}

/**
 * Track Get Started button click on landing page
 */
export function trackGetStarted(): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.GET_STARTED_CLICKED, {
    source: 'gate_splash',
  });
}

/**
 * Track Sign In link click on landing page
 */
export function trackSignInLinkClicked(): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.SIGNIN_LINK_CLICKED, {
    source: 'gate_splash',
  });
}

/**
 * Track gender selection
 */
export function trackGenderSelected(gender: string): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.GENDER_SELECTED, {
    gender,
    step: ONBOARDING_STEPS.GENDER_AGE,
  });
}

/**
 * Track style preference toggle
 */
export function trackStylePreferenceToggled(style: string, selected: boolean): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.STYLE_PREFERENCE_TOGGLED, {
    style,
    selected,
    step: ONBOARDING_STEPS.STYLE_VIBE,
  });
}

/**
 * Track photo upload
 */
export function trackPhotoUploaded(photoCount: number): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.PHOTO_UPLOADED, {
    photo_count: photoCount,
    step: ONBOARDING_STEPS.PHOTO_UPLOAD,
  });
}

/**
 * Track photo removal
 */
export function trackPhotoRemoved(photoCount: number): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.PHOTO_REMOVED, {
    remaining_count: photoCount,
    step: ONBOARDING_STEPS.PHOTO_UPLOAD,
  });
}

/**
 * Track signup initiation (Google or Email)
 */
export function trackSignupInitiated(method: 'google' | 'email'): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.SIGNUP_INITIATED, {
    method,
    step: ONBOARDING_STEPS.ACCOUNT,
  });
}

/**
 * Track sign in click from account step
 */
export function trackSignInClicked(): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.SIGNIN_CLICKED, {
    step: ONBOARDING_STEPS.ACCOUNT,
  });
}

/**
 * Track complete profile click (for authenticated users)
 */
export function trackCompleteProfileClicked(): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.COMPLETE_PROFILE_CLICKED, {
    step: ONBOARDING_STEPS.ACCOUNT,
  });
}

/**
 * Track onboarding completion
 */
export function trackOnboardingCompleted(properties?: {
  gender?: string;
  age?: string;
  style_count?: number;
  country?: string;
  budget_range?: string;
  photo_count?: number;
}): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
    step: ONBOARDING_STEPS.SUCCESS,
    step_number: STEP_NUMBERS[ONBOARDING_STEPS.SUCCESS],
    total_steps: TOTAL_STEPS,
    ...properties,
  });
}

/**
 * Track Start Exploring button click
 */
export function trackStartExploringClicked(): void {
  if (!isPostHogReady()) return;

  posthog.capture(ANALYTICS_EVENTS.START_EXPLORING_CLICKED, {
    destination: '/discover',
  });
}

/**
 * Track discover page view with context
 * Includes debouncing to prevent duplicate fires
 */
export function trackDiscoverPageViewed(properties?: {
  has_workflow?: boolean;
  is_authenticated?: boolean;
}): void {
  if (!isPostHogReady()) return;
  
  // Debounce to prevent duplicate fires from re-renders
  if (shouldDebounceEvent(ANALYTICS_EVENTS.DISCOVER_PAGE_VIEWED)) return;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Tracking discover_page_viewed');
  }
  posthog.capture(ANALYTICS_EVENTS.DISCOVER_PAGE_VIEWED, properties);
}

/**
 * Identify a user (call after authentication)
 */
export function identifyUser(
  userId: string,
  properties?: {
    email?: string;
    name?: string;
    created_at?: string;
  }
): void {
  if (!isPostHogReady()) return;

  posthog.identify(userId, properties);
}

/**
 * Reset user identification (call on logout)
 */
export function resetUser(): void {
  if (!isPostHogReady()) return;

  posthog.reset();
}

