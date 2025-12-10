'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  MapPin, 
  Phone, 
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Info,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatPrice, type Product } from '@/lib/mock-data';
import type { FittingLook } from '@/lib/mock-chat-data';

interface CartItem {
  product: Product;
  quantity: number;
  lookId: string;
  lookName: string;
}

interface BuyWithNimaSheetProps {
  isOpen: boolean;
  onClose: () => void;
  looks: FittingLook[];
  currency?: string;
}

type CheckoutStep = 'cart' | 'address' | 'payment' | 'success';

// Nima Concierge fee (10% of subtotal, min 500 KES)
const CONCIERGE_FEE_PERCENTAGE = 0.10;
const MIN_CONCIERGE_FEE = 500;

export function BuyWithNimaSheet({
  isOpen,
  onClose,
  looks,
  currency = 'KES',
}: BuyWithNimaSheetProps) {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    notes: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate totals
  const { subtotal, conciergeFee, total } = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const fee = Math.max(sub * CONCIERGE_FEE_PERCENTAGE, cart.length > 0 ? MIN_CONCIERGE_FEE : 0);
    return {
      subtotal: sub,
      conciergeFee: fee,
      total: sub + fee,
    };
  }, [cart]);

  // Add item to cart
  const addToCart = (product: Product, lookId: string, lookName: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, lookId, lookName }];
    });
  };

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove item
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Check if product is in cart
  const isInCart = (productId: string) => cart.some((item) => item.product.id === productId);
  const getCartQuantity = (productId: string) => cart.find((item) => item.product.id === productId)?.quantity || 0;

  // Handle checkout
  const handleCheckout = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setStep('success');
  };

  // Reset and close
  const handleClose = () => {
    setStep('cart');
    onClose();
  };

  // Add all items from a look
  const addAllFromLook = (look: FittingLook) => {
    look.products.forEach((product) => {
      if (!isInCart(product.id)) {
        addToCart(product, look.id, look.styleTags.join(' & '));
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] rounded-t-3xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {step !== 'cart' && step !== 'success' && (
              <button
                onClick={() => setStep(step === 'payment' ? 'address' : 'cart')}
                className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <SheetTitle className="text-lg font-serif">
                {step === 'cart' && 'Buy With Nima'}
                {step === 'address' && 'Delivery Details'}
                {step === 'payment' && 'Payment'}
                {step === 'success' && 'Order Confirmed!'}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Cart Step */}
            {step === 'cart' && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 space-y-6"
              >
                {/* Info banner */}
                <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Nima Concierge Service</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Skip the hassle of buying from multiple stores. We'll purchase everything for you and deliver it straight to your door. A small concierge fee applies.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Looks with products */}
                {looks.map((look, lookIndex) => (
                  <div key={look.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">
                        Look {lookIndex + 1}: {look.styleTags.slice(0, 2).join(' & ')}
                      </h3>
                      <button
                        onClick={() => addAllFromLook(look)}
                        className="text-xs text-primary hover:text-primary-hover transition-colors"
                      >
                        Add all
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {look.products.map((product) => {
                        const inCart = isInCart(product.id);
                        const qty = getCartQuantity(product.id);
                        
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                              inCart 
                                ? 'bg-primary/5 border-primary/30' 
                                : 'bg-surface border-border/30'
                            }`}
                          >
                            {/* Image */}
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{product.brand}</p>
                              <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                              <p className="text-sm text-secondary font-medium">
                                {formatPrice(product.price, currency)}
                              </p>
                            </div>

                            {/* Actions */}
                            {inCart ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(product.id, -1)}
                                  className="w-8 h-8 rounded-full bg-surface border border-border/50 flex items-center justify-center hover:bg-surface-alt transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-6 text-center font-medium">{qty}</span>
                                <button
                                  onClick={() => updateQuantity(product.id, 1)}
                                  className="w-8 h-8 rounded-full bg-surface border border-border/50 flex items-center justify-center hover:bg-surface-alt transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(product, look.id, look.styleTags.join(' & '))}
                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary-hover transition-colors"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Address Step */}
            {step === 'address' && (
              <motion.div
                key="address"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 space-y-4"
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full h-12 px-4 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={address.phone}
                        onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                        placeholder="+254 700 000 000"
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Street Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                      <textarea
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        placeholder="Apartment, building, street name"
                        rows={2}
                        className="w-full px-4 pl-11 py-3 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="Nairobi"
                      className="w-full h-12 px-4 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Delivery Notes (Optional)</label>
                    <textarea
                      value={address.notes}
                      onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                      placeholder="Any special instructions for delivery"
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 space-y-6"
              >
                {/* Order Summary */}
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">Order Summary</h3>
                  
                  <div className="p-4 bg-surface rounded-xl border border-border/30 space-y-3">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{item.quantity}x</span>
                          <span className="text-foreground truncate max-w-[180px]">{item.product.name}</span>
                        </div>
                        <span className="text-foreground font-medium">
                          {formatPrice(item.product.price * item.quantity, currency)}
                        </span>
                      </div>
                    ))}
                    
                    <div className="border-t border-border/30 pt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground">{formatPrice(subtotal, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Nima Concierge Fee</span>
                          <button className="text-muted-foreground hover:text-foreground">
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-foreground">{formatPrice(conciergeFee, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-border/30">
                        <span className="text-foreground">Total</span>
                        <span className="text-primary">{formatPrice(total, currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Preview */}
                <div className="p-4 bg-surface rounded-xl border border-border/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{address.name}</p>
                      <p className="text-sm text-muted-foreground">{address.phone}</p>
                      <p className="text-sm text-muted-foreground mt-1">{address.street}</p>
                      <p className="text-sm text-muted-foreground">{address.city}</p>
                    </div>
                    <button
                      onClick={() => setStep('address')}
                      className="text-xs text-primary hover:text-primary-hover"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Concierge info */}
                <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">About the Concierge Fee:</span> This covers Nima purchasing items from multiple stores on your behalf, quality checking, consolidating, and delivering to you. You save time and get everything in one delivery!
                  </p>
                </div>
              </motion.div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
                </motion.div>

                <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                  Order Confirmed! 🎉
                </h2>
                <p className="text-muted-foreground mb-8">
                  Order #{Date.now().toString().slice(-6)}
                </p>

                {/* Nima message */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full max-w-sm"
                >
                  <div className="relative bg-surface/95 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Nima says</p>
                        <p className="text-sm text-foreground leading-relaxed">
                          I'm on it! 💫 I'll purchase all your items and have everything delivered to you soon. Sit back, relax, and get ready to look amazing!
                        </p>
                      </div>
                    </div>
                    <div 
                      className="absolute -bottom-2 left-8 w-4 h-4 bg-surface/95 border-b border-r border-border/50 transform rotate-45"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 space-y-3 w-full max-w-sm"
                >
                  <p className="text-xs text-muted-foreground">
                    You'll receive updates via SMS at {address.phone}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer with totals and CTA */}
        {step !== 'success' && (
          <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background">
            {cart.length > 0 && step === 'cart' && (
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-muted-foreground">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                <span className="font-semibold text-foreground">{formatPrice(total, currency)}</span>
              </div>
            )}
            
            <button
              onClick={() => {
                if (step === 'cart') setStep('address');
                else if (step === 'address') setStep('payment');
                else if (step === 'payment') handleCheckout();
              }}
              disabled={
                (step === 'cart' && cart.length === 0) ||
                (step === 'address' && (!address.name || !address.phone || !address.street || !address.city)) ||
                isProcessing
              }
              className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : step === 'cart' ? (
                <>
                  Continue to Delivery
                  <ChevronRight className="w-5 h-5" />
                </>
              ) : step === 'address' ? (
                <>
                  Continue to Payment
                  <ChevronRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  Pay {formatPrice(total, currency)} with M-Pesa
                </>
              )}
            </button>

            {step === 'cart' && cart.length === 0 && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Add items from the looks above to continue
              </p>
            )}
          </div>
        )}

        {/* Success footer */}
        {step === 'success' && (
          <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background">
            <button
              onClick={handleClose}
              className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full font-medium transition-all duration-300"
            >
              Done
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

