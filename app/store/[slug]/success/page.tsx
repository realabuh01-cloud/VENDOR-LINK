"use client";

/**
 * Order status page — polls the order (via the get_order_status RPC) so
 * shoppers see live confirmation after a Paystack payment, even if the
 * webhook takes a moment on free-tier infrastructure.
 */
import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { Logo } from "@/components/logo";
import { getOrderStatus } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export default function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { order?: string; method?: string };
}) {
  const orderId = searchParams.order;
  const [status, setStatus] = React.useState<OrderStatus | null>(null);
  const [gaveUp, setGaveUp] = React.useState(false);

  React.useEffect(() => {
    if (!orderId) return;
    let attempts = 0;
    let cancelled = false;

    async function poll() {
      let s: OrderStatus | null = null;
      try {
        s = await getOrderStatus(orderId!);
      } catch {
        s = null; // Supabase not configured / network error — stop polling
      }
      if (cancelled) return;
      setStatus(s);
      if (s === "paid" || s === null) {
        if (s === null) setGaveUp(true);
        return;
      }
      attempts += 1;
      if (attempts >= 12) {
        setGaveUp(true); // ~30s on free-tier webhooks
        return;
      }
      window.setTimeout(poll, 2500);
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">No order reference provided.</p>
        <Button asChild className="mt-4">
          <Link href={`/store/${params.slug}`}>Back to store</Link>
        </Button>
      </Centered>
    );
  }

  return (
    <Centered>
      {status === "paid" ? (
        <>
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-4 text-xl font-bold">Payment confirmed!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order <span className="font-mono font-semibold">#{orderId.slice(0, 6).toUpperCase()}</span> is
            paid. The seller has been notified.
          </p>
        </>
      ) : status ? (
        <>
          <Clock3 className="mx-auto h-14 w-14 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold">
            {gaveUp ? "Still confirming your payment" : "Confirming your payment…"}
          </h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {gaveUp
              ? "Paystack confirmation can take a minute on free infrastructure. Your order is saved — refresh this page in a moment, or contact the seller on WhatsApp."
              : `Order #${orderId.slice(0, 6).toUpperCase()} was received and payment is being verified by Paystack. This usually takes a few seconds.`}
          </p>
        </>
      ) : (
        <>
          <Skeleton className="mx-auto h-14 w-14 rounded-full" />
          <Skeleton className="mt-4 h-6 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </>
      )}
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href={`/store/${params.slug}`}>Continue shopping</Link>
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh status
        </Button>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <Logo className="mb-8 justify-center" />
        {children}
      </div>
    </div>
  );
}
