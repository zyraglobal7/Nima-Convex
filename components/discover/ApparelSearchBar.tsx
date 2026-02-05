'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface ApparelSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function ApparelSearchBar({
    value,
    onChange,
    placeholder = "Search items..."
}: ApparelSearchBarProps) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Sync local value with external value
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounced onChange to avoid excessive updates while typing
    const handleInputChange = useCallback((newValue: string) => {
        setLocalValue(newValue);

        // Clear previous timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Set new debounced update
        debounceRef.current = setTimeout(() => {
            onChange(newValue);
        }, 300);
    }, [onChange]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const handleClear = useCallback(() => {
        setLocalValue('');
        onChange('');
        inputRef.current?.focus();
    }, [onChange]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4"
        >
            <div
                className={`
          relative flex items-center gap-2 
          bg-surface border rounded-xl px-4 py-3
          transition-all duration-300 ease-out
          ${isFocused
                        ? 'border-primary/50 shadow-sm shadow-primary/10'
                        : 'border-border/50 hover:border-border'
                    }
        `}
            >
                {/* Search icon */}
                <Search className={`
          w-5 h-5 flex-shrink-0 transition-colors duration-200
          ${isFocused ? 'text-primary' : 'text-muted-foreground'}
        `} />

                {/* Input field */}
                <input
                    ref={inputRef}
                    type="text"
                    value={localValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="
            flex-1 bg-transparent outline-none
            text-foreground text-sm
            placeholder:text-muted-foreground
          "
                />

                {/* Clear button */}
                {localValue && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        onClick={handleClear}
                        className="
              flex-shrink-0 p-1 rounded-full
              text-muted-foreground hover:text-foreground
              hover:bg-surface-alt
              transition-all duration-200
            "
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}
