"use client";

/**
 * Store settings — name, store link, WhatsApp number, Paystack PUBLIC key,
 * logo, and the store visibility toggle. (Spec §2: Store Settings.)
 */
import * as React from "react";
import { Copy, ExternalLink, Loader2, Save } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from "@/components/ui";
import { ImageUploader } from "@/components/image-uploader";
import { useToast } from "@/components/providers";
import { updateStore } from "@/lib/api";
import type { Store } from "@/lib/types";
import { isValidNigerianPhone, slugify, toInternationalPhone } from "@/lib/utils";

export function SettingsForm({ store, onSaved }: { store: Store; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = React.useState(store.name);
  const [slug, setSlug] = React.useState(store.slug);
  const [whatsapp, setWhatsapp] = React.useState(store.whatsapp_number ?? "");
  const [paystackKey, setPaystackKey] = React.useState(store.paystack_public_key ?? "");
  const [logo, setLogo] = React.useState<string | null>(store.logo_url);
  const [isActive, setIsActive] = React.useState(store.is_active);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Keep local state in sync when the store refreshes (e.g. after a save).
  React.useEffect(() => {
    setName(store.name);
    setSlug(store.slug);
    setWhatsapp(store.whatsapp_number ?? "");
    setPaystackKey(store.paystack_public_key ?? "");
    setLogo(store.logo_url);
    setIsActive(store.is_active);
  }, [store]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Store name is required.");
    const cleanSlug = slugify(slug);
    if (!cleanSlug) return setError("Store link is required.");
    if (whatsapp && !isValidNigerianPhone(whatsapp)) {
      return setError("Enter a valid Nigerian WhatsApp number, e.g. 08012345678.");
    }
    // Paystack public keys follow the pk_live_… / pk_test_… shape.
    if (paystackKey && !/^pk_(live|test)_[A-Za-z0-9]+$/.test(paystackKey.trim())) {
      return setError("That doesn't look like a Paystack PUBLIC key (starts with pk_live_ or pk_test_). Secret keys start with sk_ — never paste those here.");
    }

    setBusy(true);
    try {
      await updateStore(store.id, {
        name: name.trim(),
        slug: cleanSlug,
        whatsapp_number: whatsapp ? toInternationalPhone(whatsapp) : null,
        paystack_public_key: paystackKey.trim() || null,
        logo_url: logo,
        is_active: isActive,
      });
      toast({ title: "Settings saved", variant: "success" });
      onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save settings.";
      if (message.toLowerCase().includes("duplicate")) {
        setError("That store link is already taken. Try another.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  const storeUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/store/${slug}`;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Store identity</CardTitle>
          <CardDescription>How your storefront looks to customers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ImageUploader
            value={logo}
            onValue={setLogo}
            shape="circle"
            label="Store logo"
            disabled={busy}
          />
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Store name</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-slug">Store link</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/store/</span>
              <Input id="s-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} disabled={busy} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(storeUrl);
                    toast({ title: "Store link copied", variant: "success" });
                  } catch {
                    toast({ title: "Could not copy", variant: "error" });
                  }
                }}
                aria-label="Copy store link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" asChild aria-label="Open storefront">
                <a href={`/store/${slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkout channels</CardTitle>
          <CardDescription>
            Take orders on WhatsApp — and card payments once you add your Paystack public key
            below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="s-wa">WhatsApp number</Label>
            <Input
              id="s-wa"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="08012345678"
              inputMode="tel"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Where &quot;Order via WhatsApp&quot; messages go. Stored as international digits.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-pk">Paystack public key</Label>
            <Input
              id="s-pk"
              value={paystackKey}
              onChange={(e) => setPaystackKey(e.target.value)}
              placeholder="pk_live_xxxxxxxxxxxxxxxx"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              From your Paystack dashboard → Settings → API Keys. Card payments go straight to{" "}
              <strong>your</strong> Paystack account. Only paste PUBLIC keys (pk_…) — secret keys
              (sk_…) must never be entered anywhere in this app.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Hide your storefront from customers at any time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Store is live</p>
              <p className="text-sm text-muted-foreground">
                {isActive ? "Customers can view and order." : "Storefront is hidden (shows “store not found”)."}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={busy} aria-label="Store visibility" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
