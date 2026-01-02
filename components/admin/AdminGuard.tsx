'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const isAdmin = useQuery(api.admin.queries.isCurrentUserAdmin);

  useEffect(() => {
    // If the query has resolved and user is not an admin, redirect
    if (isAdmin === false) {
      router.push('/');
    }
  }, [isAdmin, router]);

  // Still loading
  if (isAdmin === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not an admin - show brief message before redirect
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-medium text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this area.</p>
          <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  // User is an admin - render children
  return <>{children}</>;
}

