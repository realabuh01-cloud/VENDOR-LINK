"use client";

/**
 * Product create/edit dialog.
 * Includes the ImageUploader (validate → compress → upload) and shows the
 * free-plan product cap before the user hits a wall on submit.
 */
import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { ImageUploader } from "@/components/image-uploader";
import { useToast } from "@/components/providers";
import { createProduct, updateProduct } from "@/lib/api";
import { PRODUCT_LIMIT } from "@/lib/config";
import type { Product, Store } from "@/lib/types";

export interface ProductFormValue {
  name: string;
  price: string;
  stock: string;
  description: string;
  image_path: string | null;
}

export function ProductFormDialog({
  store,
  product,
  productCount,
  open,
  onOpenChange,
  onSaved,
}: {
  store: Store;
  product?: Product | null;
  productCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ProductFormValue>(emptyForm());

  function emptyForm(): ProductFormValue {
    return {
      name: product?.name ?? "",
      price: product ? String(product.price) : "",
      stock: product ? String(product.stock_count) : "1",
      description: product?.description ?? "",
      image_path: product?.image_path ?? null,
    };
  }

  // Re-seed the form whenever the dialog opens with a (possibly new) product.
  React.useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const atLimit = productCount >= PRODUCT_LIMIT;
  const editing = Boolean(product);

  function set<K extends keyof ProductFormValue>(key: K, value: ProductFormValue[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Give your product a name.");
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price < 0) return setError("Enter a valid price in Naira.");
    const stock = Number(form.stock || "0");
    if (Number.isNaN(stock) || stock < 0) return setError("Enter a valid stock count.");

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Math.round(price),
        stock_count: Math.round(stock),
        description: form.description.trim() || null,
        image_path: form.image_path,
      };
      if (editing && product) {
        await updateProduct(product.id, payload);
        toast({ title: "Product updated", variant: "success" });
      } else {
        await createProduct(store.id, payload);
        toast({ title: "Product added", variant: "success" });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "Add a product"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details below — your storefront updates instantly."
              : `${productCount} of ${PRODUCT_LIMIT} products used.`}
          </DialogDescription>
        </DialogHeader>

        {atLimit && !editing ? (
          <Alert variant="warning">
            You&apos;ve reached the product limit of {PRODUCT_LIMIT} products. Delete a product to
            add a new one.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="space-y-1.5">
              <Label htmlFor="p-name">Product name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ankara Midi Dress"
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Price (₦)</Label>
                <Input
                  id="p-price"
                  inputMode="numeric"
                  className="no-spinner"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min={0}
                  className="no-spinner"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Fabric, sizes, delivery time…"
                rows={3}
              />
            </div>

            <ImageUploader
              value={form.image_path}
              onValue={(v) => set("image_path", v)}
              label="Product photo (from your device)"
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || atLimit}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                {editing ? "Save changes" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
