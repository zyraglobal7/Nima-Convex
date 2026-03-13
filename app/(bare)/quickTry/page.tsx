'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, SwitchCamera, X, Zap, RotateCcw, BookmarkPlus, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type PageState = 'camera' | 'preview' | 'processing' | 'result' | 'error';

export default function QuickTryPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [pageState, setPageState] = useState<PageState>('camera');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [quickTryOnId, setQuickTryOnId] = useState<Id<'quick_try_ons'> | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedToLookbook, setSavedToLookbook] = useState(false);

  const generateUploadUrl = useMutation(api.quickTryOns.mutations.generateQuickCaptureUploadUrl);
  const createQuickTryOn = useMutation(api.quickTryOns.mutations.createQuickTryOn);
  const saveToLookbook = useMutation(api.quickTryOns.mutations.saveQuickTryOnToLookbook);
  const credits = useQuery(api.credits.queries.getUserCredits);

  // Poll for try-on status
  const tryOnResult = useQuery(
    api.quickTryOns.queries.getQuickTryOn,
    quickTryOnId ? { quickTryOnId } : 'skip'
  );

  // Handle result ready
  useEffect(() => {
    if (tryOnResult?.status === 'completed' && tryOnResult.resultUrl) {
      setPageState('result');
    } else if (tryOnResult?.status === 'failed') {
      setPageState('error');
      toast.error('Try-on failed. Please try again.');
    }
  }, [tryOnResult]);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg);
      toast.error('Could not access camera. Please check permissions.');
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSwitchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedPreview(canvas.toDataURL('image/jpeg', 0.85));
        setPageState('preview');

        // Stop camera stream to save battery
        streamRef.current?.getTracks().forEach((t) => t.stop());
      },
      'image/jpeg',
      0.85
    );
  };

  const handleRetake = async () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    setPageState('camera');
    await startCamera(facingMode);
  };

  const handleTryOn = async () => {
    if (!capturedBlob) return;

    if ((credits?.total ?? 0) < 1) {
      toast.error('Not enough credits. Visit the Credits page to get more.');
      router.push('/credits');
      return;
    }

    setPageState('processing');

    try {
      // 1. Get upload URL
      const uploadUrl = await generateUploadUrl();

      // 2. Upload captured image
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: capturedBlob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!response.ok) throw new Error('Upload failed');

      // Extract storage ID from response
      const { storageId } = await response.json();

      // 3. Create the quick try-on
      const result = await createQuickTryOn({ capturedItemStorageId: storageId });

      if (!result.success) {
        if (result.error === 'insufficient_credits') {
          toast.error('Not enough credits.');
          router.push('/credits');
          return;
        }
        if (result.error.includes('No primary photo')) {
          toast.error('Please add a profile photo first.');
          router.push('/profile');
          return;
        }
        throw new Error(result.error);
      }

      setQuickTryOnId(result.quickTryOnId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
      setPageState('preview');
    }
  };

  const handleReset = async () => {
    setQuickTryOnId(null);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setSavedToLookbook(false);
    setPageState('camera');
    await startCamera(facingMode);
  };

  const handleSaveToLookbook = async () => {
    if (!quickTryOnId || isSaving) return;
    setIsSaving(true);
    try {
      await saveToLookbook({ quickTryOnId });
      setSavedToLookbook(true);
      toast.success('Saved to Tried On Looks');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0B0A] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-area-inset-top pt-4 pb-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-white font-medium text-sm">Quick Try-On</span>
          {credits !== undefined && (
            <Link href="/credits" className="flex items-center gap-1 text-xs text-white/60 mt-0.5">
              <Zap className="w-3 h-3" />
              <span>{credits.total} credits</span>
            </Link>
          )}
        </div>

        {pageState === 'camera' && (
          <button
            onClick={handleSwitchCamera}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <SwitchCamera className="w-5 h-5 text-white" />
          </button>
        )}
        {pageState !== 'camera' && <div className="w-10" />}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col items-center">
        {/* Camera View */}
        {(pageState === 'camera') && (
          <div className="w-full flex-1 relative overflow-hidden">
            {cameraError ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
                <Camera className="w-12 h-12 text-white/40" />
                <p className="text-white/60 text-sm">{cameraError}</p>
                <Button
                  variant="outline"
                  onClick={() => startCamera(facingMode)}
                  className="border-white/20 text-white bg-transparent hover:bg-white/10"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    'w-full h-full object-cover',
                    facingMode === 'user' && 'scale-x-[-1]'
                  )}
                />
                {/* Overlay hint */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="border-2 border-white/30 rounded-2xl w-64 h-80 flex items-center justify-center">
                      <p className="text-white/50 text-xs text-center px-4">
                        Point at the item you want to try on
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview */}
        {pageState === 'preview' && capturedPreview && (
          <div className="w-full flex-1 relative">
            <Image
              src={capturedPreview}
              alt="Captured item"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {/* Processing State */}
        {pageState === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-spin border-t-transparent" />
            </div>
            <div>
              <p className="text-white font-medium text-lg">Generating your look...</p>
              <p className="text-white/50 text-sm mt-1">This takes about 15–30 seconds</p>
            </div>
          </div>
        )}

        {/* Result */}
        {pageState === 'result' && tryOnResult?.resultUrl && (
          <div className="w-full flex-1 relative">
            <Image
              src={tryOnResult.resultUrl}
              alt="Try-on result"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {/* Error */}
        {pageState === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <X className="w-12 h-12 text-destructive" />
            <p className="text-white/70">
              {tryOnResult?.errorMessage ?? 'Generation failed. Please try again.'}
            </p>
          </div>
        )}

        {/* Canvas (hidden) */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Actions */}
      <div className="px-6 pb-8 pt-4 flex flex-col gap-3">
        {pageState === 'camera' && !cameraError && (
          <button
            onClick={handleCapture}
            className="mx-auto w-16 h-16 rounded-full bg-white border-4 border-white/30 flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </button>
        )}

        {pageState === 'preview' && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRetake}
              className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={handleTryOn}
              className="flex-1 bg-primary text-white hover:bg-primary/90"
            >
              <Zap className="w-4 h-4 mr-2" />
              Try It On
            </Button>
          </div>
        )}

        {pageState === 'result' && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10"
            >
              <Camera className="w-4 h-4 mr-2" />
              Try Another
            </Button>
            <Button
              onClick={handleSaveToLookbook}
              disabled={isSaving || savedToLookbook}
              className="flex-1 bg-primary text-white hover:bg-primary/90 disabled:opacity-70"
            >
              <BookmarkPlus className="w-4 h-4 mr-2" />
              {savedToLookbook ? 'Saved!' : isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}

        {pageState === 'error' && (
          <Button
            onClick={handleReset}
            className="w-full bg-primary text-white hover:bg-primary/90"
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
