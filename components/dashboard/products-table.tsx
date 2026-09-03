"use client";

/**
 * Product manager — grid of product cards + add/edit/delete.
 * Enforces the free-plan cap on the client (and the DB enforces it for real).
 */
import * as React from "react";
import { MoreHorizontal, PackageOpen, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { useToast } from "@/components/providers";
import { deleteProduct, listMyProducts } from "@/lib/api";
import { PRODUCT_LIMIT } from "@/lib/config";
import type { Product, Store } from "@/lib/types";
import { formatNaira } from "@/lib/utils";
import { ProductFormDialog } from "./product-form";

export function ProductsManager({ store }: { store: Store }) {
  const { toast } = useToast();
  const [products, setProducts] = React.useState<Product[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  async function load() {
    try {
      setLoadError(null);
      setProducts(await listMyProducts(store.id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load products.");
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteProduct(deleting.id);
      toast({ title: "Product deleted", variant: "success" });
      setDeleting(null);
      await load();
    } catch (e) {
      toast({
        title: "Could not delete",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  const used = products?.length ?? 0;
  const atLimit = used >= PRODUCT_LIMIT;

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${used} of ${PRODUCT_LIMIT} products used.`}
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={atLimit}>
            <Plus /> Add product
          </Button>
        }
      />

      {atLimit ? (
        <Alert variant="warning" className="mb-6">
          Product limit reached ({PRODUCT_LIMIT} products). Delete a product to add a new one.
        </Alert>
      ) : null}

      {loadError ? <Alert variant="error" className="mb-6">{loadError}</Alert> : null}

      {!products ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No products yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Add your first product with a photo from your device. It goes live on your storefront
              immediately.
            </p>
            <Button className="mt-2" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus /> Add your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <Card key={p.id} className="group overflow-hidden">
              <div className="relative aspect-square bg-muted">
                <ProductImage imagePath={p.image_path} alt={p.name} className="h-full w-full" />
                {p.stock_count === 0 ? (
                  <Badge variant="destructive" className="absolute left-2 top-2">
                    Out of stock
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="absolute left-2 top-2">
                    {p.stock_count} in stock
                  </Badge>
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 text-sm font-semibold text-primary">{formatNaira(p.price)}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8" aria-label="Product actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(p); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(p)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductFormDialog
        store={store}
        product={editing}
        productCount={used}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              “{deleting?.name}” will be removed from your storefront. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
