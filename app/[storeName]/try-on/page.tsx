'use client';

import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';
import Link from 'next/link';
import { Store, Zap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface PageProps {
  params: Promise<{ storeName: string }>;
}

export default function SellerTryOnPickerPage({ params }: PageProps) {
  const [storeName, setStoreName] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    params.then((p) => setStoreName(p.storeName));
  }, [params]);

  const rawProducts = searchParams.get('products') ?? '';
  const itemIds = rawProducts
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as Id<'items'>[];

  const result = useQuery(
    api.sellerTryOns.queries.getSellerWithItemsForTryOn,
    storeName && itemIds.length > 0
      ? { sellerSlug: storeName, itemIds }
      : 'skip'
  );

  if (!storeName || result === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (result === null || itemIds.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Store className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Products not found</h1>
        <p className="text-muted-foreground text-sm">This try-on link is invalid or has expired.</p>
      </div>
    );
  }

  const { seller, items } = result;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Store Header */}
      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {seller.logoUrl ? (
            <Image
              src={seller.logoUrl}
              alt={seller.shopName}
              width={40}
              height={40}
              unoptimized
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="font-serif font-semibold text-foreground">{seller.shopName}</h1>
            <p className="text-xs text-muted-foreground">Virtual Try-On</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {seller.tryOnCredits <= 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Zap className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Try-on unavailable</p>
              <p className="text-muted-foreground text-sm mt-1">
                This store has run out of try-on credits. Please contact the store.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-serif font-semibold text-foreground">
                Pick an item to try on
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a product below to see how it looks on you
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item._id}
                  href={`/${seller.slug}/try-on/${item._id}`}
                  className="group rounded-xl border border-border bg-surface overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        unoptimized={item.imageUrl.includes('convex')}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                      {item.name}
                    </p>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.brand}</p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-1.5">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: item.currency || 'KES',
                        minimumFractionDigits: 0,
                      }).format(item.price)}
                    </p>
                    <p className="mt-2 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Try it on →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
