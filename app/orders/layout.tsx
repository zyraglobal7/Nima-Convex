import { Navigation } from '@/components/Navigation';

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Main content with shared max-width */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

       {/* Spacer for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
