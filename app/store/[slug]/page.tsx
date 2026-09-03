import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StorefrontView } from "@/components/storefront/store-view";
import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/config";
import { getPublicProducts, getPublicStoreBySlug } from "@/lib/supabase/queries";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

/** SEO: store name in the tab/share preview. */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) {
    return { title: "Store — VendorLink" };
  }
  try {
    const store = await getPublicStoreBySlug(params.slug);
    return store
      ? { title: `${store.name} — VendorLink`, description: `Shop ${store.name} on VendorLink.` }
      : { title: "Store not found — VendorLink" };
  } catch {
    return { title: "Store — VendorLink" };
  }
}

/**
 * Public storefront: /store/[slug]
 * Server Component — RLS-protected reads, SEO-friendly.
 */
export default async function StorePage({ params }: { params: { slug: string } }) {
  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }

  let store = null;
  try {
    store = await getPublicStoreBySlug(params.slug);
  } catch {
    store = null;
  }
  if (!store) notFound();

  let products: Product[] = [];
  try {
    products = await getPublicProducts(store.id);
  } catch {
    products = [];
  }

  return <StorefrontView initialStore={store} initialProducts={products} />;
}
