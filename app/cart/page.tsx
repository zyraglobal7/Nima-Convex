'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';

export default function CartPage() {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<Id<'cart_items'> | null>(null);
  const [updatingId, setUpdatingId] = useState<Id<'cart_items'> | null>(null);

  // Queries
  const cartItems = useQuery(api.cart.queries.getCart);
  const cartTotal = useQuery(api.cart.queries.getCartTotal);

  // Mutations
  const removeFromCart = useMutation(api.cart.mutations.removeFromCart);
  const updateQuantity = useMutation(api.cart.mutations.updateQuantity);
  const clearCart = useMutation(api.cart.mutations.clearCart);

  const handleRemoveItem = async (cartItemId: Id<'cart_items'>) => {
    setRemovingId(cartItemId);
    try {
      const result = await removeFromCart({ cartItemId });
      if (result.success) {
        toast.success('Item removed from cart');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to remove item');
    } finally {
      setRemovingId(null);
    }
  };

  const handleUpdateQuantity = async (cartItemId: Id<'cart_items'>, newQuantity: number) => {
    setUpdatingId(cartItemId);
    try {
      const result = await updateQuantity({ cartItemId, quantity: newQuantity });
      if (!result.success) {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await clearCart({});
      if (result.success) {
        toast.success(`Removed ${result.itemsRemoved} items from cart`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  const isLoading = cartItems === undefined || cartTotal === undefined;
  const isEmpty = !isLoading && cartItems.length === 0;

  // Calculate Nima service fee (10%)
  const serviceFee = cartTotal ? Math.round(cartTotal.subtotal * 0.1) : 0;
  const estimatedShipping = 1500; // $15.00 in cents - placeholder
  const total = cartTotal ? cartTotal.subtotal + serviceFee + estimatedShipping : 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-surface-alt transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <h1 className="text-lg font-semibold text-foreground">Your Cart</h1>

          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading your cart...</p>
          </div>
        )}

        {/* Empty State */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Discover amazing items and try them on virtually before adding to your cart.
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Start Discovering
            </Link>
          </motion.div>
        )}

        {/* Cart Items */}
        {!isLoading && cartItems.length > 0 && (
          <div className="space-y-6">
            {/* Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-foreground">
                  {cartTotal?.itemCount} {cartTotal?.itemCount === 1 ? 'item' : 'items'}
                </h2>
                <button
                  onClick={handleClearCart}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              </div>

              <AnimatePresence mode="popLayout">
                {cartItems.map((cartItem) => (
                  <motion.div
                    key={cartItem._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="flex gap-4 p-4 bg-surface rounded-2xl border border-border"
                  >
                    {/* Image */}
                    <Link
                      href={`/product/${cartItem.itemId}`}
                      className="relative w-24 h-32 rounded-xl overflow-hidden bg-surface-alt flex-shrink-0"
                    >
                      {cartItem.imageUrl ? (
                        <Image
                          src={cartItem.imageUrl}
                          alt={cartItem.item.name}
                          fill
                          unoptimized={
                            cartItem.imageUrl.includes('convex.cloud') ||
                            cartItem.imageUrl.includes('convex.site')
                          }
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </Link>

                    {/* Details */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1">
                        {cartItem.item.brand && (
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            {cartItem.item.brand}
                          </p>
                        )}
                        <Link href={`/product/${cartItem.itemId}`}>
                          <h3 className="font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">
                            {cartItem.item.name}
                          </h3>
                        </Link>

                        {/* Selected options */}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {cartItem.selectedSize && (
                            <span className="text-xs px-2 py-0.5 bg-surface-alt rounded-full text-muted-foreground">
                              Size: {cartItem.selectedSize}
                            </span>
                          )}
                          {cartItem.selectedColor && (
                            <span className="text-xs px-2 py-0.5 bg-surface-alt rounded-full text-muted-foreground">
                              Color: {cartItem.selectedColor}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="font-semibold text-foreground">
                            {formatPrice(cartItem.item.price * cartItem.quantity, cartItem.item.currency)}
                          </span>
                          {cartItem.quantity > 1 && (
                            <span className="text-xs text-muted-foreground">
                              ({formatPrice(cartItem.item.price, cartItem.item.currency)} each)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(cartItem._id, cartItem.quantity - 1)}
                            disabled={updatingId === cartItem._id}
                            className="w-8 h-8 rounded-lg bg-surface-alt hover:bg-border flex items-center justify-center transition-colors disabled:opacity-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {updatingId === cartItem._id ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              cartItem.quantity
                            )}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(cartItem._id, cartItem.quantity + 1)}
                            disabled={updatingId === cartItem._id}
                            className="w-8 h-8 rounded-lg bg-surface-alt hover:bg-border flex items-center justify-center transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(cartItem._id)}
                          disabled={removingId === cartItem._id}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        >
                          {removingId === cartItem._id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Nima Delivers Info */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Nima Delivers</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We handle everything! Nima purchases items from multiple stores and delivers them
                    straight to you in one package.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
              <h3 className="font-medium text-foreground">Order Summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">
                    {formatPrice(cartTotal?.subtotal || 0, cartTotal?.currency || 'USD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nima Service Fee (10%)</span>
                  <span className="text-foreground">
                    {formatPrice(serviceFee, cartTotal?.currency || 'USD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Shipping</span>
                  <span className="text-foreground">
                    {formatPrice(estimatedShipping, cartTotal?.currency || 'USD')}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-semibold text-lg text-foreground">
                    {formatPrice(total, cartTotal?.currency || 'USD')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Checkout Bar */}
      {!isLoading && cartItems && cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Proceed to Checkout
              <span className="text-primary-foreground/80">
                ({formatPrice(total, cartTotal?.currency || 'USD')})
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4 z-30">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-xs text-muted-foreground">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-xs text-muted-foreground">Lookbooks</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

