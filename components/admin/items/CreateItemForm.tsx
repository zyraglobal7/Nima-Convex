'use client';

import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { ItemFormFields, type ItemFormData, defaultFormData } from './ItemFormFields';

type ImageType = 'front' | 'back' | 'side' | 'detail' | 'model' | 'flat_lay';

interface UploadedImage {
  storageId: Id<'_storage'>;
  url: string;
  imageType: ImageType;
}

interface CreateItemFormProps {
  onSuccess?: (itemId: Id<'items'>) => void;
  onCancel?: () => void;
  initialData?: Partial<ItemFormData>;
  initialImages?: UploadedImage[];
}

export function CreateItemForm({
  onSuccess,
  onCancel,
  initialData,
  initialImages = [],
}: CreateItemFormProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateUploadUrl = useMutation(api.admin.items.generateUploadUrl);
  const createItem = useMutation(api.admin.items.createItem);
  const addItemImage = useMutation(api.admin.items.addItemImage);
  const getStorageUrl = useMutation(api.admin.items.getStorageUrl);

  const handleFileUpload = useCallback(
    async (file: File, imageType: ImageType = 'front') => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      setIsUploading(true);
      try {
        // Get upload URL
        const uploadUrl = await generateUploadUrl({});

        // Upload file
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const { storageId } = await response.json();

        // Get the URL for preview
        const url = await getStorageUrl({ storageId });

        if (url) {
          setImages((prev) => [...prev, { storageId, url, imageType }]);
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

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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
      // Create the item
      const itemId = await createItem({
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        description: formData.description.trim() || undefined,
        category: formData.category,
        subcategory: formData.subcategory.trim() || undefined,
        gender: formData.gender,
        price: Math.round(parseFloat(formData.price)), // Store price as-is (no cents conversion)
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

      // Add images to the item
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        await addItemImage({
          itemId,
          storageId: img.storageId,
          imageType: img.imageType,
          isPrimary: i === 0, // First image is primary
          sortOrder: i,
        });
      }

      toast.success('Item created successfully');
      onSuccess?.(itemId);
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <Label className="mb-4 block">Product Images</Label>

          {/* Drop zone */}
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
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              </div>
            )}
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={img.url}
                      alt={`Product image ${index + 1}`}
                      width={200}
                      height={200}
                      unoptimized={img.url.includes('convex.cloud') || img.url.includes('convex.site')}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
              {/* Add more button */}
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Add more</span>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Fields */}
      <ItemFormFields data={formData} onChange={setFormData} disabled={isSubmitting} />

      {/* Actions */}
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
              Creating...
            </>
          ) : (
            'Create Item'
          )}
        </Button>
      </div>
    </form>
  );
}

