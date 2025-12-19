import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  redirectUri:
    process.env.WORKOS_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ||
    'http://localhost:3000/callback',
  // Eager auth ensures the session is always available on the server
  eagerAuth: true,
  middlewareAuth: {
    enabled: true,
    // Routes that don't require authentication
    unauthenticatedPaths: [
      // Home page (gate splash & onboarding)
      '/',
      // Admin dashboard (unauthenticated for now)
      '/admin',
      '/admin/(.*)',
      // Auth routes
      '/sign-in',
      '/sign-up',
      '/callback',
      // Public browsing (limited features without auth)
      '/discover',
      '/discover/(.*)',
      // Public look viewing
      '/look/(.*)',
      // Health check (if exposed)
      '/api/health',
    ],
  },
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
