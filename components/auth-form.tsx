"use client";

/**
 * Authentication form — Email/Password + Magic Link (spec §1).
 *
 * signUp stores full_name/phone/store_name in user_metadata; the
 * `handle_new_user` trigger creates the profile + default store.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Alert, Button, Input, Label } from "@/components/ui";
import { useToast } from "@/components/providers";
import { isSupabaseConfigured } from "@/lib/config";
import { sendMagicLink, signInWithEmail, signUpWithEmail } from "@/lib/api";
import { isValidNigerianPhone } from "@/lib/utils";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"password" | "magic">("password");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const [fullName, setFullName] = React.useState("");
  const [storeName, setStoreName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const configured = isSupabaseConfigured();

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        if (!isValidNigerianPhone(phone)) throw new Error("Enter a valid Nigerian phone number, e.g. 08012345678.");
        if (!storeName.trim()) throw new Error("Please give your store a name.");
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        await signUpWithEmail({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          phone: phone.trim(),
          store_name: storeName.trim(),
        });
        setInfo("Check your inbox to confirm your email, then sign in. (If email confirmation is off in Supabase, you're already signed in.)");
      } else {
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
        await signInWithEmail(email.trim(), password);
        toast({ title: "Welcome back!", variant: "success" });
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
      await sendMagicLink(email.trim());
      setInfo("Magic link sent! Check your email — the link signs you straight into your dashboard.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "login" ? "Welcome back" : "Start selling today"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to manage your store."
            : "Create your free storefront in under two minutes."}
        </p>
      </div>

      {!configured ? (
        <Alert variant="warning" className="mb-6">
          Supabase isn&apos;t configured yet. Add the env vars from{" "}
          <code className="rounded bg-muted px-1">.env.example</code> (see the README setup
          guide), then restart the app to enable sign-in.
        </Alert>
      ) : null}

      {/* Tab switch */}
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("password")}
          className={`rounded-md py-1.5 transition-colors ${tab === "password" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          {mode === "login" ? "Email & password" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() => setTab("magic")}
          className={`rounded-md py-1.5 transition-colors ${tab === "magic" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Magic link
        </button>
      </div>

      {error ? (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {info ? (
        <Alert variant="success" className="mb-4">
          {info}
        </Alert>
      ) : null}

      {tab === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {mode === "signup" ? (
            <>
              <Field label="Full name">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Okafor" autoComplete="name" />
              </Field>
              <Field label="Store name" hint="Becomes your storefront link">
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ada's Threads" />
              </Field>
              <Field label="Phone (WhatsApp)">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" inputMode="tel" />
              </Field>
            </>
          ) : null}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={busy || !configured}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {mode === "login" ? "Sign in" : "Create my free store"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={busy || !configured}>
            {busy ? <Loader2 className="animate-spin" /> : <Mail className="h-4 w-4" />}
            Send magic link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New to VendorLink?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create a store
            </Link>
          </>
        ) : (
          <>
            Already have a store?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
