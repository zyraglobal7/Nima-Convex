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
import { Plus, Sparkles, Package, Zap, Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { ItemsTable } from '@/components/seller/products/ItemsTable';
import { AIGenerateForm } from '@/components/seller/products/AIGenerateForm';
import { CreateProductForm } from '@/components/seller/products/CreateProductForm';
import type { Id } from '@/convex/_generated/dataModel';

export default function SellerProductsPage() {
  const router = useRouter();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'create' | 'tryon-links'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const stats = useQuery(api.sellers.queries.getSellerDashboardStats);
  const tryOnCredits = useQuery(api.sellerTryOns.queries.getSellerTryOnCredits);
  const seller = useQuery(api.sellers.queries.getCurrentSeller);
  const productsResult = useQuery(api.sellers.queries.getSellerProducts, { isActive: true, limit: 200 });

  const copyLink = async (productId: Id<'items'>, name: string) => {
    if (!seller) return;
    const url = `${window.location.origin}/${seller.slug}/try-on/${productId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(productId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllLinks = async () => {
    if (!seller || !productsResult?.products.length) return;
    const links = productsResult.products
      .map((p) => `${p.name}: ${window.location.origin}/${seller.slug}/try-on/${p._id}`)
      .join('\n');
    await navigator.clipboard.writeText(links);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };
  const atLimit =
    stats !== undefined &&
    stats !== null &&
    stats.productLimit !== null &&
    stats.totalProducts >= stats.productLimit;

  const handleCreateSuccess = (_itemId: Id<'items'>) => {
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
        <div className="flex items-center gap-4">
          {tryOnCredits !== undefined && tryOnCredits !== null && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              <span>{tryOnCredits} try-on credits</span>
            </div>
          )}
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'create' | 'tryon-links')}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Package className="h-4 w-4" />
            All Products
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <Plus className="h-4 w-4" />
            Quick Create
          </TabsTrigger>
          <TabsTrigger value="tryon-links" className="gap-2">
            <Link2 className="h-4 w-4" />
            Try-On Links
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
        <TabsContent value="tryon-links" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-primary" />
                    Customer Try-On Links
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Share these links with customers so they can virtually try on your products — credits are deducted from your balance.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{tryOnCredits ?? '—'}</span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  {productsResult && productsResult.products.length > 0 && seller && (
                    <Button variant="outline" size="sm" onClick={copyAllLinks}>
                      {allCopied ? (
                        <><Check className="h-4 w-4 mr-1.5 text-green-500" />Copied all!</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1.5" />Copy All Links</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(tryOnCredits === 0 || tryOnCredits === null) && (
                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Zap className="h-4 w-4 flex-shrink-0" />
                  <span>You have no try-on credits. Customers won&apos;t be able to generate try-ons until you top up.</span>
                </div>
              )}
              {!productsResult ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading products…</p>
              ) : productsResult.products.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active products yet. Add products first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {productsResult.products.map((product) => {
                    const tryOnUrl = seller ? `${window.location.origin}/${seller.slug}/try-on/${product._id}` : null;
                    const isCopied = copiedId === product._id;
                    return (
                      <div
                        key={product._id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                          {tryOnUrl && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{tryOnUrl}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {tryOnUrl && (
                            <a
                              href={tryOnUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                              title="Preview try-on page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => copyLink(product._id, product.name)}
                          >
                            {isCopied ? (
                              <><Check className="h-3 w-3 text-green-500" />Copied!</>
                            ) : (
                              <><Link2 className="h-3 w-3" />Copy Link</>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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

