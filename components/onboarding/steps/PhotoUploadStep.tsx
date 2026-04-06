'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { StepProps, UploadedImage } from '../types';
import { Upload, X, Camera, Shield, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';
import { trackStepCompleted, trackPhotoUploaded, trackPhotoRemoved, ONBOARDING_STEPS } from '@/lib/analytics';

// Constants for validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const MAX_PHOTOS = 4; // Match backend MAX_ONBOARDING_PHOTOS


interface UploadingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'validating' | 'error';
  error?: string;
  progress?: number;
}

interface ExistingImage {
  _id: Id<'user_images'>;
  url: string | null;
  filename?: string;
  isPrimary: boolean;
}

export function PhotoUploadStep({ formData, updateFormData, onNext, onBack }: StepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoLoadedRef = useRef(false);

  // Query for existing onboarding images (by token)
  const existingOnboardingImages = useQuery(
    api.userImages.queries.getOnboardingImages,
    formData.onboardingToken ? { onboardingToken: formData.onboardingToken } : 'skip'
  );

  // Query for existing user images (if authenticated)
  const existingUserImages = useQuery(api.userImages.queries.getExistingUserImages);

  // Convex mutations
  const generateUploadUrl = useMutation(api.userImages.mutations.generateOnboardingUploadUrl);
  const saveImage = useMutation(api.userImages.mutations.saveOnboardingImage);
  const deleteImage = useMutation(api.userImages.mutations.deleteOnboardingImage);
  const deleteAllOnboardingImages = useMutation(api.userImages.mutations.deleteAllOnboardingImages);
  const deleteAllUserImages = useMutation(api.userImages.mutations.deleteAllUserImages);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Convex actions
  const validateImage = useAction(api.userImages.actions.validateOnboardingImage);

  // Combine existing images from both sources, excluding any already in form data
  const uniqueExistingImages = useMemo<ExistingImage[]>(() => {
    const all: ExistingImage[] = [
      ...(existingOnboardingImages || [])
        .filter((img) => !formData.uploadedImages.some((u) => u.imageId === img._id))
        .map((img) => ({ _id: img._id, url: img.url, filename: img.filename, isPrimary: img.isPrimary })),
      ...(existingUserImages || [])
        .filter((img) => !formData.uploadedImages.some((u) => u.imageId === img._id))
        .map((img) => ({ _id: img._id, url: img.url, filename: img.filename, isPrimary: img.isPrimary })),
    ];
    return all.filter((img, idx, arr) => arr.findIndex((i) => i._id === img._id) === idx);
  }, [existingOnboardingImages, existingUserImages, formData.uploadedImages]);

  // Auto-load existing images into form data once queries have resolved
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (existingOnboardingImages === undefined || existingUserImages === undefined) return;
    autoLoadedRef.current = true;

    if (uniqueExistingImages.length > 0 && formData.uploadedImages.length === 0) {
      const converted: UploadedImage[] = uniqueExistingImages
        .filter((img) => img.url)
        .map((img) => ({
          imageId: img._id,
          storageId: '' as Id<'_storage'>,
          filename: img.filename || 'existing-image',
          previewUrl: img.url!,
        }));
      updateFormData({ uploadedImages: converted });
    }
  }, [existingOnboardingImages, existingUserImages, uniqueExistingImages, formData.uploadedImages, updateFormData]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      uploadingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [uploadingFiles]);

  // Validate a single file
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG and PNG images are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  // Upload a single file
  const uploadFile = useCallback(
    async (file: File, tempId: string): Promise<UploadedImage | null> => {
      try {
        // Generate upload URL
        const uploadUrl = await generateUploadUrl({ onboardingToken: formData.onboardingToken });

        // Upload to Convex storage
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error('Upload failed');
        }

        const { storageId } = await result.json();

        // Save the image record
        const imageId = await saveImage({
          onboardingToken: formData.onboardingToken,
          storageId,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          imageType: 'full_body',
        });

        // Update status to validating
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: 'validating' as const } : f
          )
        );

        // Run AI validation
        try {
          const validation = await validateImage({
            storageId,
            onboardingToken: formData.onboardingToken,
          });

          if (!validation.valid) {
            // Validation failed — delete the image and show the issue
            await deleteImage({
              onboardingToken: formData.onboardingToken,
              imageId,
            });

            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === tempId
                  ? {
                      ...f,
                      status: 'error' as const,
                      error:
                        validation.issue ||
                        "This photo won't work well for styling. Try a clear selfie or portrait.",
                    }
                  : f
              )
            );
            return null;
          }
        } catch (validationError) {
          // If validation call itself fails, be lenient — let the image through
          console.warn('Photo validation failed, allowing image:', validationError);
        }

        return {
          imageId,
          storageId,
          filename: file.name,
          previewUrl: URL.createObjectURL(file),
        };
      } catch (err) {
        console.error('Upload error:', err);
        throw err;
      }
    },
    [formData.onboardingToken, generateUploadUrl, saveImage, validateImage, deleteImage, setUploadingFiles]
  );

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !formData.onboardingToken) return;
      setError(null);

      const currentCount = formData.uploadedImages.length + uploadingFiles.length;
      const availableSlots = MAX_PHOTOS - currentCount;

      if (availableSlots <= 0) {
        setError(`Maximum ${MAX_PHOTOS} photos allowed`);
        return;
      }

      const filesToProcess = Array.from(files).slice(0, availableSlots);

      // Validate files first
      for (const file of filesToProcess) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      // Create temporary entries for uploading state
      const tempFiles: UploadingFile[] = filesToProcess.map((file) => ({
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading' as const,
      }));

      setUploadingFiles((prev) => [...prev, ...tempFiles]);

      // Upload each file
      const uploadedResults: UploadedImage[] = [];
      
      for (const tempFile of tempFiles) {
        try {
          const result = await uploadFile(tempFile.file, tempFile.id);
          if (result) {
            // Upload + validation succeeded — remove from uploading state
            result.previewUrl = tempFile.previewUrl;
            uploadedResults.push(result);
            setUploadingFiles((prev) => prev.filter((f) => f.id !== tempFile.id));
          }
          // If result is null, validation failed — error state already set inside uploadFile
        } catch {
          // Network/upload error
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === tempFile.id
                ? { ...f, status: 'error' as const, error: 'Upload failed. Please try again.' }
                : f
            )
          );
        }
      }

      // Update form data with successfully uploaded images
      if (uploadedResults.length > 0) {
        const newTotal = formData.uploadedImages.length + uploadedResults.length;
        trackPhotoUploaded(newTotal);
        updateFormData({
          uploadedImages: [...formData.uploadedImages, ...uploadedResults],
        });
      }
    },
    [formData.onboardingToken, formData.uploadedImages, uploadingFiles.length, updateFormData, uploadFile]
  );

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // Remove an uploaded photo
  const removePhoto = async (imageId: string) => {
    try {
      await deleteImage({
        onboardingToken: formData.onboardingToken,
        imageId: imageId as Id<'user_images'>,
      });

      // Find and revoke the preview URL
      const image = formData.uploadedImages.find((img) => img.imageId === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      const remainingCount = formData.uploadedImages.length - 1;
      trackPhotoRemoved(remainingCount);
      updateFormData({
        uploadedImages: formData.uploadedImages.filter((img) => img.imageId !== imageId),
      });
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Failed to remove image. Please try again.');
    }
  };

  // Remove a failed upload
  const removeFailedUpload = (tempId: string) => {
    const file = uploadingFiles.find((f) => f.id === tempId);
    if (file) {
      URL.revokeObjectURL(file.previewUrl);
    }
    setUploadingFiles((prev) => prev.filter((f) => f.id !== tempId));
  };

  // Retry a failed upload
  const retryUpload = async (tempId: string) => {
    const failedFile = uploadingFiles.find((f) => f.id === tempId);
    if (!failedFile) return;

    setUploadingFiles((prev) =>
      prev.map((f) => (f.id === tempId ? { ...f, status: 'uploading' as const, error: undefined } : f))
    );

    try {
      const result = await uploadFile(failedFile.file, tempId);
      if (result) {
        result.previewUrl = failedFile.previewUrl;
        setUploadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        updateFormData({
          uploadedImages: [...formData.uploadedImages, result],
        });
      }
      // If result is null, validation failed — error state already set inside uploadFile
    } catch {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? { ...f, status: 'error' as const, error: 'Upload failed. Please try again.' }
            : f
        )
      );
    }
  };

  // Clear all photos and start fresh
  const handleStartFresh = async () => {
    try {
      setIsDeletingAll(true);
      setError(null);

      if (formData.onboardingToken) {
        await deleteAllOnboardingImages({ onboardingToken: formData.onboardingToken });
      }
      try {
        await deleteAllUserImages({});
      } catch {
        // Not authenticated - ignore
      }

      updateFormData({ uploadedImages: [] });
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Error deleting images:', err);
      setError('Failed to delete images. Please try again.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const hasUploading = uploadingFiles.some((f) => f.status === 'uploading' || f.status === 'validating');
  const hasPhotos = formData.uploadedImages.length > 0;
  const totalCount = formData.uploadedImages.length + uploadingFiles.length;
  const canAddMore = totalCount < MAX_PHOTOS;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                Be the model in every look
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                This is the fun part. We use these image(s) to put you in every look on Nima. Use portrait images or selfies to get the best out of Nima.
              </p>
            </div>
            {hasPhotos && !hasUploading && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Start fresh
              </button>
            )}
          </div>
          {/* Confirm clear dialog */}
          {showClearConfirm && (
            <div className="mt-2 p-3 bg-surface border border-border rounded-xl flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">Delete all photos?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-full border border-border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartFresh}
                  disabled={isDeletingAll}
                  className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full disabled:opacity-50 flex items-center gap-1"
                >
                  {isDeletingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div className="flex-1 px-4 pb-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Photo previews */}
          {(formData.uploadedImages.length > 0 || uploadingFiles.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {/* Successfully uploaded images - use native img for blob URLs */}
              {formData.uploadedImages.map((image) => (
                <div
                  key={image.imageId}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface animate-in fade-in zoom-in duration-300"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt={image.filename}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      // If blob URL fails, show placeholder
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'fallback-placeholder absolute inset-0 flex items-center justify-center bg-surface-alt';
                        placeholder.innerHTML = '<span class="text-muted-foreground text-sm">Image uploaded ✓</span>';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                  {/* Validation passed badge */}
                  <div className="absolute top-2 left-2 bg-green-500 rounded-full p-1 z-10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <button
                    onClick={() => removePhoto(image.imageId)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors z-10"
                    aria-label="Remove photo"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}

              {/* Uploading/failed images - use native img for blob URLs */}
              {uploadingFiles.map((file) => (
                <div
                  key={file.id}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface animate-in fade-in zoom-in duration-300"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.previewUrl}
                    alt={file.file.name}
                    className={`absolute inset-0 w-full h-full object-cover ${file.status === 'uploading' || file.status === 'validating' ? 'opacity-50' : ''}`}
                  />

                  {file.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="text-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin mx-auto" />
                        <p className="text-white text-xs mt-2">Uploading...</p>
                      </div>
                    </div>
                  )}

                  {file.status === 'validating' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center px-3">
                        <Loader2 className="w-6 h-6 text-white animate-spin mx-auto" />
                        <p className="text-white text-xs mt-2 font-medium">AI is checking your photo...</p>
                        <p className="text-white/70 text-[10px] mt-1">This takes a few seconds</p>
                      </div>
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-2 p-4">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                      <p className="text-xs text-white text-center">{file.error}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => retryUpload(file.id)}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs text-white"
                        >
                          Retry
                        </button>
                        <button
                          onClick={() => removeFailedUpload(file.id)}
                          className="px-3 py-1 bg-red-500/50 hover:bg-red-500/70 rounded-full text-xs text-white"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {file.status !== 'error' && (
                    <button
                      onClick={() => removeFailedUpload(file.id)}
                      disabled={file.status === 'uploading' || file.status === 'validating'}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors disabled:opacity-50 z-10"
                      aria-label="Remove photo"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add more slot */}
              {canAddMore && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={hasUploading}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors bg-surface/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add more</span>
                </button>
              )}
            </div>
          )}

          {/* Drop zone (when no photos) */}
          {totalCount === 0 && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-2xl border-2 border-dashed p-8
                transition-all duration-300 ease-out
                ${dragActive
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-alt'
                }
              `}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Drop your photos here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB each</p>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            disabled={hasUploading}
          />

          {/* Photo tips */}
          <div className="bg-surface rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Tips for best results:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Selfies and Portrait shots work best</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Good lighting, minimal background clutter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Include different angles if possible</span>
              </li>
            </ul>
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-3 p-4 bg-surface-alt rounded-xl">
            <Shield className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Your privacy matters</p>
              <p>
                Your photos are stored securely and only used to generate outfit previews. You can
                delete them anytime from your settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-md mx-auto space-y-3">
          <Button
            onClick={() => {
              trackStepCompleted(ONBOARDING_STEPS.PHOTO_UPLOAD, {
                photo_count: formData.uploadedImages.length,
              });
              onNext();
            }}
            disabled={hasUploading || !hasPhotos}
            size="lg"
            className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 hover:scale-[1.01] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingFiles.some((f) => f.status === 'validating') ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Validating...
              </>
            ) : hasUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Continue'
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {hasPhotos ? (
              <>{formData.uploadedImages.length} photo{formData.uploadedImages.length !== 1 ? 's' : ''} uploaded</>
            ) : (
              <>Upload at least 1 photo to continue</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
