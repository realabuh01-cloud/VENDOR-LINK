"use client";

/**
 * Dashboard shell — responsive layout for vendor pages.
 * Desktop: fixed sidebar. Mobile: top bar + dropdown navigation.
 * Renders a sign-in prompt if the session disappears mid-use.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Skeleton } from "@/components/ui";
import { Logo } from "@/components/logo";
import { signOutUser } from "@/lib/api";
import { PRODUCT_LIMIT } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/types";
import { useVendor } from "./use-vendor";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/settings", label: "Store settings", icon: Settings },
];

export function DashboardShell({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, store, loading } = useVendor(initialSession);
  const [signingOut, setSigningOut] = React.useState(false);

  // No session → prompt to sign in.
  if (!loading && !session) {
    return (
      <div className="container grid min-h-[60dvh] place-items-center py-16">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-sm">
          <Store className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h1 className="text-lg font-semibold">Sign in required</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in (or create a store) to open your dashboard.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Create store</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-muted/30 lg:grid lg:grid-cols-[260px_1fr]">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard"><Logo /></Link>
        </div>

        {store ? (
          <div className="border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-bold text-primary">
                {store.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{store.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /store/{store.slug}
                </p>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2 border-b px-6 py-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="mb-3 min-w-0">
            <p className="truncate text-sm font-medium">{session?.user.email}</p>
            {store ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {PRODUCT_LIMIT} products · unlimited orders
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut} disabled={signingOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
          <Link href="/dashboard"><Logo compact /></Link>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {store ? (
                  <DropdownMenuItem className="pointer-events-none opacity-80">
                    <Store className="h-4 w-4" />
                    <span className="truncate">{store.name}</span>
                  </DropdownMenuItem>
                ) : null}
                {NAV.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="min-w-0">
        <div className="container max-w-5xl py-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
