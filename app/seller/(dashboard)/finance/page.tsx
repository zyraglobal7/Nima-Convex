'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SellerFinancePage() {
  const stats = useQuery(api.sellers.queries.getSellerDashboardStats);

  // For now, we'll calculate a simple breakdown
  // In production, this would come from actual payout records
  const pendingPayout = stats ? stats.revenueThisMonth : 0;
  const totalPaid = stats ? stats.totalRevenue - stats.revenueThisMonth : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Finance</h1>
        <p className="text-muted-foreground mt-1">
          Track your earnings and payouts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats ? (
              <>
                <div className="text-2xl font-bold">
                  {formatPrice(stats.totalRevenue, stats.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time earnings
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats ? (
              <>
                <div className="text-2xl font-bold">
                  {formatPrice(stats.revenueThisMonth, stats.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current period
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats ? (
              <>
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(pendingPayout, stats.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Processing at month end
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats ? (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(totalPaid, stats.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully transferred
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Breakdown</CardTitle>
          <CardDescription>
            How your revenue is calculated
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium">Gross Revenue</p>
                  <p className="text-sm text-muted-foreground">
                    Total sales from all orders
                  </p>
                </div>
                <span className="text-xl font-semibold">
                  {formatPrice(stats.totalRevenue, stats.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium">Platform Fees</p>
                  <p className="text-sm text-muted-foreground">
                    Commission will be implemented later
                  </p>
                </div>
                <span className="text-xl font-semibold text-muted-foreground">
                  KES 0.00
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-green-600">Net Earnings</p>
                  <p className="text-sm text-muted-foreground">
                    Amount you'll receive
                  </p>
                </div>
                <span className="text-xl font-semibold text-green-600">
                  {formatPrice(stats.totalRevenue, stats.currency)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            Your recent payout transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No payouts yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Payouts are processed monthly. Your first payout will appear here once processed.
            </p>
          </div>

          {/* Example table structure for when payouts exist */}
          {/* <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Jan 1 - Jan 31, 2026</TableCell>
                <TableCell>$1,234.56</TableCell>
                <TableCell>
                  <Badge variant="default">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Paid
                  </Badge>
                </TableCell>
                <TableCell>Feb 5, 2026</TableCell>
              </TableRow>
            </TableBody>
          </Table> */}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Payout Information</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Payouts are processed at the end of each month for all delivered orders.
                Make sure to set up your payment details in Settings to receive your earnings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
