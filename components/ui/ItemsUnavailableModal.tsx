'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ItemsUnavailableModalProps {
  open: boolean;
  onClose: () => void;
  onGoBack?: () => void;
  unavailableCount: number;
  totalCount: number;
}

export function ItemsUnavailableModal({ 
  open, 
  onClose, 
  onGoBack,
  unavailableCount, 
  totalCount 
}: ItemsUnavailableModalProps) {
  const availableCount = totalCount - unavailableCount;
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
            <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl">Some Items Unavailable</DialogTitle>
          <DialogDescription className="text-base">
            {unavailableCount} of {totalCount} items in this look {unavailableCount === 1 ? 'is' : 'are'} no longer available.
            {availableCount > 0 && ' You can still browse the available items.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          {onGoBack && (
            <Button 
              variant="outline" 
              onClick={onGoBack}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
          )}
          <Button 
            onClick={onClose} 
            className="w-full sm:w-auto"
          >
            {availableCount > 0 ? 'View Available Items' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



