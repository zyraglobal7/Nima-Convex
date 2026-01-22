'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Loader2,
  MapPin,
  CreditCard,
  Check,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';

interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });

  // Queries
  const cartItems = useQuery(api.cart.queries.getCart);
  const cartTotal = useQuery(api.cart.queries.getCartTotal);
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Mutations
  const createOrder = useMutation(api.orders.mutations.createOrder);

  const isLoading = cartItems === undefined || cartTotal === undefined;
  const isEmpty = !isLoading && cartItems.length === 0;

  // Calculate pricing
  const serviceFee = cartTotal ? Math.round(cartTotal.subtotal * 0.1) : 0;
  const estimatedShipping = 1500; // $15.00 in cents
  const total = cartTotal ? cartTotal.subtotal + serviceFee + estimatedShipping : 0;

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const isAddressValid = () => {
    return (
      address.fullName.trim() !== '' &&
      address.addressLine1.trim() !== '' &&
      address.city.trim() !== '' &&
      address.postalCode.trim() !== '' &&
      address.country.trim() !== '' &&
      address.phone.trim() !== ''
    );
  };

  const handlePlaceOrder = async () => {
    if (!isAddressValid()) {
      toast.error('Please fill in all required shipping fields');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Create the order in the database
      const result = await createOrder({
        shippingAddress: {
          fullName: address.fullName,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || undefined,
          city: address.city,
          state: address.state || undefined,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
      });

      setOrderPlaced(true);
      toast.success(`Order ${result.orderNumber} placed successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Order Success Screen
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Order Placed!</h1>
          <p className="text-muted-foreground mb-8">
            Thanks for your order! Our Nima Delivers team will start shopping for your items and
            deliver them to you soon.
          </p>
          <div className="space-y-3">
            <Link
              href="/discover"
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Continue Shopping
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-center gap-2 w-full py-3 bg-surface text-foreground rounded-xl font-medium hover:bg-surface-alt transition-colors border border-border"
            >
              View Profile
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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

          <h1 className="text-lg font-semibold text-foreground">Checkout</h1>

          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading checkout...</p>
          </div>
        )}

        {/* Empty Cart */}
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
            <p className="text-muted-foreground mb-6">Add some items to your cart to checkout.</p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Start Discovering
            </Link>
          </motion.div>
        )}

        {/* Checkout Form */}
        {!isLoading && cartItems && cartItems.length > 0 && (
          <div className="space-y-6">
            {/* Order Items Summary */}
            <div className="p-4 bg-surface rounded-2xl border border-border">
              <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Order Items ({cartTotal?.itemCount})
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex gap-3">
                    <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.item.name}
                          fill
                          unoptimized={
                            item.imageUrl.includes('convex.cloud') ||
                            item.imageUrl.includes('convex.site')
                          }
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.item.name}
                      </p>
                      {item.item.brand && (
                        <p className="text-xs text-muted-foreground">{item.item.brand}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-foreground">
                          {formatPrice(item.item.price, item.item.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="p-4 bg-surface rounded-2xl border border-border">
              <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={address.fullName}
                    onChange={(e) => handleAddressChange('fullName', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={address.addressLine1}
                    onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={address.addressLine2}
                    onChange={(e) => handleAddressChange('addressLine2', e.target.value)}
                    placeholder="Apt 4B"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">City *</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="New York"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">State</label>
                    <input
                      type="text"
                      value={address.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      placeholder="NY"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={address.postalCode}
                      onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                      placeholder="10001"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Country *</label>
                    <input
                      type="text"
                      value={address.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      placeholder="United States"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => handleAddressChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
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
                    Our team will purchase your items from multiple stores and consolidate them into
                    one delivery. Estimated delivery: 5-10 business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="p-4 bg-surface rounded-2xl border border-border">
              <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </h2>

              <div className="flex items-center gap-3 p-3 bg-surface-alt rounded-xl">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Payment processing coming soon. Orders will be confirmed manually.
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
              <h3 className="font-medium text-foreground">Order Summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({cartTotal?.itemCount} items)
                  </span>
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
                  <span className="text-muted-foreground">Estimated Shipping</span>
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

      {/* Fixed Bottom Place Order Bar */}
      {!isLoading && cartItems && cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !isAddressValid()}
              className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Place Order ({formatPrice(total, cartTotal?.currency || 'USD')})
                </>
              )}
            </button>
            {!isAddressValid() && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Please fill in all required shipping fields
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



