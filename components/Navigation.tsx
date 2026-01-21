'use client';

import { usePathname } from 'next/navigation';
import { Sparkles, User, ShoppingBag } from 'lucide-react';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import Link from 'next/link';

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/discover" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-serif font-semibold text-foreground">Nima</span>
              </Link>

              {/* Desktop Navigation - hidden on mobile */}
              <nav className="hidden md:flex items-center gap-6 ml-8">
                <Link 
                  href="/discover" 
                  className={`text-sm font-medium transition-colors ${isActive('/discover') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Discover
                </Link>
                <Link 
                  href="/ask" 
                  className={`text-sm font-medium transition-colors ${isActive('/ask') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Ask Nima
                </Link>
                <Link 
                  href="/lookbooks" 
                  className={`text-sm font-medium transition-colors ${isActive('/lookbooks') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Lookbooks
                </Link>
                 <Link 
                  href="/orders" 
                  className={`text-sm font-medium transition-colors ${isActive('/orders') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Orders
                </Link>
                <Link 
                  href="/profile" 
                  className={`text-sm font-medium transition-colors ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Profile
                </Link>
              </nav>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <MessagesIcon />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4 z-50">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className={`w-5 h-5 ${isActive('/discover') ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${isActive('/discover') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className={`w-5 h-5 ${isActive('/ask') ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className={`text-xs ${isActive('/ask') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className={`w-5 h-5 ${isActive('/lookbooks') ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className={`text-xs ${isActive('/lookbooks') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Lookbooks</span>
          </Link>
           <Link href="/orders" className="flex flex-col items-center gap-1 p-2">
            <ShoppingBag className={`w-5 h-5 ${isActive('/orders') ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${isActive('/orders') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Orders</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <User className={`w-5 h-5 ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${isActive('/profile') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
