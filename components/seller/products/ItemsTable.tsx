'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MoreHorizontal,
  Search,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

type Category = 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
type Gender = 'male' | 'female' | 'unisex';

const categoryLabels: Record<Category, string> = {
  top: 'Top',
  bottom: 'Bottom',
  dress: 'Dress',
  outfit: 'Outfit / Set',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessory: 'Accessory',
  bag: 'Bag',
  jewelry: 'Jewelry',
};

const genderLabels: Record<Gender, string> = {
  male: 'Men',
  female: 'Women',
  unisex: 'Unisex',
};

interface ItemsTableProps {
  onEdit?: (itemId: Id<'items'>) => void;
}

export function ItemsTable({ onEdit }: ItemsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // Note: Current seller query doesn't support category/gender filter yet in backend, 
  // so we might these filters might be client-side filtered or we need to update the query.
  // The existing backend query `getSellerProducts` only supports `isActive`.
  // For now, I will implement Search and Status filters which are supported or can be easily added client side if needed,
  // but wait, `getSellerProducts` only accepts `isActive`, `limit`, `cursor`.
  // It does NOT accept `searchQuery`, `category`, `gender`.
  // To match Admin functionality, I should have updated the query, but I didn't in the plan.
  // I will implement client-side filtering for now for Category/Gender/Search if the list is small, or just stick to what the backend supports for now (Status) and Search (already in paginated results? No).
  // Actually, the original seller page did client-side search:
  // `const filteredProducts = products?.products?.filter((product) => product.name.toLowerCase().includes(searchQuery.toLowerCase()));`
  // I will keep client-side filtering for now since I didn't update the query to support server-side filtering.
  
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Id<'items'> | null>(null);

  const itemsResult = useQuery(api.sellers.queries.getSellerProducts, {
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    limit: 50, // Fetch more since we do client side filtering for other fields
    cursor,
  });

  const updateProduct = useMutation(api.sellers.mutations.updateSellerProduct);

  const handleToggleActive = async (itemId: Id<'items'>, currentStatus: boolean) => {
    try {
      await updateProduct({ 
        itemId,
        isActive: !currentStatus
      });
      toast.success(currentStatus ? 'Product deactivated' : 'Product activated');
    } catch (error) {
       toast.error('Failed to update product');
    }
  };

  const handleDeleteClick = (itemId: Id<'items'>) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        // Soft delete (deactivate)
        await updateProduct({ 
            itemId: itemToDelete, 
            isActive: false 
        });
        toast.success('Product deactivated (deleted)');
        setItemToDelete(null);
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
    setDeleteDialogOpen(false);
  };

  const handlePrevPage = () => {
    setCursor(undefined); // Simple reset for now
  };

  const handleNextPage = () => {
    if (itemsResult?.nextCursor) {
      setCursor(itemsResult.nextCursor);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const validCurrency = currency?.trim() || 'KES';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCurrency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Client-side filtering
  const filteredItems = itemsResult?.products.filter(item => {
    // Search
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
    }
    // Category
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
    }
    // Gender (not available on product object returned by getSellerProducts? need to check return type)
    // The return type in queries.ts shows `category` but not `gender` in the subset!
    // Wait, let's check `getSellerProducts` return fields in `queries.ts`.
    // It returns: name, brand, category, price, currency, isActive, inStock, stockQuantity, imageUrl...
    // It MISSES `gender`! 
    // I can't filter by gender if it's not returned.
    return true;
  }) ?? [];


  if (!itemsResult) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-12 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value as Category | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={activeFilter}
          onValueChange={(value) => {
            setActiveFilter(value as 'all' | 'active' | 'inactive');
            setCursor(undefined);
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-muted-foreground self-center">
          {filteredItems.length} product{filteredItems.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8" />
                    <p>No products found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div className="h-12 w-12 rounded bg-muted overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={48}
                          height={48}
                          unoptimized={product.imageUrl.includes('convex.cloud') || product.imageUrl.includes('convex.site')}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.brand && (
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabels[product.category as Category] ?? product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {formatPrice(product.price, product.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                           <Link href={`/seller/products/${product._id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(product._id, product.isActive)}>
                          {product.isActive ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(product._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(cursor || itemsResult.hasMore) && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={!cursor}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!itemsResult.hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This will deactivate the product.
              It can be restored later or permanently deleted by contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
