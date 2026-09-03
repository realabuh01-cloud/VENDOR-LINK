import Link from "next/link";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

/**
 * Shown on data-dependent pages while Supabase credentials are missing.
 * (Not an error state — a setup state. See README for the 5-phase guide.)
 */
export function SetupRequired() {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-lg rounded-lg border bg-card p-8 shadow-sm">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-center text-xl font-bold">Setup required</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          VendorLink needs your Supabase (and Paystack) credentials before it can serve stores.
          Add these to <code className="rounded bg-muted px-1">.env.local</code> and restart:
        </p>
        <ul className="mt-4 space-y-1.5 rounded-md bg-muted p-4 font-mono text-xs">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
          <li>NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</li>
          <li>NEXT_PUBLIC_PAYSTACK_PLAN_CODE</li>
          <li>NEXT_PUBLIC_APP_URL</li>
        </ul>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Full step-by-step guide: <code className="rounded bg-muted px-1">README.md</code>
        </p>
        <div className="mt-5 text-center">
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
