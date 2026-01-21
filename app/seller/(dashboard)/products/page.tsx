'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Sparkles, Package } from 'lucide-react';
import { ItemsTable } from '@/components/seller/products/ItemsTable';
import { AIGenerateForm } from '@/components/seller/products/AIGenerateForm';
import type { Id } from '@/convex/_generated/dataModel';

export default function SellerProductsPage() {
  const router = useRouter();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'create'>('all');

  const handleCreateSuccess = (itemId: Id<'items'>) => {
    setShowAIDialog(false);
    setActiveTab('all');
    // Optionally refresh or highlight new item
  };

  const handleEditItem = (itemId: Id<'items'>) => {
    router.push(`/seller/products/${itemId}/edit`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAIDialog(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Generate
          </Button>
          <Link href="/seller/products/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'create')}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Package className="h-4 w-4" />
            All Products
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <Plus className="h-4 w-4" />
            Quick Create
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
              <CardDescription>
                View and manage all products in your catalog. Use filters to find specific items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ItemsTable onEdit={handleEditItem} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Manual Create Card */}
            <Card className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push('/seller/products/create')}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>
                  Create a product by filling out all the details manually.
                  Best for when you have all the information ready.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* AI Generate Card */}
            <Card className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setShowAIDialog(true)}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI-Powered</CardTitle>
                <CardDescription>
                  Upload an image and let AI analyze it to automatically fill in product details.
                  You can review and edit before saving.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Product Creation
            </DialogTitle>
            <DialogDescription>
              Upload a product image and our AI will analyze it to extract details.
            </DialogDescription>
          </DialogHeader>
          <AIGenerateForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowAIDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

