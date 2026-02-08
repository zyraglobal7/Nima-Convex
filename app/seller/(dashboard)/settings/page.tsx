'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Store,
  Upload,
  Loader2,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

export default function SellerSettingsPage() {
  const seller = useQuery(api.sellers.queries.getCurrentSeller);
  const updateSeller = useMutation(api.sellers.mutations.updateSeller);
  const generateUploadUrl = useMutation(api.sellers.mutations.generateUploadUrl);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Form state
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoStorageId, setLogoStorageId] = useState<Id<'_storage'> | undefined>();
  const [bannerStorageId, setBannerStorageId] = useState<Id<'_storage'> | undefined>();

  // Initialize form with seller data
  useEffect(() => {
    if (seller) {
      setShopName(seller.shopName);
      setDescription(seller.description ?? '');
      setContactEmail(seller.contactEmail ?? '');
      setContactPhone(seller.contactPhone ?? '');
      setLogoPreview(seller.logoUrl ?? null);
      setBannerPreview(seller.bannerUrl ?? null);
    }
  }, [seller]);

  const handleImageUpload = async (
    file: File,
    type: 'logo' | 'banner'
  ) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingBanner;
    const setPreview = type === 'logo' ? setLogoPreview : setBannerPreview;
    const setStorageId = type === 'logo' ? setLogoStorageId : setBannerStorageId;

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to storage
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
      setStorageId(storageId);
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully`);
    } catch {
      toast.error(`Failed to upload ${type}`);
      setPreview(type === 'logo' ? seller?.logoUrl ?? null : seller?.bannerUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!shopName.trim()) {
      toast.error('Store name is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateSeller({
        shopName: shopName.trim(),
        description: description.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        logoStorageId,
        bannerStorageId,
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getVerificationBadge = (status: 'pending' | 'verified' | 'rejected' | undefined) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  if (seller === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-24 rounded-xl" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Shop Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your store profile and branding
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Verification Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>Your store's verification status</CardDescription>
            </div>
            {getVerificationBadge(seller?.verificationStatus)}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {seller?.verificationStatus === 'verified'
              ? 'Your store is verified and visible to all customers.'
              : seller?.verificationStatus === 'rejected'
              ? 'Your verification was rejected. Please contact support for more information.'
              : 'Your store is under review. This usually takes 1-2 business days.'}
          </p>
        </CardContent>
      </Card>

      {/* Store Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Store Branding</CardTitle>
          <CardDescription>Customize how your store appears to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-3">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-24 h-24 rounded-xl">
                <AvatarImage src={logoPreview ?? undefined} alt="Store logo" />
                <AvatarFallback className="rounded-xl bg-surface-alt">
                  <Store className="w-8 h-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <label htmlFor="logo-upload">
                  <Button
                    variant="outline"
                    disabled={isUploadingLogo}
                    asChild
                  >
                    <span>
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Change Logo
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'logo');
                  }}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended: Square image, at least 200x200px
                </p>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="space-y-3">
            <Label>Store Banner</Label>
            <div className="space-y-3">
              <div className="w-full h-32 rounded-xl bg-surface-alt border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Store banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">No banner uploaded</p>
                )}
              </div>
              <label htmlFor="banner-upload">
                <Button
                  variant="outline"
                  disabled={isUploadingBanner}
                  asChild
                >
                  <span>
                    {isUploadingBanner ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {bannerPreview ? 'Change Banner' : 'Upload Banner'}
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'banner');
                }}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 1200x300px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Details */}
      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
          <CardDescription>Basic information about your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopName">Store Name *</Label>
            <Input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Your Store Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Store URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">https://shopnima.ai/</span>
              <Input
                id="slug"
                value={seller?.slug ?? ''}
                disabled
                className="flex-1 bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Store URL cannot be changed after creation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Store Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers what makes your store special..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>How customers can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="store@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
