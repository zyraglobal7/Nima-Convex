'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, Sparkles, Package } from 'lucide-react';
import { ItemsTable } from '@/components/seller/products/ItemsTable';
import { AIGenerateForm } from '@/components/seller/products/AIGenerateForm';
import { CreateProductForm } from '@/components/seller/products/CreateProductForm';
import type { Id } from '@/convex/_generated/dataModel';

export default function SellerProductsPage() {
  const router = useRouter();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'create'>('all');

  const stats = useQuery(api.sellers.queries.getSellerDashboardStats);
  const atLimit =
    stats !== undefined &&
    stats !== null &&
    stats.productLimit !== null &&
    stats.totalProducts >= stats.productLimit;

  const handleCreateSuccess = (itemId: Id<'items'>) => {
    setShowAIDialog(false);
    setShowCreateSheet(false);
    setActiveTab('all');
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
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-muted-foreground">Manage your product catalog</p>
            {stats && stats.productLimit !== null && (
              <Badge variant={atLimit ? 'destructive' : 'secondary'}>
                {stats.totalProducts} / {stats.productLimit} products
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAIDialog(true)}
            disabled={!!atLimit}
            title={atLimit ? `Product limit reached (${stats?.productLimit}). Upgrade your plan to add more.` : undefined}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI Generate
          </Button>
          <Button
            onClick={() => setShowCreateSheet(true)}
            disabled={!!atLimit}
            title={atLimit ? `Product limit reached (${stats?.productLimit}). Upgrade your plan to add more.` : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Limit warning banner */}
      {atLimit && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>
            You&apos;ve reached your product limit ({stats?.productLimit} products).{' '}
            <Link href="/seller/billing" className="underline font-medium">
              Upgrade your plan
            </Link>{' '}
            to add more.
          </span>
        </div>
      )}

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
            <Card
              className={atLimit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 transition-colors'}
              onClick={atLimit ? undefined : () => setShowCreateSheet(true)}
            >
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
            <Card
              className={atLimit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 transition-colors'}
              onClick={atLimit ? undefined : () => setShowAIDialog(true)}
            >
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

      {/* Create Product Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Product
            </SheetTitle>
            <SheetDescription>
              Fill in the details below to add a new product to your catalog.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CreateProductForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateSheet(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

