'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Store } from 'lucide-react';

interface SellerGuardProps {
  children: React.ReactNode;
}

export function SellerGuard({ children }: SellerGuardProps) {
  const router = useRouter();
  const seller = useQuery(api.sellers.queries.getCurrentSeller);

  useEffect(() => {
    // If the query has resolved and user doesn't have a seller profile, redirect to onboarding
    if (seller === null) {
      router.push('/seller/onboarding');
    }
  }, [seller, router]);

  // Still loading
  if (seller === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading seller dashboard...</p>
        </div>
      </div>
    );
  }

  // No seller profile - show brief message before redirect
  if (seller === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Store className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-medium text-foreground mb-2">Setting Up Your Store</h1>
          <p className="text-muted-foreground">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  // User has a seller profile - render children
  return <>{children}</>;
}
