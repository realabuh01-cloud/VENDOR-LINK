"use client";

/**
 * ImageUploader — the device-image pipeline.
 *
 * 1. Validate type (jpg/png/webp) and size (≤ 2MB).
 * 2. COMPRESS CLIENT-SIDE with browser-image-compression (target < 500KB)
 *    BEFORE any upload request — saves bandwidth and the 1GB storage quota.
 * 3. POST the compressed file to /dashboard/api/upload, which stores it as
 *    `<storeId>/<uuid>.<ext>` in the public `product-images` bucket and
 *    returns the relative path (stored in products.image_path).
 */
import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/providers";
import {
  compressImageFile,
  productImageUrl,
  validateImageFile,
} from "@/lib/image-utils";
import { cn } from "@/lib/utils";

export function ImageUploader({
  value,
  onValue,
  shape = "square",
  label = "Product photo",
  className,
  disabled,
}: {
  value: string | null;
  onValue: (value: string | null) => void;
  shape?: "square" | "circle";
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [stage, setStage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);

    try {
      // ── Critical path: compress BEFORE the upload request ─────────────
      setBusy(true);
      setStage("Compressing image…");
      const compressed = await compressImageFile(file);
      if (compressed.size > 500 * 1024) {
        throw new Error("Couldn't compress the image below 500KB. Try a smaller photo.");
      }

      setStage("Uploading…");
      const form = new FormData();
      form.append("file", compressed, compressed.name || "image.jpg");
      const res = await fetch("/dashboard/api/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((json?.error as string) || "Upload failed. Please try again.");
      }
      onValue(json.path as string);

      toast({
        title: "Image saved",
        description: "Compressed and stored successfully.",
        variant: "success",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Image upload failed.";
      setError(message);
      toast({ title: "Upload failed", description: message, variant: "error" });
    } finally {
      setBusy(false);
      setStage(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const preview = productImageUrl(value);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || disabled}
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden border-2 border-dashed border-input bg-muted/40 transition-colors hover:border-primary/50 disabled:opacity-60",
            shape === "circle" ? "h-20 w-20 rounded-full" : "h-24 w-24 rounded-lg",
          )}
          aria-label={preview ? "Change image" : "Upload image"}
        >
          {preview ? (
            <img src={preview} alt="Uploaded" className="h-full w-full object-cover" />
          ) : busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
          {stage ? (
            <p className="text-primary">{stage}</p>
          ) : (
            <>
              <p>JPG, PNG or WebP · up to 2MB</p>
              <p>Compressed to &lt;500KB before upload</p>
            </>
          )}
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy || disabled}
          >
            {preview ? "Change" : "Choose"}
          </Button>
          {preview && !busy ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onValue(null)}
              disabled={disabled}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
