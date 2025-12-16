'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';

interface CreateLookbookModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateLookbookModal({ isOpen, onClose }: CreateLookbookModalProps) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const createLookbook = useMutation(api.lookbooks.mutations.createLookbook);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            const lookbookId = await createLookbook({
                name: name.trim(),
                description: description.trim() || undefined,
                isPublic,
            });

            // Reset form
            setName('');
            setDescription('');
            setIsPublic(false);
            onClose();

            // Navigate to the new lookbook
            router.push(`/lookbooks/${lookbookId}`);
        } catch (error) {
            console.error('Failed to create lookbook:', error);
            alert('Failed to create lookbook. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        if (!isCreating) {
            setName('');
            setDescription('');
            setIsPublic(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-primary-foreground" />
                        </div>
                        Create New Lookbook
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Summer Vacation, Work Mode, Date Night"
                            disabled={isCreating}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this lookbook for?"
                            rows={3}
                            disabled={isCreating}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/30">
                        <div className="space-y-0.5">
                            <Label htmlFor="public" className="text-sm font-medium">
                                Make this lookbook public
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Anyone can view and discover your lookbook
                            </p>
                        </div>
                        <Switch
                            id="public"
                            checked={isPublic}
                            onCheckedChange={setIsPublic}
                            disabled={isCreating}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isCreating}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || isCreating}
                            className="flex-1"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Lookbook'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

