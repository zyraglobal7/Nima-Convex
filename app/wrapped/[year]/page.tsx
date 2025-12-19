'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { WrappedContainer } from '@/components/wrapped/WrappedContainer';
import {
  IntroSlide,
  StyleEraSlide,
  TopItemsSlide,
  ColorPaletteSlide,
  MoodSwingsSlide,
  TopBrandsSlide,
  PersonalitySlide,
  MostSavedLookSlide,
  ClosingSlide,
} from '@/components/wrapped/slides';
import { Loader2, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCallback } from 'react';

export default function WrappedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const year = parseInt(params.year as string, 10);
  const shareToken = searchParams.get('token');

  // Mutation to mark wrapped as viewed
  const markAsViewed = useMutation(api.wrapped.mutations.markWrappedAsViewed);

  // Query based on whether we have a share token or not
  const wrappedData = useQuery(
    shareToken
      ? api.wrapped.queries.getWrappedByShareToken
      : api.wrapped.queries.getUserWrapped,
    shareToken ? { shareToken } : { year }
  );

  // Handle closing the wrapped experience
  // Mark as viewed so it won't auto-show again
  // Note: This hook must be called before any early returns
  const handleClose = useCallback(async () => {
    // Only mark as viewed if this is the user's own wrapped (not shared view)
    if (!shareToken) {
      try {
        await markAsViewed({ year });
      } catch (error) {
        console.error('[Wrapped] Failed to mark as viewed:', error);
      }
    }
    router.push('/discover');
  }, [shareToken, markAsViewed, year, router]);

  // Loading state
  if (wrappedData === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your Nima Wrapped...</p>
      </div>
    );
  }

  // No wrapped data found
  if (wrappedData === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          {shareToken ? (
            <Lock className="h-10 w-10 text-muted-foreground" />
          ) : (
            <Sparkles className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        <h1 className="text-2xl font-serif font-bold text-center mb-2">
          {shareToken ? 'Wrapped Not Found' : 'Your Wrapped Isn\'t Ready Yet'}
        </h1>

        <p className="text-muted-foreground text-center max-w-md mb-8">
          {shareToken
            ? 'This wrapped link may have expired or is invalid.'
            : `Your Nima Wrapped for ${year} hasn't been generated yet. Check back later!`}
        </p>

        <div className="flex gap-4">
          <Link href="/discover">
            <Button>Go to Discover</Button>
          </Link>
          {!shareToken && (
            <Link href="/profile">
              <Button variant="outline">View Profile</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { wrapped, settings, user } = wrappedData;
  const theme = settings?.theme || 'aurora';

  return (
    <WrappedContainer theme={theme} onClose={handleClose}>
      {/* Slide 1: Intro */}
      <IntroSlide year={wrapped.year} firstName={user.firstName} />

      {/* Slide 2: Style Era */}
      <StyleEraSlide
        styleEra={wrapped.styleEra}
        styleEraDescription={wrapped.styleEraDescription}
        dominantTags={wrapped.dominantTags}
      />

      {/* Slide 3: Top Items */}
      <TopItemsSlide topItems={wrapped.topItems} />

      {/* Slide 4: Color Palette */}
      <ColorPaletteSlide colorPalette={wrapped.colorPalette} />

      {/* Slide 5: Mood Swings */}
      <MoodSwingsSlide moodSwings={wrapped.moodSwings} />

      {/* Slide 6: Top Brands */}
      <TopBrandsSlide topBrands={wrapped.topBrands} />

      {/* Slide 7: Personality & Trends */}
      <PersonalitySlide
        personalityType={wrapped.personalityType}
        personalityDescription={wrapped.personalityDescription}
        trendsAhead={wrapped.trendsAhead}
        trendsSkipped={wrapped.trendsSkipped}
      />

      {/* Slide 8: Most Saved Look */}
      <MostSavedLookSlide mostSavedLookId={wrapped.mostSavedLookId} />

      {/* Slide 9: Closing */}
      <ClosingSlide
        year={wrapped.year}
        shareToken={wrapped.shareToken}
        totalLooksSaved={wrapped.totalLooksSaved}
        totalTryOns={wrapped.totalTryOns}
        totalLookbooks={wrapped.totalLookbooks}
      />
    </WrappedContainer>
  );
}

