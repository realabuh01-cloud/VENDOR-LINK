"use client";

/**
 * Cart drawer — right-side sheet with quantity controls.
 * On mobile it slides over the whole storefront.
 */
import * as React from "react";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { CartItem } from "@/lib/types";
import { formatNaira } from "@/lib/utils";

export function CartDrawer({
  open,
  onOpenChange,
  items,
  onSetQty,
  onRemove,
  onCheckout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onSetQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}) {
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="Shopping cart"
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="h-4 w-4" /> Your cart
          </h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close cart">
            <X className="h-5 w-5" />
          </Button>
        </header>

        {items.length === 0 ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Your cart is empty.</p>
            </div>
          </div>
        ) : (
          <>
            <ul className="nice-scroll flex-1 divide-y overflow-y-auto px-4">
              {items.map((item) => (
                <li key={item.product.id} className="flex gap-3 py-3">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                    {item.product.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.image_path.startsWith("data:") || item.product.image_path.startsWith("/") ? item.product.image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${item.product.image_path}`}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatNaira(item.product.price)} each</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onSetQty(item.product.id, item.qty - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onSetQty(item.product.id, item.qty + 1)}
                        disabled={item.qty >= item.product.stock_count}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(item.product.id)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatNaira(item.product.price * item.qty)}</p>
                </li>
              ))}
            </ul>

            <footer className="border-t p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">{formatNaira(subtotal)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={onCheckout}>
                Checkout
              </Button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
