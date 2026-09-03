"use client";

import { Alert, Button, Skeleton } from "@/components/ui";
import { ProductsManager } from "@/components/dashboard/products-table";
import { StoreMissingNotice } from "@/components/dashboard/store-missing";
import { useVendor } from "@/components/dashboard/use-vendor";
import Link from "next/link";

export default function ProductsPage() {
  const { store, loading, error, refresh } = useVendor();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  if (!store) return <StoreMissingNotice onRetry={refresh} />;
  if (error) return <Alert variant="error">{error}</Alert>;

  return <ProductsManager store={store} />;
}
