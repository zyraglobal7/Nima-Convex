'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Camera, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageUpload?: (file: File) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  isUploadingImage?: boolean;
}

export function ChatInput({
  onSend,
  onImageUpload,
  disabled = false,
  placeholder = "Type your message...",
  className = '',
  isUploadingImage = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<{ file: File; url: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 4 lines approx
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage.url);
      }
    };
  }, [previewImage]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Cleanup previous preview
      if (previewImage) {
        URL.revokeObjectURL(previewImage.url);
      }
      const url = URL.createObjectURL(file);
      setPreviewImage({ file, url });
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage.url);
      setPreviewImage(null);
    }
  };

  const handleSendImage = async () => {
    if (previewImage && onImageUpload && !isUploadingImage) {
      await onImageUpload(previewImage.file);
      URL.revokeObjectURL(previewImage.url);
      setPreviewImage(null);
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim().length > 0 && !disabled;
  const canSendImage = previewImage && !isUploadingImage && !disabled;

  return (
    <div className={`relative ${className}`}>
      {/* Image preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 relative inline-block"
          >
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border/50 shadow-md">
              <Image
                src={previewImage.url}
                alt="Upload preview"
                fill
                className="object-cover"
              />
              {/* Loading overlay */}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            {/* Remove button */}
            {!isUploadingImage && (
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2 p-3 bg-surface/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg">
        {/* Image upload button */}
        {onImageUpload && !previewImage && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={disabled}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-surface-alt text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Search by image"
            >
              <Camera className="w-5 h-5" />
            </motion.button>
          </>
        )}

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={previewImage ? "Add a message or search by this image..." : placeholder}
          disabled={disabled || isUploadingImage}
          rows={1}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-base leading-relaxed min-h-[24px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Send button - handles both text and image */}
        <motion.button
          whileHover={canSend || canSendImage ? { scale: 1.05 } : {}}
          whileTap={canSend || canSendImage ? { scale: 0.95 } : {}}
          onClick={previewImage ? handleSendImage : handleSend}
          disabled={!(canSend || canSendImage)}
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-200
            ${canSend || canSendImage
              ? 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-md'
              : 'bg-surface-alt text-muted-foreground cursor-not-allowed'
            }
          `}
        >
          {disabled || isUploadingImage ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : previewImage ? (
            <ImageIcon className="w-5 h-5" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* Character count for long messages */}
      {message.length > 200 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-6 right-2 text-xs text-muted-foreground"
        >
          {message.length}/500
        </motion.div>
      )}
    </div>
  );
}

