"use client";

/**
 * Checkout modal (spec §3).
 *
 * • Every store → "Order via WhatsApp".
 * • Stores with a Paystack public key also show "Pay now" (Paystack Inline
 *   with the VENDOR's public key — money goes straight to the vendor).
 *
 * Every order is first created server-side (create_order RPC), which
 * validates stock and computes the total. WhatsApp messages follow the
 * required format.
 */
import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { WhatsAppIcon } from "@/components/logo";
import { useToast } from "@/components/providers";
import {
  buildWhatsAppMessage,
  buildWhatsAppOrderUrl,
  confirmOrderPayment,
  createOrder,
} from "@/lib/orders";
import { openPaystackCheckout, orderReference } from "@/components/paystack-inline";
import type { CartItem, PaymentMethod, Store } from "@/lib/types";
import { formatNaira, isValidNigerianPhone } from "@/lib/utils";

type Step = "details" | "done";

export function CheckoutModal({
  open,
  onOpenChange,
  store,
  cart,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
  cart: CartItem[];
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = React.useState<Step>("details");
  const [busy, setBusy] = React.useState(false);
  const [busyLabel, setBusyLabel] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [doneInfo, setDoneInfo] = React.useState<{
    orderId: string;
    method: PaymentMethod;
    whatsappUrl: string | null;
  } | null>(null);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [note, setNote] = React.useState("");

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const canPayOnline = Boolean(store.paystack_public_key);

  // Reset when opened.
  React.useEffect(() => {
    if (open) {
      setStep("details");
      setError(null);
      setDoneInfo(null);
    }
  }, [open]);

  function validate(): boolean {
    if (!name.trim()) {
      setError("Please enter your name.");
      return false;
    }
    if (!isValidNigerianPhone(phone)) {
      setError("Enter a valid Nigerian phone number, e.g. 08012345678.");
      return false;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("That email doesn't look right.");
      return false;
    }
    if (!store.whatsapp_number) {
      setError("This store hasn't added a WhatsApp number yet, so orders can't be placed. Please contact them directly.");
      return false;
    }
    return true;
  }

  const customer = () => ({
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim() || null,
    city: city.trim() || null,
    address: address.trim() || null,
    note: note.trim() || null,
  });

  /** Create the order in the DB, then open the chosen channel. */
  async function placeOrder(method: PaymentMethod): Promise<{ orderId: string; total: number }> {
    const result = await createOrder({
      storeId: store.id,
      items: cart.map((i) => ({ product_id: i.product.id, qty: i.qty })),
      customer: customer(),
      method,
    });
    return { orderId: result.order_id, total: result.total_amount };
  }

  async function handleWhatsApp() {
    if (!validate()) return;
    setBusy(true);
    setBusyLabel("Preparing your order…");
    setError(null);
    try {
      const { orderId, total } = await placeOrder("whatsapp");
      const message = buildWhatsAppMessage(
        store.name,
        orderId,
        cart.map((i) => ({ name: i.product.name, price: i.product.price, qty: i.qty })),
        total,
        customer(),
      );
      const url = buildWhatsAppOrderUrl(store.whatsapp_number, message);
      setDoneInfo({ orderId, method: "whatsapp", whatsappUrl: url });
      setStep("done");
      if (url) window.open(url, "_blank", "noopener");
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the order.");
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  async function handlePaystack() {
    if (!validate()) return;
    setBusy(true);
    setBusyLabel("Preparing your order…");
    setError(null);
    try {
      // 1) Reserve stock + create a pending order FIRST (server-computed total).
      const { orderId, total } = await placeOrder("paystack");

      // 2) Open Paystack Inline with the VENDOR's public key.
      setBusyLabel("Opening payment…");
      await openPaystackCheckout({
        key: store.paystack_public_key!,
        email: email.trim() || "customer@vendorlink.app",
        amount: total,
        reference: orderReference(orderId),
        channels: ["card", "bank", "ussd", "qr", "mobile_money"],
        label: store.name,
        metadata: { order_id: orderId, store_id: store.id },
        onSuccess: async (reference) => {
          try {
            // 3) Optimistic confirmation (webhook is the source of truth).
            await confirmOrderPayment(orderId, reference, store.id);
          } catch {
            // Webhook will still confirm — don't block the shopper.
          }
          setDoneInfo({ orderId, method: "paystack", whatsappUrl: null });
          setStep("done");
          onComplete();
        },
        onClose: () => {
          setBusy(false);
          setBusyLabel(null);
          setError(
            "Payment window closed before completion. Your order is saved — you can pay by opening it again, or order via WhatsApp instead.",
          );
        },
        onError: (message) => {
          setBusy(false);
          setBusyLabel(null);
          setError(message);
        },
      });
    } catch (e) {
      setBusy(false);
      setBusyLabel(null);
      setError(e instanceof Error ? e.message : "Could not place the order.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md sm:max-w-lg">
        {step === "details" ? (
          <>
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>
                {canPayOnline
                  ? `Pay online now, or order via WhatsApp. Total: ${formatNaira(subtotal)}`
                  : `Send your order to ${store.name} on WhatsApp. Total: ${formatNaira(subtotal)}`}
              </DialogDescription>
            </DialogHeader>

            {error ? (
              <Alert variant="error">
                <AlertTriangle className="h-4 w-4" /> {error}
              </Alert>
            ) : null}

            {/* Order summary */}
            <div className="max-h-32 overflow-y-auto rounded-md border p-3 text-sm nice-scroll">
              {cart.map((i) => (
                <div key={i.product.id} className="flex justify-between py-0.5">
                  <span className="truncate pr-2">
                    {i.product.name} <span className="text-muted-foreground">× {i.qty}</span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatNaira(i.product.price * i.qty)}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t pt-2 font-bold">
                <span>Total</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
            </div>

            {/* Customer details */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Full name *</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chidinma Eze" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone">Phone (WhatsApp) *</Label>
                  <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" inputMode="tel" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-city">City</Label>
                  <Input id="c-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Port Harcourt" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-addr">Delivery address</Label>
                <Input id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Woji Road, GRA Phase 2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-note">Note for the seller</Label>
                <Textarea id="c-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional" />
              </div>
            </div>

            {/* Channel buttons */}
            <div className="space-y-2 pt-1">
              {canPayOnline ? (
                <>
                  <Button
                    variant="paystack"
                    size="lg"
                    className="w-full"
                    onClick={handlePaystack}
                    disabled={busy || cart.length === 0}
                  >
                    {busy && busyLabel === "Opening payment…" ? <Loader2 className="animate-spin" /> : <CreditCard />}
                    {busy && busyLabel === "Preparing your order…" ? "Preparing…" : `Pay now — ${formatNaira(subtotal)}`}
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Secure payment via Paystack — card, bank transfer or USSD
                  </p>
                  <div className="relative py-1 text-center text-xs text-muted-foreground">
                    <span className="bg-background relative z-10 px-2">or</span>
                    <span className="absolute left-0 top-1/2 h-px w-full bg-border" />
                  </div>
                </>
              ) : null}
              <Button
                variant="whatsapp"
                size="lg"
                className="w-full"
                onClick={handleWhatsApp}
                disabled={busy || cart.length === 0}
              >
                {busy ? <Loader2 className="animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
                Order via WhatsApp
              </Button>
            </div>
          </>
        ) : (
          /* ── Done ─────────────────────────────────────────────────────── */
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <DialogTitle className="mt-4">Order placed!</DialogTitle>
            <DialogDescription className="mt-2">
              {doneInfo?.method === "paystack" ? (
                <>
                  Payment successful — your order{" "}
                  <span className="font-mono font-semibold">#{doneInfo.orderId.slice(0, 6).toUpperCase()}</span>{" "}
                  is confirmed.
                  <br />
                  {store.name} has been notified.
                </>
              ) : (
                <>
                  Your order{" "}
                  <span className="font-mono font-semibold">#{doneInfo?.orderId.slice(0, 6).toUpperCase()}</span>{" "}
                  was sent to {store.name} on WhatsApp.
                  <br />
                  They&apos;ll confirm delivery and payment with you.
                </>
              )}
            </DialogDescription>
            <div className="mt-4 space-y-2">
              {doneInfo?.method === "paystack" ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/store/${store.slug}/success?order=${doneInfo.orderId}`}>
                    Track order status
                  </Link>
                </Button>
              ) : null}
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Continue shopping
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
