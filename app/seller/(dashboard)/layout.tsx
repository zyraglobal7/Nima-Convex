import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { SellerHeader } from '@/components/seller/SellerHeader';
import { SellerGuard } from '@/components/seller/SellerGuard';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SellerGuard>
      <SidebarProvider>
        <SellerSidebar />
        <SidebarInset>
          <SellerHeader />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SellerGuard>
  );
}
