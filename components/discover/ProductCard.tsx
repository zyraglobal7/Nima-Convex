'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ExternalLink, ShoppingCart, Check, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils/format';
import Image from 'next/image';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  index: number;
  showAddToCart?: boolean;
}

export function ProductCard({ product, index, showAddToCart = true }: ProductCardProps) {
  const router = useRouter();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  
  const addToCart = useMutation(api.cart.mutations.addToCart);
  
  const handleCardClick = () => {
    router.push(`/product/${product.id}`);
  };
  
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (addedToCart || isAddingToCart) return;
    
    setIsAddingToCart(true);
    try {
      const result = await addToCart({ itemId: product.id as Id<'items'> });
      if (result.success) {
        setAddedToCart(true);
        toast.success('Added to cart!');
        // Reset after 3 seconds
        setTimeout(() => setAddedToCart(false), 3000);
      } else {
        toast.error(result.message || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <div 
        onClick={handleCardClick}
        className="flex gap-4 p-4 bg-surface rounded-xl border border-border/30 hover:border-primary/30 transition-all duration-300 cursor-pointer"
      >
        {/* Product image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-alt relative">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized={product.imageUrl.includes('convex.cloud') || product.imageUrl.includes('convex.site')}
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

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {/* Add to cart button */}
            {showAddToCart && (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || addedToCart}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                  addedToCart
                    ? 'bg-green-600 text-white'
                    : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                } disabled:opacity-70`}
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : addedToCart ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3 h-3" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            )}
            
            {/* Store link */}
            <a
              href={product.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-alt hover:bg-border/50 text-muted-foreground hover:text-foreground rounded-full text-xs font-medium transition-colors duration-200"
            >
              <span>View at {product.storeName}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

