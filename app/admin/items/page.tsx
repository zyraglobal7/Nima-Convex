'use client';

import { useState } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, Sparkles, Package } from 'lucide-react';
import { ItemsTable, CreateItemForm, EditItemForm, AIGenerateForm } from '@/components/admin/items';
import type { Id } from '@/convex/_generated/dataModel';

export default function ItemsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [editItemId, setEditItemId] = useState<Id<'items'> | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'create'>('all');

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    setShowAIDialog(false);
    setActiveTab('all');
  };

  const handleEditItem = (itemId: Id<'items'>) => {
    setEditItemId(itemId);
  };

  const handleEditSuccess = () => {
    setEditItemId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Items</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAIDialog(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Generate
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'create')}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Package className="h-4 w-4" />
            All Items
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
                View and manage all items in your catalog. Use filters to find specific items.
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
                  onClick={() => setShowCreateDialog(true)}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>
                  Create an item by filling out all the product details manually.
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

      {/* Manual Create Dialog */}
      <Sheet open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Item</SheetTitle>
            <SheetDescription>
              Add a new product to your catalog. Fill in the details below.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CreateItemForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateDialog(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Item Creation
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

      {/* Edit Item Sheet */}
      <Sheet open={!!editItemId} onOpenChange={(open) => !open && setEditItemId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Item</SheetTitle>
            <SheetDescription>
              Update the product details below.
            </SheetDescription>
          </SheetHeader>
          {editItemId && (
            <div className="mt-6">
              <EditItemForm
                itemId={editItemId}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditItemId(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

