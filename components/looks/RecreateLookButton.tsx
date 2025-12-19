'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';

interface RecreateLookButtonProps {
  lookId: Id<'looks'>;
  creatorUserId?: Id<'users'>;
  currentUserId?: Id<'users'>;
}

export function RecreateLookButton({
  lookId,
  creatorUserId,
  currentUserId,
}: RecreateLookButtonProps) {
  const router = useRouter();
  const [isRecreating, setIsRecreating] = useState(false);
  const recreateLook = useMutation(api.looks.mutations.recreateLook);

  // Only show button if user is not the creator
  if (creatorUserId && currentUserId && creatorUserId === currentUserId) {
    return null;
  }

  const handleRecreate = async () => {
    setIsRecreating(true);
    try {
      const result = await recreateLook({ lookId });
      if (result.success && result.lookId && result.publicId) {
        toast.success('Look recreated! Generating your personalized version...');
        // Navigate to the new look
        router.push(`/look/${result.lookId}`);
      } else {
        toast.error(result.error || 'Failed to recreate look');
      }
    } catch (error) {
      console.error('Failed to recreate look:', error);
      toast.error('Failed to recreate look');
    } finally {
      setIsRecreating(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleRecreate}
      disabled={isRecreating}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200
        bg-surface hover:bg-surface-alt border-2 border-border/50 hover:border-primary/30
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isRecreating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-foreground">Recreating...</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
          <span className="text-foreground">Recreate Look</span>
        </>
      )}
    </motion.button>
  );
}

