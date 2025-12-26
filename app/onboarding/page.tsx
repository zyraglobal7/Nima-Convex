// Prevent static prerendering - this page requires auth context
export const dynamic = 'force-dynamic';

import OnboardingPageClient from './OnboardingPageClient';

export default function OnboardingPage() {
  return <OnboardingPageClient />;
}
