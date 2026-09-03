"use client";

import { Alert, Skeleton } from "@/components/ui";
import { OrdersManager } from "@/components/dashboard/orders-table";
import { StoreMissingNotice } from "@/components/dashboard/store-missing";
import { useVendor } from "@/components/dashboard/use-vendor";

export default function OrdersPage() {
  const { store, loading, error, refresh } = useVendor();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }
  if (!store) return <StoreMissingNotice onRetry={refresh} />;
  if (error) return <Alert variant="error">{error}</Alert>;

  return <OrdersManager store={store} />;
}
