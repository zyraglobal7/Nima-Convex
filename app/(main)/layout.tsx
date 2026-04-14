import { Navigation } from '@/components/Navigation';
import { MainContent } from './MainContent';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <MainContent>{children}</MainContent>
    </>
  );
}
