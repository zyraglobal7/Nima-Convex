'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';
import { Loader2 } from 'lucide-react';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'KES',
  }).format(amount / 100);
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const orders = useQuery(api.orders.queries.getUserOrders, {});

  if (orders === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">Your Orders</h1>
        <p className="text-muted-foreground mt-2">Track and manage your recent purchases.</p>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No orders yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              You haven't placed any orders yet. Start shopping to find your perfect look.
            </p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Start Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card 
              key={order._id} 
              className="group hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/orders/${order.orderNumber}`)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                      <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span>{order.itemCount} items</span>
                      <span>{formatPrice(order.total, order.currency)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" className="self-start md:self-center group-hover:translate-x-1 transition-transform">
                    View Details <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
