'use client';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';

interface RecommendationItem {
  _id: Id<'items'>;
  name: string;
  brand?: string;
  imageUrl?: string | null;
  price: number;
  currency: string;
  category: string;
  fromWardrobe?: boolean;
}

interface RecommendationCardProps {
  id: Id<'recommendations'>;
  items: RecommendationItem[];
  wardrobeItems?: RecommendationItem[];
  occasion: string;
  nimaComment: string;
  isWardrobeMix?: boolean;
}

/**
 * Renders a single outfit recommendation card.
 * Item images are displayed in a collage layout (2-across, 3-left+2-stacked, 2x2 grid).
 */
export function RecommendationCard({
  id,
  items,
  wardrobeItems = [],
  occasion,
  nimaComment,
  isWardrobeMix,
}: RecommendationCardProps) {
  const router = useRouter();
  const markTriedOn = useMutation(api.recommendations.mutations.markTriedOn);

  const allItems = [
    ...items.map((i) => ({ ...i, fromWardrobe: false })),
    ...wardrobeItems.map((i) => ({ ...i, fromWardrobe: true })),
  ].slice(0, 4);

  const handleTryItOn = async () => {
    trackEvent('recommendation_try_on_tapped', {
      recommendationId: id,
      occasion,
      itemCount: allItems.length,
    });

    try {
      await markTriedOn({ recommendationId: id });
    } catch {
      // Non-blocking
    }

    // Navigate to fitting with the item IDs pre-selected
    const itemIds = items.map((i) => i._id).join(',');
    router.push(`/fitting?itemIds=${itemIds}&source=recommendation`);
  };

  return (
    <article className="rounded-2xl overflow-hidden border border-border/60 bg-surface shadow-sm hover:shadow-md transition-shadow">
      {/* Image collage */}
      <div className="relative">
        <ImageCollage items={allItems} />
        {isWardrobeMix && (
          <div className="absolute top-3 left-3">
            <span className="text-xs bg-primary/90 text-primary-foreground px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
              From your closet
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Occasion tag */}
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {occasion}
        </p>

        {/* Nima's comment */}
        <p className="text-sm text-text-primary leading-relaxed line-clamp-2 italic">
          &ldquo;{nimaComment}&rdquo;
        </p>

        {/* Item names */}
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 3).map((item) => (
            <span
              key={item._id}
              className="text-xs bg-background border border-border rounded-full px-2.5 py-0.5 text-text-secondary"
            >
              {item.name}
            </span>
          ))}
          {items.length > 3 && (
            <span className="text-xs text-text-secondary px-1 py-0.5">
              +{items.length - 3} more
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleTryItOn}
          className="w-full mt-1 py-2.5 text-sm font-medium text-primary border border-primary/40 rounded-xl hover:bg-primary/5 transition-colors"
        >
          Try it On →
        </button>
      </div>
    </article>
  );
}

// ── Collage layout ─────────────────────────────────────────────────────────────

interface CollageItem {
  _id: Id<'items'>;
  name: string;
  imageUrl?: string | null;
  fromWardrobe?: boolean;
}

function ImageCollage({ items }: { items: CollageItem[] }) {
  const count = items.length;

  if (count === 0) return <PlaceholderCollage />;

  if (count === 1) {
    return (
      <div className="aspect-[4/3] relative">
        <ItemImage item={items[0]} fill />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="aspect-[4/3] grid grid-cols-2 gap-0.5">
        <ItemImage item={items[0]} />
        <ItemImage item={items[1]} />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="aspect-[4/3] grid grid-cols-2 gap-0.5">
        <div className="row-span-2">
          <ItemImage item={items[0]} />
        </div>
        <ItemImage item={items[1]} />
        <ItemImage item={items[2]} />
      </div>
    );
  }

  // 4 items: 2×2 grid
  return (
    <div className="aspect-[4/3] grid grid-cols-2 grid-rows-2 gap-0.5">
      {items.slice(0, 4).map((item) => (
        <ItemImage key={item._id} item={item} />
      ))}
    </div>
  );
}

function ItemImage({ item, fill }: { item: CollageItem; fill?: boolean }) {
  const containerClass = fill ? 'relative w-full h-full' : 'relative w-full h-full';

  return (
    <div className={`${containerClass} bg-surface overflow-hidden`}>
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface">
          <span className="text-3xl">👗</span>
        </div>
      )}
      {item.fromWardrobe && (
        <div className="absolute bottom-1 right-1">
          <span className="text-xs bg-secondary/90 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            Yours
          </span>
        </div>
      )}
    </div>
  );
}

function PlaceholderCollage() {
  return (
    <div className="aspect-[4/3] flex items-center justify-center bg-surface">
      <span className="text-4xl">✨</span>
    </div>
  );
}
