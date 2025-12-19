'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { Product } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils/format';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <div className="flex gap-4 p-4 bg-surface rounded-xl border border-border/30 hover:border-primary/30 transition-all duration-300">
        {/* Product image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-alt relative">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">{product.brand}</p>
              <h4 className="font-medium text-foreground truncate">{product.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{product.color}</p>
            </div>
            <p className="text-sm font-semibold text-foreground whitespace-nowrap">
              {formatPrice(product.price, product.currency)}
            </p>
          </div>

          {/* Store link */}
          <a
            href={product.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors duration-200"
          >
            Shop at {product.storeName}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

