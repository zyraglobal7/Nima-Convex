import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { ThemeProvider } from '@/components/theme-provider';
import { FloatingLoaderWrapper } from '@/components/FloatingLoaderWrapper';
import { PostHogProvider } from '@/components/PostHogProvider';

const cormorantGaramond = Cormorant_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nima AI | Your Personal AI Stylist',
  description: 'See yourself in every outfit. AI-powered fashion discovery and personal styling.',
  icons: {
    icon: '/nima-mascott.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#5C2A33', // Nima burgundy
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${cormorantGaramond.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PostHogProvider>
            <ConvexClientProvider>
              <FloatingLoaderWrapper>{children}</FloatingLoaderWrapper>
            </ConvexClientProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
