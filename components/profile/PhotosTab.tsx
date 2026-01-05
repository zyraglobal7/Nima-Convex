'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';
import { Camera, Upload, Trash2, Star, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_PHOTOS = 4;

interface UploadingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'error';
  error?: string;
}

export function PhotosTab() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<Id<'user_images'> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState<Id<'user_images'> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const userImages = useQuery(api.userImages.queries.getUserImages);
  const imageCount = userImages?.length ?? 0;

  // Mutations
  const generateUploadUrl = useMutation(api.userImages.mutations.generateUploadUrl);
  const saveUserImage = useMutation(api.userImages.mutations.saveUserImage);
  const deleteUserImage = useMutation(api.userImages.mutations.deleteUserImage);
  const setPrimaryImage = useMutation(api.userImages.mutations.setPrimaryImage);

  // Validate a file
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
    async (file: File, tempId: string): Promise<void> => {
      try {
        // Generate upload URL
        const uploadUrl = await generateUploadUrl();

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
        await saveUserImage({
          storageId,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          imageType: 'full_body',
          isPrimary: imageCount === 0, // First image becomes primary
        });

        // Remove from uploading state
        setUploadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        toast.success('Photo uploaded successfully!');
      } catch (err) {
        console.error('Upload error:', err);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: 'error' as const, error: 'Upload failed' } : f
          )
        );
        toast.error('Failed to upload photo');
      }
    },
    [generateUploadUrl, saveUserImage, imageCount]
  );

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const totalCount = imageCount + uploadingFiles.length + files.length;
      if (totalCount > MAX_PHOTOS) {
        toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
        return;
      }

      const newUploads: UploadingFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validationError = validateFile(file);

        if (validationError) {
          toast.error(validationError);
          continue;
        }

        const tempId = `temp-${Date.now()}-${i}`;
        const previewUrl = URL.createObjectURL(file);

        newUploads.push({
          id: tempId,
          file,
          previewUrl,
          status: 'uploading',
        });
      }

      if (newUploads.length > 0) {
        setUploadingFiles((prev) => [...prev, ...newUploads]);

        // Upload all files
        for (const upload of newUploads) {
          uploadFile(upload.file, upload.id);
        }
      }
    },
    [imageCount, uploadingFiles.length, uploadFile]
  );

  // Drag handlers
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

  // Handle set as primary
  const handleSetPrimary = async (imageId: Id<'user_images'>) => {
    setIsSettingPrimary(imageId);
    try {
      await setPrimaryImage({ imageId });
      toast.success('Primary photo updated!');
    } catch (err) {
      console.error('Failed to set primary:', err);
      toast.error('Failed to set primary photo');
    } finally {
      setIsSettingPrimary(null);
    }
  };

  // Handle delete
  const handleDeleteClick = (imageId: Id<'user_images'>) => {
    setImageToDelete(imageId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUserImage({ imageId: imageToDelete });
      toast.success('Photo deleted');
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel uploading file
  const cancelUpload = (tempId: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.id === tempId);
      if (file) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.id !== tempId);
    });
  };

  const canUpload = imageCount + uploadingFiles.length < MAX_PHOTOS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-2">Your Photos</h3>
        <p className="text-sm text-muted-foreground">
          These photos are used for virtual try-on. The primary photo (marked with a star) is used by default.
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Existing photos */}
        <AnimatePresence mode="popLayout">
          {userImages?.map((image) => (
            <motion.div
              key={image._id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`
                relative aspect-[3/4] rounded-xl overflow-hidden group
                border-2 transition-colors
                ${image.isPrimary 
                  ? 'border-primary shadow-lg' 
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              {/* Image */}
              {image.url && (
                <Image
                  src={image.url}
                  alt="Your photo"
                  fill
                  className="object-cover"
                  unoptimized={image.url.includes('convex.cloud') || image.url.includes('convex.site')}
                />
              )}

              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
                  <Star className="w-3 h-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Image type label */}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs capitalize">
                {image.imageType.replace('_', ' ')}
              </div>

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(image._id)}
                    disabled={isSettingPrimary === image._id}
                    className="gap-1"
                  >
                    {isSettingPrimary === image._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                    Set Primary
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteClick(image._id)}
                  className="gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </motion.div>
          ))}

          {/* Uploading photos */}
          {uploadingFiles.map((upload) => (
            <motion.div
              key={upload.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-primary/50"
            >
              <Image
                src={upload.previewUrl}
                alt="Uploading"
                fill
                className="object-cover opacity-50"
              />

              {/* Upload status overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                {upload.status === 'uploading' ? (
                  <>
                    <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                    <span className="text-white text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                    <span className="text-white text-sm">{upload.error}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelUpload(upload.id)}
                      className="mt-2 text-white"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Upload zone */}
        {canUpload && (
          <motion.div
            layout
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              aspect-[3/4] rounded-xl border-2 border-dashed cursor-pointer
              flex flex-col items-center justify-center gap-3
              transition-colors
              ${dragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50 hover:bg-surface-alt'
              }
            `}
          >
            <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Add Photo</p>
              <p className="text-xs text-muted-foreground mt-1">
                {MAX_PHOTOS - imageCount - uploadingFiles.length} slots remaining
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Tips */}
      <div className="p-4 bg-surface rounded-xl border border-border">
        <div className="flex items-start gap-3">
          <Camera className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-foreground">Photo Tips</h4>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              <li>• Use full-body photos for best try-on results</li>
              <li>• Good lighting helps AI generate better images</li>
              <li>• Neutral backgrounds work best</li>
              <li>• Maximum 4 photos, 10MB each (JPG/PNG)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The photo will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

