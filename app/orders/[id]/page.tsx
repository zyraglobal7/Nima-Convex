'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params.id as string;

  const order = useQuery(api.orders.queries.getOrderByNumber, { orderNumber });

  if (order === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="container max-w-4xl py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The order you are looking for does not exist or you do not have permission to view it.
        </p>
        <Button onClick={() => router.push('/orders')}>Return to Orders</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold">Order {order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Items</span>
                <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                  {order.status.replace('_', ' ')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {order.items.map((item) => (
                <div key={item._id} className="flex gap-4">
                  <div className="h-24 w-24 bg-muted rounded-md overflow-hidden relative flex-shrink-0">
                    {item.itemImageUrl ? (
                      <Image
                        src={item.itemImageUrl}
                        alt={item.itemName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-lg">{item.itemName}</h4>
                        <p className="text-sm text-muted-foreground">{item.itemBrand}</p>
                      </div>
                      <p className="font-medium">{formatPrice(item.lineTotal, order.currency)}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.selectedSize && `Size: ${item.selectedSize}`}
                      {item.selectedSize && item.selectedColor && ' • '}
                      {item.selectedColor && `Color: ${item.selectedColor}`}
                      <span className="ml-4">Qty: {item.quantity}</span>
                    </div>
                    {item.trackingNumber && (
                       <div className="pt-2">
                        <Badge variant="outline" className="font-normal">
                          Tracking: {item.trackingNumber}
                        </Badge>
                       </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPrice(order.shippingCost, order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span>{formatPrice(order.serviceFee, order.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>{formatPrice(order.total, order.currency)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-4 text-muted-foreground">{order.shippingAddress.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground">Status</span>
                 <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'}>
                    {order.paymentStatus}
                 </Badge>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground">Method</span>
                 <span className="text-sm">Credit Card</span>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
