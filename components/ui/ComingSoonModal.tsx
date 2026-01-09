'use client';

import { ShoppingBag, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
}

export function ComingSoonModal({ open, onClose }: ComingSoonModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2 relative">
            <ShoppingBag className="w-7 h-7 text-primary" />
            <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1" />
          </div>
          <DialogTitle className="text-xl">Purchases Coming Soon</DialogTitle>
          <DialogDescription className="text-base">
            We&apos;re putting the finishing touches on our checkout experience. 
            You&apos;ll be able to buy this look very soon!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-2">
          <Button 
            onClick={onClose} 
            className="w-full sm:w-auto px-8"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




