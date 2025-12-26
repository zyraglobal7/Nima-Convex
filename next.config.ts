import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.convex.cloud',
      },
      {
        protocol: 'https',
        hostname: '*.convex.site',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Google profile pictures (from Google OAuth)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // WorkOS profile pictures
      {
        protocol: 'https',
        hostname: 'workos.imgix.net',
      },
      {
        protocol: 'https',
        hostname: 'workoscdn.com',
      },
    ],
  },
};

export default nextConfig;
