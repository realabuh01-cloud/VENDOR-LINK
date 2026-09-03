"use client";

/**
 * Orders manager — incoming orders with status workflow.
 * Desktop: table. Mobile: stacked cards (90% of traffic is mobile).
 */
import * as React from "react";
import {
  CheckCircle2,
  CircleDashed,
  Eye,
  MessageCircle,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { useToast } from "@/components/providers";
import { listMyOrders, updateOrderStatus } from "@/lib/api";
import type { OrderRow, OrderStatus, Store } from "@/lib/types";
import { formatDate, formatNaira, shortId, timeAgo, toInternationalPhone } from "@/lib/utils";

const STATUS_META: Record<OrderStatus, { label: string; badge: "warning" | "success" | "muted" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", badge: "warning", icon: CircleDashed },
  paid: { label: "Paid", badge: "success", icon: CheckCircle2 },
  delivered: { label: "Delivered", badge: "muted", icon: Truck },
  cancelled: { label: "Cancelled", badge: "destructive", icon: XCircle },
};

export function OrdersManager({ store }: { store: Store }) {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<OrderRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<OrderRow | null>(null);

  async function load() {
    try {
      setError(null);
      setOrders(await listMyOrders(store.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders.");
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id]);

  async function changeStatus(order: OrderRow, status: OrderStatus) {
    const prev = orders;
    setOrders((list) => list?.map((o) => (o.id === order.id ? { ...o, status } : o)) ?? null);
    setDetail((d) => (d && d.id === order.id ? { ...d, status } : d));
    try {
      await updateOrderStatus(order.id, status);
      toast({ title: `Order marked ${status}`, variant: "success" });
    } catch (e) {
      setOrders(prev);
      toast({
        title: "Could not update order",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "error",
      });
    }
  }

  const monthCount = orders?.filter(
    (o) => new Date(o.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  ).length ?? 0;

  const revenue = (orders ?? [])
    .filter((o) => o.status === "paid" || o.status === "delivered")
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="All orders, unlimited — no monthly caps."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="This month" value={String(monthCount)} />
        <StatCard label="Pending" value={String((orders ?? []).filter((o) => o.status === "pending").length)} />
        <StatCard label="Revenue (paid)" value={formatNaira(revenue)} />
      </div>

      {error ? <Alert variant="error" className="mb-6">{error}</Alert> : null}

      {!orders ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No orders yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Share your store link — orders from WhatsApp and Paystack will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────────────── */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold">#{shortId(o.id)}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.customer_details.name}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_details.phone}</p>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-xs">
                        {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatNaira(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={o.payment_method === "paystack" ? "paystack" : "whatsapp"}>
                        {o.payment_method === "paystack" ? "Paystack" : "WhatsApp"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDetail(o)} aria-label="View order">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* ── Mobile cards ─────────────────────────────────────────── */}
          <div className="space-y-3 md:hidden">
            {orders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold">#{shortId(o.id)}</p>
                    <p className="mt-0.5 font-medium">{o.customer_details.name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_details.phone}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {o.items.length} item{o.items.length === 1 ? "" : "s"} · {timeAgo(o.created_at)}
                  </p>
                  <p className="font-semibold">{formatNaira(o.total_amount)}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setDetail(o)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  <OrderStatusMenu order={o} onChange={changeStatus} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Detail dialog (shared) ─────────────────────────────────────── */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>Order #{shortId(detail.id)}</DialogTitle>
                  <StatusBadge status={detail.status} />
                </div>
                <DialogDescription>
                  {formatDate(detail.created_at)} ·{" "}
                  {detail.payment_method === "paystack" ? "Paystack card payment" : "WhatsApp order"}
                  {detail.paystack_reference ? ` · Ref ${detail.paystack_reference}` : null}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <section className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer
                  </p>
                  <p className="text-sm font-medium">{detail.customer_details.name}</p>
                  <p className="text-sm">{detail.customer_details.phone}</p>
                  {detail.customer_details.email ? (
                    <p className="text-sm text-muted-foreground">{detail.customer_details.email}</p>
                  ) : null}
                  {detail.customer_details.address || detail.customer_details.city ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.customer_details.address}
                      {detail.customer_details.address && detail.customer_details.city ? ", " : ""}
                      {detail.customer_details.city}
                    </p>
                  ) : null}
                  {detail.customer_details.note ? (
                    <p className="mt-1 rounded bg-muted px-2 py-1 text-xs italic">
                      “{detail.customer_details.note}”
                    </p>
                  ) : null}
                </section>

                <section className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Items
                  </p>
                  <div className="space-y-2">
                    {detail.items.map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span>
                          {i.name} <span className="text-muted-foreground">× {i.qty}</span>
                        </span>
                        <span className="font-medium">{formatNaira(i.price * i.qty)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
                      <span>Total</span>
                      <span>{formatNaira(detail.total_amount)}</span>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="whatsapp"
                    className="flex-1"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${toInternationalPhone(detail.customer_details.phone)}?text=${encodeURIComponent(
                        `Hi ${detail.customer_details.name}, this is ${store.name}. About your order #${shortId(detail.id)}…`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle /> Chat on WhatsApp
                    </a>
                  </Button>
                  <OrderStatusMenu order={detail} onChange={changeStatus} alignLabel="Change status" />
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-bold">{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.badge}>
      <Icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

function OrderStatusMenu({
  order,
  onChange,
  alignLabel,
}: {
  order: OrderRow;
  onChange: (order: OrderRow, status: OrderStatus) => void;
  alignLabel?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className={alignLabel ? "flex-1 sm:flex-none" : ""}>
          {alignLabel ?? "Update"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(STATUS_META) as OrderStatus[]).map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => onChange(order, status)}
            disabled={order.status === status}
          >
            {(() => {
              const Icon = STATUS_META[status].icon;
              return <Icon className="h-4 w-4" />;
            })()}
            Mark as {STATUS_META[status].label.toLowerCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
