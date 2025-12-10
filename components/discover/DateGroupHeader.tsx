'use client';

import { motion } from 'framer-motion';

interface DateGroupHeaderProps {
  label: string;
  index: number;
}

export function DateGroupHeader({ label, index }: DateGroupHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="col-span-full py-4"
    >
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </h3>
        <div className="flex-1 h-px bg-border/50" />
      </div>
    </motion.div>
  );
}

