'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { EditProductForm } from '@/components/seller/products/EditProductForm';
import type { Id } from '@/convex/_generated/dataModel';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as Id<'items'>;

  const handleSuccess = () => {
    router.push('/seller/products');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-semibold">Edit Product</h1>
          <p className="text-muted-foreground">Update your product details and images</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            Make changes to your product information below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditProductForm
            itemId={itemId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
