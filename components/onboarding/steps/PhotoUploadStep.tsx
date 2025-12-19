'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { StepProps, UploadedImage } from '../types';
import { ArrowLeft, Upload, X, Camera, Shield, Loader2, AlertCircle } from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';

// Constants for validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_PHOTOS = 4;

interface UploadingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'error';
  error?: string;
  progress?: number;
}

export function PhotoUploadStep({ formData, updateFormData, onNext, onBack }: StepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex mutations
  const generateUploadUrl = useMutation(api.userImages.mutations.generateOnboardingUploadUrl);
  const saveImage = useMutation(api.userImages.mutations.saveOnboardingImage);
  const deleteImage = useMutation(api.userImages.mutations.deleteOnboardingImage);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (file: File, _tempId: string): Promise<UploadedImage | null> => {
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
          imageType: 'full_body', // Default for onboarding
        });

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
    [formData.onboardingToken, generateUploadUrl, saveImage]
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
            // Replace temp preview URL with the actual one
            result.previewUrl = tempFile.previewUrl;
            uploadedResults.push(result);
          }
          // Remove from uploading state
          setUploadingFiles((prev) => prev.filter((f) => f.id !== tempFile.id));
        } catch {
          // Mark as error
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
      ;

      // Find and revoke the preview URL
      const image = formData.uploadedImages.find((img) => img.imageId === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

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

  const hasUploading = uploadingFiles.some((f) => f.status === 'uploading');
  const hasPhotos = formData.uploadedImages.length > 0;
  const totalCount = formData.uploadedImages.length + uploadingFiles.length;
  const canAddMore = totalCount < MAX_PHOTOS;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors duration-200"
              aria-label="Go back"
              disabled={hasUploading}
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                Now for the fun part!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload 2-4 photos so I can show you in every outfit
              </p>
            </div>
          </div>
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
              {/* Successfully uploaded images */}
              {formData.uploadedImages.map((image) => (
                <div
                  key={image.imageId}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface animate-in fade-in zoom-in duration-300"
                >
                  <Image
                    src={image.previewUrl}
                    alt={image.filename}
                    priority={true}
                    fill
                   
                    className="object-cover"
                  />
                  <button
                    onClick={() => removePhoto(image.imageId)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                    aria-label="Remove photo"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  {/* Success indicator */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500/90 rounded-full">
                    <span className="text-xs text-white font-medium">✓ Uploaded</span>
                  </div>
                </div>
              ))}

              {/* Uploading/failed images */}
              {uploadingFiles.map((file) => (
                <div
                  key={file.id}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface animate-in fade-in zoom-in duration-300"
                >
                  <Image
                    src={file.previewUrl}
                    alt={file.file.name}
                    fill
                  
                    className={`object-cover ${file.status === 'uploading' ? 'opacity-50' : ''}`}
                  />
                  
                  {file.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-2 p-4">
                      <AlertCircle className="w-8 h-8 text-red-400" />
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
                      disabled={file.status === 'uploading'}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors disabled:opacity-50"
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
            <p className="text-sm font-medium text-foreground">📸 Tips for best results:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Full body shots work best</span>
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
            onClick={onNext}
            disabled={hasUploading}
            size="lg"
            className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 hover:scale-[1.01] hover:shadow-lg disabled:opacity-50"
          >
            {hasUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : hasPhotos ? (
              'Continue'
            ) : (
              'Skip for now'
            )}
          </Button>
          {!hasPhotos && !hasUploading && (
            <p className="text-xs text-center text-muted-foreground">
              You can add photos later, but the magic happens when we can show <em>you</em>
            </p>
          )}
          {hasPhotos && (
            <p className="text-xs text-center text-muted-foreground">
              {formData.uploadedImages.length} photo{formData.uploadedImages.length !== 1 ? 's' : ''} uploaded
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
