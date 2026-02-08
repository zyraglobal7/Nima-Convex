import { Navigation } from '@/components/Navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <div className="pb-20 md:pb-0">{children}</div>
    </>
  );
}
