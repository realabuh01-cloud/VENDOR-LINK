/**
 * Image pipeline — the "no external URLs, compress before upload" rule.
 *
 * 1. VALIDATE (client): jpg/jpeg/png/webp only, ≤ 2MB input.
 * 2. COMPRESS (client, browser-image-compression): target < 500KB BEFORE the
 *    upload request is ever made — saves bandwidth + the 1GB storage quota.
 * 3. STORE (server route → Supabase Storage): file saved as
 *    `<storeId>/<uuid>.<ext>` inside the public `product-images` bucket.
 * 4. SERVE: the relative path is stored in `products.image_path`; the public
 *    URL is derived here and served through Supabase Image Transformation
 *    (server-side resize → small, fast images on free bandwidth).
 */
import imageCompression from "browser-image-compression";
import { supabaseUrl } from "@/lib/config";

/** Accepted input types (matches the Storage validation server-side). */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Hard input cap before compression. */
export const MAX_INPUT_BYTES = 2 * 1024 * 1024; // 2MB
/** Output target — keep comfortably under 500KB. */
export const TARGET_OUTPUT_MB = 0.45;

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPG, PNG or WebP images are allowed.";
  }
  if (file.size > MAX_INPUT_BYTES) {
    return "Image must be 2MB or smaller.";
  }
  return null;
}

/**
 * Compress a device image client-side.
 * `useWebWorker: false` keeps it compatible with restricted iframes (e.g.
 * sandboxed previews); flip to true in production for a non-blocking main
 * thread.
 */
export async function compressImageFile(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: TARGET_OUTPUT_MB,
    maxWidthOrHeight: 1280,
    useWebWorker: false,
    initialQuality: 0.82,
    fileType: file.type, // preserve format (PNG keeps transparency for logos)
  });
}

/** Compressed file → data-URL (handy for previews; uploads use the API route). */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

const BUCKET = "product-images";

/** True when the value is a data-URL (embedded preview image). */
export function isDataUrl(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith("data:"));
}

/**
 * Derive the public URL for a stored image.
 * • relative path  → https://<project>.supabase.co/storage/v1/object/public/product-images/<path>
 * • data-URL       → returned as-is (embedded preview)
 * • full URL       → returned as-is (store.logo_url stores the full URL)
 */
export function productImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (isDataUrl(imagePath) || imagePath.startsWith("http")) return imagePath;
  return `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${imagePath}`;
}

/**
 * Same as productImageUrl but routed through Supabase Image Transformation
 * (server-side resize/compression) for bandwidth-light serving.
 */
export function productImageUrlTransformed(
  imagePath: string | null | undefined,
  width = 700,
): string | null {
  const url = productImageUrl(imagePath);
  if (!url || isDataUrl(url) || !url.includes("/object/public/")) return url;
  return url.replace("/object/public/", "/render/image/public/") +
    `?width=${width}&quality=75&format=webp`;
}

/** Storage path for a new upload: `<storeId>/<uuid>.<ext>`. */
export function storagePathFor(storeId: string, ext: string): string {
  const uuid = crypto.randomUUID();
  return `${storeId}/${uuid}.${ext}`;
}
