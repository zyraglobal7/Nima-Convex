'use client';

import { useState, useRef } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Drawer as DrawerPrimitive } from 'vaul';
import { X, Camera, Layers, CheckCircle2, AlertCircle, Loader2, ScanLine } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type UploadSource = 'single_upload' | 'closet_scan';
type UploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface WardrobeUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSource?: UploadSource;
}

export function WardrobeUploadSheet({ open, onOpenChange, defaultSource }: WardrobeUploadSheetProps) {
  const [source, setSource] = useState<UploadSource>(defaultSource ?? 'single_upload');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [resultCount, setResultCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processWardrobeUpload = useAction(api.wardrobe.actions.processWardrobeUpload);
  const generateUploadUrl = useMutation(api.wardrobe.mutations.generateUploadUrl);

  const handleSelectSource = (s: UploadSource) => {
    setSource(s);
    setUploadState('idle');
    setResultCount(0);
    setErrorMsg('');
    // Trigger file picker immediately
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleTakePicture = () => {
    setSource('single_upload');
    setUploadState('idle');
    setResultCount(0);
    setErrorMsg('');
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    try {
      setUploadState('uploading');

      // 1. Get upload URL from Convex storage
      const uploadUrl = await generateUploadUrl();

      // 2. Upload raw image to Convex storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Image upload failed');
      const { storageId } = (await uploadRes.json()) as { storageId: Id<'_storage'> };

      // 3. Process with Gemini (background removal + tagging)
      setUploadState('processing');
      trackEvent('wardrobe_item_uploaded', { source });

      const result = await processWardrobeUpload({ storageId, source });

      if (source === 'closet_scan') {
        trackEvent('wardrobe_closet_scanned', { itemsIdentified: result.itemCount });
      }

      setResultCount(result.itemCount);
      setUploadState('done');
    } catch (err) {
      console.error('[Wardrobe] Upload error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setUploadState('error');
    }
  };

  const handleClose = () => {
    setUploadState('idle');
    setResultCount(0);
    setErrorMsg('');
    onOpenChange(false);
  };

  const handleRetry = () => {
    setUploadState('idle');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" />
        <DrawerPrimitive.Content className="fixed bottom-0 left-0 right-0 z-[201] flex flex-col bg-background border-t border-border rounded-t-3xl overflow-hidden">
          <DrawerPrimitive.Title className="sr-only">Add to wardrobe</DrawerPrimitive.Title>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h2 className="text-base font-semibold text-text-primary">Add to Wardrobe</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-surface transition-colors text-text-secondary"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-6">
            {uploadState === 'idle' && (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary text-center mb-6">
                  How would you like to add items to your wardrobe?
                </p>
                <button
                  onClick={() => handleSelectSource('single_upload')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Upload an Item</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Upload a photo of one garment, shoe, or accessory
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectSource('closet_scan')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Scan My Closet</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Take a wide shot — Nima identifies each item automatically
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleTakePicture}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ScanLine className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Take a Picture</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Open your camera and snap the item directly
                    </p>
                  </div>
                </button>
              </div>
            )}

            {(uploadState === 'uploading' || uploadState === 'processing') && (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="font-medium text-text-primary">
                    {uploadState === 'uploading'
                      ? 'Uploading photo...'
                      : source === 'closet_scan'
                        ? 'Nima is scanning your closet...'
                        : 'Nima is identifying your items...'}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {uploadState === 'processing'
                      ? 'Isolating each item and removing backgrounds'
                      : 'Removing background and tagging style details'}
                  </p>
                </div>
              </div>
            )}

            {uploadState === 'done' && (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <div>
                  <p className="font-semibold text-text-primary text-lg">
                    {resultCount === 1
                      ? '1 item added to your wardrobe'
                      : `${resultCount} items added to your wardrobe`}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Nima will include these in your next outfit recommendations.
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => { setUploadState('idle'); }}
                    className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-text-primary hover:bg-surface transition-colors"
                  >
                    Add More
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {uploadState === 'error' && (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <div>
                  <p className="font-semibold text-text-primary">Something went wrong</p>
                  <p className="text-sm text-text-secondary mt-1">{errorMsg || 'Please try again.'}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Hidden file input (gallery picker) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Hidden camera input (opens camera directly) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
