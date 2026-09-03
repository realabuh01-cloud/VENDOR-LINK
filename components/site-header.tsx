import Link from "next/link";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/config";

/** Public site navigation (server-safe). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label={`${APP_NAME} home`}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <a href="/#features" className="text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="/#setup" className="text-muted-foreground transition-colors hover:text-foreground">
            Setup guide
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Start selling free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container flex flex-col items-center gap-4 py-10 text-center">
        <Logo />
        <p className="max-w-md text-sm text-muted-foreground">
          {APP_NAME} — instant storefronts for Nigerian vendors. 100% free, zero transaction fees.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="/#features" className="hover:text-foreground">Features</a>
          <a href="/#setup" className="hover:text-foreground">Setup</a>
          <a href="/signup" className="hover:text-foreground">Get started</a>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>
    </footer>
  );
}
