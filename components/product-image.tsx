"use client";

/**
 * Product image renderer.
 * • Supabase Storage paths → next/image through the optimizer with the
 *   Image Transformation URL (server-side resize).
 * • Demo-mode data-URLs / bundled seed images → plain <img> (next/image
 *   can't optimize data URIs).
 */
import Image from "next/image";
import { PackageOpen } from "lucide-react";
import { productImageUrlTransformed } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

export function ProductImage({
  imagePath,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
}: {
  imagePath: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const src = productImageUrlTransformed(imagePath, 700);

  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-muted", className)}>
        <PackageOpen className="h-8 w-8 text-muted-foreground/60" aria-hidden />
      </div>
    );
  }

  const isLocal = src.startsWith("data:") || src.startsWith("/") || src.startsWith(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost");
  if (isLocal) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className={cn("object-cover", className)} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}

/** Circular store logo variant. */
export function StoreLogo({
  logoUrl,
  name,
  className,
}: {
  logoUrl: string | null;
  name: string;
  className?: string;
}) {
  const src = logoUrl;
  if (!src) {
    return (
      <div className={cn("grid shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary", className)}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  const isLocal = src.startsWith("data:") || src.startsWith("/");
  if (isLocal) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return <img src={src} alt={name} className={cn("shrink-0 rounded-full object-cover", className)} />;
}
