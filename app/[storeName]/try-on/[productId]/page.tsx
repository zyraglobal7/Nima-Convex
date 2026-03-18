'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Upload, X, Zap, SwitchCamera, RotateCcw, Download, Store } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ storeName: string; productId: string }>;
}

type PageState = 'landing' | 'camera' | 'upload' | 'preview' | 'processing' | 'result' | 'error' | 'no_credits';

export default function SellerTryOnPage({ params }: PageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ storeName: string; productId: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [pageState, setPageState] = useState<PageState>('landing');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [sellerTryOnId, setSellerTryOnId] = useState<Id<'seller_try_ons'> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('camera');

  const generateUploadUrl = useMutation(api.sellerTryOns.mutations.generateCustomerUploadUrl);
  const createSellerTryOn = useMutation(api.sellerTryOns.mutations.createSellerTryOn);

  const sellerAndItem = useQuery(
    api.sellerTryOns.queries.getSellerAndItemForTryOn,
    resolvedParams
      ? { sellerSlug: resolvedParams.storeName, itemId: resolvedParams.productId as Id<'items'> }
      : 'skip'
  );

  const tryOnResult = useQuery(
    api.sellerTryOns.queries.getSellerTryOn,
    sellerTryOnId ? { sellerTryOnId } : 'skip'
  );

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      toast.error('Could not access camera. You can upload a photo instead.');
      setInputMode('upload');
      setPageState('landing');
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleOpenCamera = async () => {
    setPageState('camera');
    await startCamera(facingMode);
  };

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
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setCameraActive(false);
      },
      'image/jpeg',
      0.85
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setCapturedPreview(result);
      setCapturedBlob(file);
      setPageState('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = async () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    if (inputMode === 'camera') {
      setPageState('camera');
      await startCamera(facingMode);
    } else {
      setPageState('landing');
    }
  };

  const handleTryOn = async () => {
    if (!capturedBlob || !sellerAndItem) return;

    if (sellerAndItem.seller.tryOnCredits <= 0) {
      setPageState('no_credits');
      return;
    }

    setPageState('processing');

    try {
      const uploadUrl = await generateUploadUrl({ sellerId: sellerAndItem.seller._id });

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: capturedBlob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!response.ok) throw new Error('Upload failed');

      const { storageId } = await response.json();

      const result = await createSellerTryOn({
        sellerId: sellerAndItem.seller._id,
        itemId: sellerAndItem.item._id,
        customerImageStorageId: storageId,
      });

      if (!result.success) {
        if (result.error === 'no_seller_credits') {
          setPageState('no_credits');
          return;
        }
        throw new Error(result.error);
      }

      setSellerTryOnId(result.sellerTryOnId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
      setPageState('preview');
    }
  };

  const handleReset = () => {
    setSellerTryOnId(null);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setPageState('landing');
  };

  const handleDownload = () => {
    if (!tryOnResult?.resultUrl) return;
    const a = document.createElement('a');
    a.href = tryOnResult.resultUrl;
    a.download = 'try-on.png';
    a.click();
  };

  if (sellerAndItem === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (sellerAndItem === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Store className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Product not found</h1>
        <p className="text-muted-foreground text-sm">This try-on link is invalid or has expired.</p>
      </div>
    );
  }

  const { seller, item } = sellerAndItem;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Store Header */}
      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {seller.logoUrl ? (
            <Image
              src={seller.logoUrl}
              alt={seller.shopName}
              width={40}
              height={40}
              unoptimized
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="font-serif font-semibold text-foreground">{seller.shopName}</h1>
            <p className="text-xs text-muted-foreground">Virtual Try-On</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Product Card */}
        <div className="flex gap-4 items-start bg-surface rounded-xl p-4 border border-border">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                width={80}
                height={80}
                unoptimized={item.imageUrl.includes('convex')}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-medium text-foreground">{item.name}</h2>
            {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
            <p className="text-sm font-medium text-primary mt-1">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: item.currency || 'KES',
                minimumFractionDigits: 0,
              }).format(item.price)}
            </p>
          </div>
        </div>

        {/* Camera View */}
        {pageState === 'camera' && (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn('w-full h-full object-cover', facingMode === 'user' && 'scale-x-[-1]')}
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={handleSwitchCamera}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                onClick={handleCapture}
                className="w-16 h-16 rounded-full bg-white border-4 border-white/40 active:scale-95 transition-transform"
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {pageState === 'preview' && capturedPreview && (
          <div className="relative rounded-xl overflow-hidden aspect-[3/4]">
            <Image src={capturedPreview} alt="Your photo" fill className="object-cover" unoptimized />
          </div>
        )}

        {/* Processing */}
        {pageState === 'processing' && (
          <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-spin border-t-transparent" />
            </div>
            <div>
              <p className="font-medium text-foreground text-lg">Generating your try-on...</p>
              <p className="text-sm text-muted-foreground mt-1">Usually takes 15–30 seconds</p>
            </div>
          </div>
        )}

        {/* Result */}
        {pageState === 'result' && tryOnResult?.resultUrl && (
          <div className="relative rounded-xl overflow-hidden aspect-[3/4]">
            <Image src={tryOnResult.resultUrl} alt="Try-on result" fill className="object-cover" unoptimized />
          </div>
        )}

        {/* Error */}
        {pageState === 'error' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <X className="w-10 h-10 text-destructive" />
            <p className="text-muted-foreground text-sm">
              {tryOnResult?.errorMessage ?? 'Generation failed. Please try again.'}
            </p>
          </div>
        )}

        {/* No Credits */}
        {pageState === 'no_credits' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Zap className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Try-on unavailable</p>
              <p className="text-muted-foreground text-sm mt-1">
                This store has run out of try-on credits. Please contact the store.
              </p>
            </div>
          </div>
        )}

        {/* Hidden canvas and file input */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {pageState === 'landing' && (
            <>
              <p className="text-sm text-center text-muted-foreground">
                Take a photo or upload one to see how this item looks on you
              </p>
              <Button
                onClick={handleOpenCamera}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                <Camera className="w-4 h-4 mr-2" />
                Open Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </>
          )}

          {pageState === 'preview' && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetake} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={handleTryOn}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="w-4 h-4 mr-2" />
                Try It On
              </Button>
            </div>
          )}

          {pageState === 'result' && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={handleDownload}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Save Photo
              </Button>
            </div>
          )}

          {(pageState === 'error' || pageState === 'no_credits') && (
            <Button variant="outline" onClick={handleReset} className="w-full">
              Start Over
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
