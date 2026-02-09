'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
}

export default function SellerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as Id<'orders'>;

  const order = useQuery(api.sellers.queries.getSellerOrder, { orderId });
  const updateStatus = useMutation(api.sellers.mutations.updateOrderItemStatus);

  const handleStatusChange = async (
    orderItemId: Id<'order_items'>,
    newStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled'
  ) => {
    try {
      await updateStatus({
        orderItemId,
        fulfillmentStatus: newStatus,
      });
      toast.success('Item status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  if (order === undefined) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading order details...
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Order not found or access denied.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-semibold">Order {order.orderNumber}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Placed on {new Date(order.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <Badge variant="outline" className="text-xs">
              {order.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>Manage fulfillment for items in this order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {order.items.map((item) => (
                <div key={item._id} className="flex gap-4 pb-6 border-b last:border-0 last:pb-0">
                  <div className="h-20 w-20 bg-muted rounded-md overflow-hidden relative flex-shrink-0">
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
                        <h4 className="font-medium">{item.itemName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.selectedSize && `Size: ${item.selectedSize}`}
                          {item.selectedSize && item.selectedColor && ' • '}
                          {item.selectedColor && `Color: ${item.selectedColor}`}
                        </p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatPrice(item.lineTotal, 'KES')}</p>
                    </div>
                    
                    <div className="pt-2 flex items-center gap-4">
                      <div className="flex-1 max-w-xs">
                         <Select
                          value={item.fulfillmentStatus}
                          onValueChange={(val: any) => handleStatusChange(item._id, val)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                         {item.fulfillmentStatus === 'shipped' && <Truck className="h-3 w-3" />}
                         {item.fulfillmentStatus === 'delivered' && <CheckCircle className="h-3 w-3" />}
                         {item.fulfillmentStatus === 'cancelled' && <XCircle className="h-3 w-3" />}
                         {item.fulfillmentStatus === 'processing' && <Clock className="h-3 w-3" />}
                         <span className="capitalize">{item.fulfillmentStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div>
                <p className="font-medium mb-1">Shipping Address</p>
                <div className="text-muted-foreground">
                  <p>{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  <p className="mt-2">{order.shippingAddress.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
                <CardTitle>Summary</CardTitle>
            </CardHeader>
             <CardContent>
                <div className="flex justify-between items-center text-sm font-medium">
                    <span>Your Earnings</span>
                    <span>{formatPrice(order.items.reduce((acc, item) => acc + item.lineTotal, 0), 'KES')}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Total revenue from this order (excluding fees)
                </p>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
