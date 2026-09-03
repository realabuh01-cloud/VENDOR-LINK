"use client";

/**
 * Dashboard overview — quick stats and shortcuts.
 */
import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { Button, Card, CardContent, PageHeader, Skeleton } from "@/components/ui";
import { listMyOrders, listMyProducts } from "@/lib/api";
import { StoreMissingNotice } from "@/components/dashboard/store-missing";
import { PRODUCT_LIMIT } from "@/lib/config";
import type { Store } from "@/lib/types";
import { formatNaira } from "@/lib/utils";
import { useVendor } from "@/components/dashboard/use-vendor";

export default function DashboardOverview() {
  const { store, loading, refresh } = useVendor();
  if (!loading && !store) return <StoreMissingNotice onRetry={refresh} />;
  return <OverviewBody store={store} loading={loading} />;
}

function OverviewBody({ store, loading }: { store: Store | null; loading: boolean }) {
  const [stats, setStats] = React.useState<{ products: number; orders: number; revenue: number } | null>(null);

  React.useEffect(() => {
    if (!store) return;
    (async () => {
      try {
        const [products, orders] = await Promise.all([
          listMyProducts(store.id),
          listMyOrders(store.id),
        ]);
        const revenue = orders
          .filter((o) => o.status === "paid" || o.status === "delivered")
          .reduce((s, o) => s + o.total_amount, 0);
        setStats({ products: products.length, orders: orders.length, revenue });
      } catch {
        setStats({ products: 0, orders: 0, revenue: 0 });
      }
    })();
  }, [store]);

  if (loading || !store) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${store.name}`}
        description={`Your store is live — ${PRODUCT_LIMIT} products, unlimited orders, no fees.`}
        action={
          <Button variant="outline" size="sm" asChild>
            <a href={`/store/${store.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink /> View storefront
            </a>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Package} label="Products" value={stats ? String(stats.products) : "…"}
          sub={`of ${PRODUCT_LIMIT}`} />
        <Stat icon={ShoppingBag} label="Orders (all time)" value={stats ? String(stats.orders) : "…"}
          sub="Unlimited" />
        <Stat icon={Wallet} label="Paid revenue" value={stats ? formatNaira(stats.revenue) : "…"} sub="Yours, 100%" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* Quick actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold">Quick actions</h2>
            <div className="mt-4 space-y-2">
              <QuickLink href="/dashboard/products" label="Add or edit products" />
              <QuickLink href="/dashboard/orders" label="Review incoming orders" />
              <QuickLink href="/dashboard/settings" label="Store link & payment settings" />
            </div>
          </CardContent>
        </Card>

        {/* Storefront */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold">Your storefront</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Share this link with customers — orders come in on WhatsApp and Paystack.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
                /store/{store.slug}
              </code>
              <Button size="sm" variant="outline" asChild>
                <a href={`/store/${store.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent"
    >
      {label}
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
