'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function CartIcon() {
  const cartCount = useQuery(api.cart.queries.getCartCount) ?? 0;

  return (
    <Link
      href="/cart"
      className="relative p-2 rounded-full hover:bg-surface transition-colors"
    >
      <ShoppingBag className="w-5 h-5 text-muted-foreground" />
      {cartCount > 0 && (
        <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
          {cartCount > 9 ? '9+' : cartCount}
        </span>
      )}
    </Link>
  );
}

