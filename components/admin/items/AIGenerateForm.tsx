'use client';

import { useState, useCallback } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Loader2, Sparkles, X, Check, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { ItemFormFields, type ItemFormData, defaultFormData } from './ItemFormFields';

type ImageType = 'front' | 'back' | 'side' | 'detail' | 'model' | 'flat_lay';

interface UploadedImage {
  storageId: Id<'_storage'>;
  url: string;
  imageType: ImageType;
}

interface AIGenerateFormProps {
  onSuccess?: (itemId: Id<'items'>) => void;
  onCancel?: () => void;
}

type Step = 'upload' | 'generating' | 'review';

export function AIGenerateForm({ onSuccess, onCancel }: AIGenerateFormProps) {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateUploadUrl = useMutation(api.admin.items.generateUploadUrl);
  const getStorageUrl = useMutation(api.admin.items.getStorageUrl);
  const generateProductDetails = useAction(api.admin.aiActions.generateProductDetails);
  const createItem = useMutation(api.admin.items.createItem);
  const addItemImage = useMutation(api.admin.items.addItemImage);

  const handleFileUpload = useCallback(
    async (file: File) => {
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

        // Get the URL for preview and AI analysis
        const url = await getStorageUrl({ storageId });

        if (url) {
          setUploadedImage({ storageId, url, imageType: 'front' });
          toast.success('Image uploaded');

          // Automatically start AI generation
          setStep('generating');
          await generateDetails(url);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload image');
        setStep('upload');
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl, getStorageUrl]
  );

  const generateDetails = async (imageUrl: string) => {
    try {
      const result = await generateProductDetails({ imageUrl });

      if (result.success && result.data) {
        // Convert AI response to form data
        setFormData({
          name: result.data.name,
          brand: result.data.brand || '',
          description: result.data.description,
          category: result.data.category,
          subcategory: result.data.subcategory || '',
          gender: result.data.suggestedGender,
          price: result.data.suggestedPriceRange
            ? String(Math.round((result.data.suggestedPriceRange.min + result.data.suggestedPriceRange.max) / 2))
            : '',
          currency: 'USD',
          originalPrice: '',
          colors: result.data.colors,
          sizes: [],
          material: result.data.material || '',
          tags: result.data.tags,
          occasion: result.data.occasion || [],
          season: result.data.season || [],
          sourceStore: '',
          sourceUrl: '',
          inStock: true,
        });

        setStep('review');
        toast.success('AI analysis complete! Review the details below.');
      } else {
        toast.error(result.error || 'Failed to analyze image');
        setStep('upload');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate product details');
      setStep('upload');
    }
  };

  const handleRegenerate = async () => {
    if (uploadedImage) {
      setStep('generating');
      await generateDetails(uploadedImage.url);
    }
  };

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

  const handleReset = () => {
    setUploadedImage(null);
    setFormData(defaultFormData);
    setStep('upload');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }

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
        price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
        currency: formData.currency,
        originalPrice: formData.originalPrice
          ? Math.round(parseFloat(formData.originalPrice) * 100)
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

      // Add the image to the item
      await addItemImage({
        itemId,
        storageId: uploadedImage.storageId,
        imageType: uploadedImage.imageType,
        isPrimary: true,
        sortOrder: 0,
      });

      toast.success('Item created successfully');
      onSuccess?.(itemId);
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Upload Image
  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Item Creation
            </CardTitle>
            <CardDescription>
              Upload a product image and our AI will automatically analyze it to extract product details.
              You can then review and edit the information before saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Uploading image...</p>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-3 cursor-pointer">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Drop your product image here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
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
              )}
            </div>
          </CardContent>
        </Card>

        {onCancel && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Generating
  if (step === 'generating') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 py-12">
              {uploadedImage && (
                <div className="h-48 w-48 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={uploadedImage.url}
                    alt="Uploaded product"
                    width={192}
                    height={192}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                <p className="font-medium">Analyzing your product image...</p>
                <p className="text-sm text-muted-foreground">
                  Our AI is identifying colors, style, category, and more
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Review & Edit
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-success" />
              </div>
              <div>
                <CardTitle className="text-base">AI Analysis Complete</CardTitle>
                <CardDescription>Review and edit the details below</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                Start Over
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {uploadedImage && (
            <div className="mb-6">
              <Label className="mb-2 block">Product Image</Label>
              <div className="h-48 w-48 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={uploadedImage.url}
                  alt="Uploaded product"
                  width={192}
                  height={192}
                  className="h-full w-full object-cover"
                />
              </div>
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Item
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

