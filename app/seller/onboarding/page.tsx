'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Upload,
  Sparkles,
} from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';

const steps = [
  { id: 1, title: 'Store Basics', description: 'Tell us about your store' },
  { id: 2, title: 'Branding', description: 'Make your store stand out' },
  { id: 3, title: 'Review', description: 'Confirm your details' },
];

export default function SellerOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Form state
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoStorageId, setLogoStorageId] = useState<Id<'_storage'> | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Check if user already has a seller profile
  const existingSeller = useQuery(api.sellers.queries.getCurrentSeller);
  const isSlugAvailable = useQuery(
    api.sellers.queries.isSlugAvailable,
    slug ? { slug } : 'skip'
  );

  // Mutations
  const createSeller = useMutation(api.sellers.mutations.createSeller);
  const generateUploadUrl = useMutation(api.sellers.mutations.generateUploadUrl);

  // Redirect if already a seller
  if (existingSeller) {
    router.push('/seller');
    return null;
  }

  // Auto-generate slug from shop name
  const handleShopNameChange = (value: string) => {
    setShopName(value);
    const generatedSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    setSlug(generatedSlug);
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setIsUploadingLogo(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
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
      setLogoStorageId(storageId);
      toast.success('Logo uploaded successfully');
    } catch {
      toast.error('Failed to upload logo');
      setLogoPreview(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Validate current step
  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!shopName.trim()) {
          toast.error('Please enter your store name');
          return false;
        }
        if (!slug.trim()) {
          toast.error('Please enter a URL handle');
          return false;
        }
        if (isSlugAvailable === false) {
          toast.error('This URL handle is already taken');
          return false;
        }
        return true;
      case 2:
        return true; // Logo is optional
      default:
        return true;
    }
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!shopName.trim()) {
      toast.error('Please enter your store name');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSeller({
        shopName: shopName.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        logoStorageId,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });

      toast.success('Welcome to Nima! Your store is ready.');
      router.push('/seller');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create store');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-serif font-semibold text-lg">Become a Seller</h1>
            <p className="text-sm text-muted-foreground">Set up your store on Nima</p>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep >= step.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={`text-sm font-medium ${
                        currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        <AnimatePresence mode="wait">
          {/* Step 1: Store Basics */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-serif font-semibold">Store Basics</h2>
                <p className="text-muted-foreground mt-1">
                  Let's start with the essentials for your store.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Store Name *</Label>
                  <Input
                    id="shopName"
                    placeholder="e.g., Urban Style Co."
                    value={shopName}
                    onChange={(e) => handleShopNameChange(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is how customers will see your store name.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Store URL Handle *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">nima.com/shop/</span>
                    <Input
                      id="slug"
                      placeholder="urban-style-co"
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      className="h-12 flex-1"
                    />
                  </div>
                  {slug && isSlugAvailable !== undefined && (
                    <p
                      className={`text-xs ${
                        isSlugAvailable ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {isSlugAvailable ? '✓ Available' : '✗ Already taken'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="store@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Branding */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-serif font-semibold">Branding</h2>
                <p className="text-muted-foreground mt-1">
                  Make your store memorable with a logo and description.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Store Logo (Optional)</Label>
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-surface flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label htmlFor="logo-upload">
                        <Button
                          variant="outline"
                          className="w-full"
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
                                Upload Logo
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended: Square image, at least 200x200px
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Store Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell customers what makes your store special..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.length}/500 characters
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-serif font-semibold">Review & Confirm</h2>
                <p className="text-muted-foreground mt-1">
                  Make sure everything looks good before we create your store.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-surface-alt flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{shopName || 'Your Store'}</h3>
                      <p className="text-sm text-muted-foreground">
                        nima.com/shop/{slug || 'your-store'}
                      </p>
                    </div>
                  </div>

                  {description && (
                    <p className="text-muted-foreground text-sm">{description}</p>
                  )}

                  <div className="pt-4 border-t border-border space-y-2">
                    {contactEmail && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Email:</span> {contactEmail}
                      </p>
                    )}
                    {contactPhone && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Phone:</span> {contactPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">You're almost there!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        After creating your store, you can start adding products and receive
                        orders from Nima customers worldwide.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Actions */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Store...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create My Store
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
