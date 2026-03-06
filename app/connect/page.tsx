'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState, useRef, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Loader2,
  Sparkles,
  UserCircle,
  UserPlus,
  RotateCcw,
  AlertCircle,
  Clock,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step =
  | 'loading'
  | 'landing'
  | 'upload'
  | 'processing'
  | 'result'
  | 'gate'
  | 'error'
  | 'expired';

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

function TryOnPlaceholder() {
  return (
    <div className="w-full aspect-[4/5] bg-surface rounded-lg flex flex-col items-center justify-center gap-3 border border-border">
      <Sparkles className="w-10 h-10 text-primary opacity-60" />
      <p className="text-sm text-text-secondary text-center px-4">
        See how it looks on you ✨
      </p>
    </div>
  );
}

// ─── Loading skeletons ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Processing animation ─────────────────────────────────────────────────────

function ProcessingView({ productImageUrl }: { productImageUrl: string }) {
  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="p-6 flex flex-col items-center gap-6">
        <div className="w-full aspect-[4/5] relative bg-surface rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-background to-surface animate-[shimmer_2s_infinite]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-text-primary">Generating your try-on…</p>
            <p className="text-xs text-text-secondary">This usually takes 20–40 seconds</p>
          </div>
        </div>
        <div className="w-full h-40 rounded-lg overflow-hidden relative">
          <img src={productImageUrl} alt="Product" className="w-full h-full object-cover" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main widget inner component ──────────────────────────────────────────────

function ConnectWidgetInner() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session') ?? '';

  const sessionStatus = useQuery(
    api.connect.queries.getSessionStatus,
    sessionToken ? { sessionToken } : 'skip'
  );

  const [step, setStep] = useState<Step>('landing');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-advance to result/expired when Convex pushes an update
  const status = sessionStatus?.status;
  const prevStatusRef = useRef(status);
  if (prevStatusRef.current !== status) {
    prevStatusRef.current = status;
    if (status === 'completed' && step === 'processing') setStep('result');
    if (status === 'failed' && step === 'processing') setStep('error');
    if (status === 'expired') setStep('expired');
  }

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file.');
      return;
    }
    setUploading(true);
    setUploadError(null);

    try {
      // 1. Get upload URL from Convex storage (via our Connect API)
      const uploadUrlRes = await fetch(
        `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site') ?? ''}/api/v1/sessions/${sessionToken}/photo/url`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (!uploadUrlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl } = await uploadUrlRes.json();

      // 2. Upload file to Convex storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { storageId } = await uploadRes.json();

      // 3. Save guest photo
      await fetch(
        `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site') ?? ''}/api/v1/sessions/${sessionToken}/photo/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageId }),
        }
      );

      // 4. Trigger generation
      await fetch(
        `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site') ?? ''}/api/v1/sessions/${sessionToken}/generate`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );

      setStep('processing');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [sessionToken]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  // ── No session token ──
  if (!sessionToken) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Invalid Session</h2>
          <p className="text-sm text-text-secondary">No session token provided.</p>
        </CardContent>
      </Card>
    );
  }

  // ── Loading ──
  if (sessionStatus === undefined) return <LoadingSkeleton />;

  // ── Session not found ──
  if (sessionStatus === null) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Session Not Found</h2>
          <p className="text-sm text-text-secondary">This try-on session doesn&apos;t exist or has been removed.</p>
        </CardContent>
      </Card>
    );
  }

  const { productImageUrl, productName, partnerName, guestTryOnUsed, resultImageUrl } = sessionStatus;

  // ── Expired ──
  if (step === 'expired' || sessionStatus.status === 'expired') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <Clock className="w-10 h-10 text-text-secondary mx-auto" />
          <h2 className="text-lg font-semibold">Session Expired</h2>
          <p className="text-sm text-text-secondary">
            This try-on session has expired. Please start a new one from the partner&apos;s website.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Already completed (direct link) ──
  if (sessionStatus.status === 'completed' && step !== 'result' && step !== 'processing') {
    setStep('result');
  }

  // ── Processing ──
  if (step === 'processing' || sessionStatus.status === 'processing') {
    return <ProcessingView productImageUrl={productImageUrl} />;
  }

  // ── Result ──
  if (step === 'result' && resultImageUrl) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-serif">Your Virtual Try-On</h2>
            <Badge variant="outline" className="text-xs text-text-secondary">
              Powered by Nima ✨
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-secondary mb-2">Try-on Result</p>
              <div className="w-full aspect-[4/5] relative rounded-lg overflow-hidden">
                <img src={resultImageUrl} alt="Try-on result" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-2">Product</p>
              <div className="w-full aspect-[4/5] relative rounded-lg overflow-hidden">
                <img src={productImageUrl} alt={productName ?? 'Product'} className="w-full h-full object-cover" />
              </div>
              {productName && (
                <p className="text-sm font-medium mt-2 truncate">{productName}</p>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-lg p-4 text-center space-y-2 border border-border">
            <p className="text-sm font-medium">Save this look &amp; unlock unlimited try-ons</p>
            <p className="text-xs text-text-secondary">
              Create your free Nima account to save looks, try more items, and build your style profile.
            </p>
            <Button className="w-full mt-2" asChild>
              <a href="/sign-up" target="_blank" rel="noopener noreferrer">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Free Nima Account
              </a>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-text-secondary"
            onClick={() => setStep('upload')}
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Try a different photo
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Gate (guest already used their try-on) ──
  if (step === 'gate' || (guestTryOnUsed && step !== 'upload')) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <Sparkles className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-lg font-semibold font-serif">You&apos;ve used your free try-on!</h2>
          <p className="text-sm text-text-secondary">
            Create a Nima account to unlock unlimited virtual try-ons and save your looks.
          </p>
          <div className="space-y-2">
            <Button className="w-full" asChild>
              <a href="/sign-up" target="_blank" rel="noopener noreferrer">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Free Account
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={`/sign-in?redirect=/connect?session=${sessionToken}&linked=1`} target="_blank" rel="noopener noreferrer">
                <UserCircle className="w-4 h-4 mr-2" />
                Sign In
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Upload (guest path) ──
  if (step === 'upload') {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold font-serif">Upload Your Photo</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Full-body or upper-body photo works best
              </p>
            </div>
            <div className="w-14 h-14 relative rounded-md overflow-hidden shrink-0">
              <img src={productImageUrl} alt={productName ?? 'Product'} className="w-full h-full object-cover" />
            </div>
          </div>

          <div
            className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-text-secondary" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploading ? 'Uploading…' : 'Drop your photo here'}
              </p>
              <p className="text-xs text-text-secondary mt-1">or click to browse</p>
            </div>
            {uploadError && (
              <p className="text-xs text-destructive mt-1">{uploadError}</p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('landing')}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Error ──
  if (step === 'error' || sessionStatus.status === 'failed') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Generation Failed</h2>
          <p className="text-sm text-text-secondary">
            {sessionStatus.errorMessage ?? 'Something went wrong generating your try-on. Please try again.'}
          </p>
          <Button onClick={() => setStep('upload')}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Landing (default) ──
  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-serif font-semibold">Virtual Try-On</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Powered by Nima · via {partnerName}
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Try-On
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TryOnPlaceholder />
          <div className="w-full aspect-[4/5] relative rounded-lg overflow-hidden bg-surface">
            <img
              src={productImageUrl}
              alt={productName ?? 'Product'}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {productName && (
          <p className="text-sm font-medium truncate">{productName}</p>
        )}

        <div className="space-y-2">
          <Button
            className="w-full"
            asChild
          >
            <a href={`/sign-in?redirect=/connect?session=${sessionToken}&linked=1`} target="_blank" rel="noopener noreferrer">
              <UserCircle className="w-4 h-4 mr-2" />
              Connect Nima Account
            </a>
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (guestTryOnUsed) {
                setStep('gate');
              } else {
                setStep('upload');
              }
            }}
          >
            Continue as Guest
          </Button>

          <div className="text-center">
            <a
              href="/sign-up"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-secondary hover:text-primary underline underline-offset-2"
            >
              Don&apos;t have a Nima account? Create one free →
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page export (wrapped in Suspense for useSearchParams) ────────────────────

export default function ConnectPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ConnectWidgetInner />
    </Suspense>
  );
}
