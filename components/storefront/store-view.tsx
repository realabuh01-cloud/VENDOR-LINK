"use client";

/**
 * Public storefront view (spec §3).
 *
 * Rendered by the Server Component page (SEO-friendly) with data fetched
 * through RLS — customers only ever see active stores.
 *
 * Checkout logic:
 *   • Every store   → "Order via WhatsApp".
 *   • Stores that added a Paystack public key also show "Pay Now" (Paystack
 *     Inline with the vendor's public key — money goes to the vendor).
 */
import * as React from "react";
import Link from "next/link";
import { Loader2, ShoppingCart, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { Logo, WhatsAppIcon } from "@/components/logo";
import { ProductImage, StoreLogo } from "@/components/product-image";
import { fetchStoreProducts } from "@/lib/api";
import { buildWhatsAppOrderUrl } from "@/lib/orders";
import type { CartItem, Product, Store } from "@/lib/types";
import { formatNaira } from "@/lib/utils";
import { CartDrawer } from "./cart-drawer";
import { CheckoutModal } from "./checkout-modal";

export function StorefrontView({
  initialStore,
  initialProducts,
}: {
  initialStore: Store;
  initialProducts: Product[];
}) {
  const [store] = React.useState<Store>(initialStore);
  const [products, setProducts] = React.useState<Product[]>(initialProducts);

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock_count) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setCartOpen(true); // open the cart so shoppers see it was added
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, qty } : i))
        .filter((i) => i.qty > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const whatsappUrl = buildWhatsAppOrderUrl(
    store.whatsapp_number,
    `Hi ${store.name}! I'd like to ask about your products on VendorLink.`,
  );

  return (
    <div className="min-h-dvh">
      {/* ── Store header ──────────────────────────────────────────────── */}
      <header className="border-b bg-background">
        <div className="container flex max-w-6xl items-center gap-4 py-5">
          <StoreLogo logoUrl={store.logo_url} name={store.name} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{store.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {store.paystack_public_key
                ? "Pay online with card, bank or USSD — or order on WhatsApp."
                : "Order via WhatsApp — quick and easy."}
            </p>
          </div>
          {whatsappUrl ? (
            <Button variant="whatsapp" size="sm" asChild className="hidden sm:inline-flex">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="h-4 w-4" /> Chat with us
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      {/* ── Products grid ─────────────────────────────────────────────── */}
      <main className="container max-w-6xl py-8">
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed py-20 text-center">
            <p className="font-medium">No products yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — {store.name} is stocking up!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="container flex max-w-6xl flex-col items-center gap-2 text-center">
          <Link href="/" className="text-xs text-muted-foreground transition-colors hover:text-primary">
            <Logo compact className="mx-auto justify-center" />
          </Link>
          <p className="text-xs text-muted-foreground">
            <Link href="/signup" className="font-medium underline">
              Create your own store
            </Link>{" "}
            in minutes with VendorLink.
          </p>
        </div>
      </footer>

      {/* ── Floating cart button (mobile-first) ───────────────────────── */}
      {cart.length > 0 ? (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {cart.reduce((n, i) => n + i.qty, 0)} · {formatNaira(subtotal)}
        </button>
      ) : null}

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart}
        onSetQty={setQty}
        onRemove={removeFromCart}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        store={store}
        cart={cart}
        onComplete={() => {
          setCart([]);
          setCheckoutOpen(false);
          setCartOpen(false);
          // Refresh stock counts after an order.
          fetchStoreProducts(store.id)
            .then(setProducts)
            .catch(() => undefined);
        }}
      />
    </div>
  );
}

/* ─── Product card ───────────────────────────────────────────────────────── */

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const out = product.stock_count <= 0;

  function handleAdd() {
    setBusy(true);
    onAdd();
    window.setTimeout(() => setBusy(false), 400);
  }

  return (
    <article className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-muted">
        <ProductImage imagePath={product.image_path} alt={product.name} className="h-full w-full" />
        {out ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600/90 px-2.5 py-0.5 text-xs font-medium text-white">
            Out of stock
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5 p-3">
        <h2 className="line-clamp-2 min-h-[2.4rem] text-sm font-medium leading-snug">{product.name}</h2>
        <p className="text-base font-bold text-primary">{formatNaira(product.price)}</p>
        <Button
          size="sm"
          className="w-full"
          variant={out ? "secondary" : "default"}
          disabled={out || busy}
          onClick={handleAdd}
        >
          {busy ? <Loader2 className="animate-spin" /> : null}
          {out ? "Sold out" : "Add to cart"}
        </Button>
      </div>
    </article>
  );
}
