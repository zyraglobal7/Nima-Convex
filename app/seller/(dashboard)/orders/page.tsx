'use client';

import { useRouter } from 'next/navigation';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ShoppingCart,
  Search,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';

type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const statusConfig: Record<
  FulfillmentStatus,
  { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="w-4 h-4" />,
    variant: 'secondary',
  },
  processing: {
    label: 'Processing',
    icon: <Package className="w-4 h-4" />,
    variant: 'default',
  },
  shipped: {
    label: 'Shipped',
    icon: <Truck className="w-4 h-4" />,
    variant: 'outline',
  },
  delivered: {
    label: 'Delivered',
    icon: <CheckCircle2 className="w-4 h-4" />,
    variant: 'default',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircle className="w-4 h-4" />,
    variant: 'destructive',
  },
};

const statusTabs: { label: string; value: FulfillmentStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function SellerOrdersPage() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<FulfillmentStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<{
    id: Id<'order_items'>;
    orderNumber: string;
    itemName: string;
  } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const orderItems = useQuery(api.sellers.queries.getSellerOrderItems, {
    status: activeStatus,
    limit: 100,
  });

  const updateOrderStatus = useMutation(api.sellers.mutations.updateOrderItemStatus);

  const handleUpdateStatus = async (
    orderItemId: Id<'order_items'>,
    newStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled',
    tracking?: { number: string; carrier: string }
  ) => {
    setIsUpdating(true);
    try {
      await updateOrderStatus({
        orderItemId,
        fulfillmentStatus: newStatus,
        trackingNumber: tracking?.number,
        trackingCarrier: tracking?.carrier,
      });
      toast.success(`Order marked as ${newStatus}`);
      setSelectedOrder(null);
      setTrackingNumber('');
      setTrackingCarrier('');
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orderItems?.filter(
    (order) =>
      order.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = orderItems?.filter(
    (o) => o.fulfillmentStatus === 'pending' || o.fulfillmentStatus === 'processing'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Orders</h1>
        <p className="text-muted-foreground mt-1">
          Manage and fulfill customer orders
        </p>
      </div>

      {/* Stats */}
      {pendingCount !== undefined && pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {pendingCount} order{pendingCount > 1 ? 's' : ''} need your attention
              </p>
              <p className="text-sm text-muted-foreground">
                Process and ship orders to keep customers happy
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusTabs.map((tab) => (
                <Button
                  key={tab.label}
                  variant={activeStatus === tab.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveStatus(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            {filteredOrders?.length ?? 0} items to fulfill
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orderItems === undefined ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-16 h-16 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : orderItems === null ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Unable to load orders</p>
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const config = statusConfig[order.fulfillmentStatus];
                return (
                  <div
                    key={order._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface-alt/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/seller/orders/${order.orderId}`)}
                  >
                    <div className="w-16 h-16 rounded-lg bg-surface-alt flex items-center justify-center overflow-hidden flex-shrink-0">
                      {order.itemImageUrl ? (
                        <img
                          src={order.itemImageUrl}
                          alt={order.itemName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium truncate hover:text-primary transition-colors">
                            {order.itemName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.orderNumber} • {order.customerName}
                          </p>
                        </div>
                        <Badge variant={config.variant} className="flex items-center gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Qty: {order.quantity}
                        </span>
                        {order.selectedSize && (
                          <span className="text-muted-foreground">
                            Size: {order.selectedSize}
                          </span>
                        )}
                        {order.selectedColor && (
                          <span className="text-muted-foreground">
                            Color: {order.selectedColor}
                          </span>
                        )}
                        <span className="font-medium">
                          {formatPrice(order.lineTotal, 'USD')}
                        </span>
                      </div>

                      {order.trackingNumber && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Tracking: {order.trackingNumber}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      {order.fulfillmentStatus === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(order._id, 'processing')
                          }}
                        >
                          Start Processing
                        </Button>
                      )}
                      {order.fulfillmentStatus === 'processing' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder({
                              id: order._id,
                              orderNumber: order.orderNumber,
                              itemName: order.itemName,
                            })
                          }}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Mark Shipped
                        </Button>
                      )}
                      {order.fulfillmentStatus === 'shipped' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(order._id, 'delivered')
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                Orders will appear here when customers purchase your products
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Shipped</DialogTitle>
            <DialogDescription>
              Add tracking information for {selectedOrder?.itemName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                placeholder="e.g., 1Z999AA10123456784"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier (Optional)</Label>
              <Input
                id="carrier"
                placeholder="e.g., UPS, FedEx, DHL"
                value={trackingCarrier}
                onChange={(e) => setTrackingCarrier(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedOrder &&
                handleUpdateStatus(selectedOrder.id, 'shipped', {
                  number: trackingNumber,
                  carrier: trackingCarrier,
                })
              }
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Confirm Shipment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
