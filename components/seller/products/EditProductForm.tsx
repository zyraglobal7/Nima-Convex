'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { ItemFormFields, type ItemFormData, defaultFormData } from '@/components/admin/items/ItemFormFields';

type ImageType = 'front' | 'back' | 'side' | 'detail' | 'model' | 'flat_lay';

interface ExistingImage {
  _id: Id<'item_images'>;
  url: string | null;
  imageType: ImageType;
  isPrimary: boolean;
}

interface NewImage {
  storageId: Id<'_storage'>;
  url: string;
  imageType: ImageType;
}

interface EditProductFormProps {
  itemId: Id<'items'>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditProductForm({ itemId, onSuccess, onCancel }: EditProductFormProps) {
  const [formData, setFormData] = useState<ItemFormData>(defaultFormData);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<Id<'item_images'>[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch item data using seller-specific query
  const itemData = useQuery(api.sellers.queries.getSellerProduct, { itemId });

  // Use seller-specific mutations
  const generateUploadUrl = useMutation(api.sellers.mutations.generateUploadUrl);
  const updateProduct = useMutation(api.sellers.mutations.updateSellerProduct);
  const addItemImage = useMutation(api.sellers.mutations.addItemImage);
  const deleteItemImage = useMutation(api.sellers.mutations.deleteItemImage);
  const getStorageUrl = useMutation(api.sellers.mutations.getStorageUrl);

  // Initialize form data when item loads
  useEffect(() => {
    if (itemData && !isInitialized) {
      const { item, images } = itemData;

      const validGenders = ['male', 'female', 'unisex'] as const;
      const validCategories = ['top', 'bottom', 'dress', 'outfit', 'outerwear', 'shoes', 'accessory', 'bag', 'jewelry'] as const;
      
      setFormData({
        name: item.name || '',
        brand: item.brand || '',
        description: item.description || '',
        category: validCategories.includes(item.category as typeof validCategories[number]) ? item.category : 'top',
        subcategory: item.subcategory || '',
        gender: validGenders.includes(item.gender as typeof validGenders[number]) ? item.gender : 'unisex',
        price: item.price?.toString() || '0',
        currency: item.currency?.trim() || 'KES',
        originalPrice: item.originalPrice?.toString() || '',
        colors: item.colors || [],
        sizes: item.sizes || [],
        material: item.material || '',
        tags: item.tags || [],
        occasion: item.occasion || [],
        season: item.season || [],
        sourceStore: item.sourceStore || '',
        sourceUrl: item.sourceUrl || '',
        inStock: item.inStock ?? true,
      });

      setExistingImages(
        images.map((img) => ({
          _id: img._id,
          url: img.url,
          imageType: img.imageType as ImageType,
          isPrimary: img.isPrimary,
        }))
      );

      setIsInitialized(true);
    }
  }, [itemData, isInitialized]);

  const handleFileUpload = useCallback(
    async (file: File, imageType: ImageType = 'front') => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      setIsUploading(true);
      try {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const { storageId } = await response.json();
        const url = await getStorageUrl({ storageId });

        if (url) {
          setNewImages((prev) => [...prev, { storageId, url, imageType }]);
          toast.success('Image uploaded');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl, getStorageUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleRemoveExistingImage = (imageId: Id<'item_images'>) => {
    setExistingImages((prev) => prev.filter((img) => img._id !== imageId));
    setImagesToDelete((prev) => [...prev, imageId]);
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProduct({
        itemId,
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        description: formData.description.trim() || undefined,
        category: formData.category,
        subcategory: formData.subcategory.trim() || undefined,
        gender: formData.gender,
        price: Math.round(parseFloat(formData.price)),
        currency: formData.currency,
        originalPrice: formData.originalPrice
          ? Math.round(parseFloat(formData.originalPrice))
          : undefined,
        colors: formData.colors,
        sizes: formData.sizes,
        material: formData.material.trim() || undefined,
        tags: formData.tags,
        occasion: formData.occasion.length > 0 ? formData.occasion : undefined,
        season: formData.season.length > 0 ? formData.season : undefined,
        sourceStore: formData.sourceStore.trim() || undefined,
        sourceUrl: formData.sourceUrl.trim() || undefined,
        inStock: formData.inStock,
      });

      for (const imageId of imagesToDelete) {
        await deleteItemImage({ imageId });
      }

      const startOrder = existingImages.length;
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        await addItemImage({
          itemId,
          storageId: img.storageId,
          imageType: img.imageType,
          isPrimary: existingImages.length === 0 && i === 0,
          sortOrder: startOrder + i,
        });
      }

      toast.success('Product updated successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!itemData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allImages = [
    ...existingImages.map((img, i) => ({
      type: 'existing' as const,
      id: img._id,
      url: img.url,
      index: i,
      isPrimary: img.isPrimary,
    })),
    ...newImages.map((img, i) => ({
      type: 'new' as const,
      id: img.storageId,
      url: img.url,
      index: i,
      isPrimary: false,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Label className="mb-4 block">Product Images</Label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop images here, or{' '}
                  <label className="text-primary cursor-pointer hover:underline">
                    browse
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      disabled={isUploading}
                    />
                  </label>
                </p>
              </div>
            )}
          </div>

          {allImages.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {allImages.map((img) => (
                <div key={`${img.type}-${img.id}`} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {img.url ? (
                      <Image
                        src={img.url}
                        alt={`Product image`}
                        width={200}
                        height={200}
                        unoptimized={img.url.includes('convex.cloud') || img.url.includes('convex.site')}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (img.type === 'existing') {
                        handleRemoveExistingImage(img.id as Id<'item_images'>);
                      } else {
                        handleRemoveNewImage(img.index);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {img.isPrimary && (
                    <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                  {img.type === 'new' && (
                    <span className="absolute bottom-1 right-1 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                      New
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ItemFormFields data={formData} onChange={setFormData} disabled={isSubmitting} />

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
