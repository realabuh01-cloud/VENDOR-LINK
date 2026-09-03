import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { Logo, WhatsAppIcon } from "@/components/logo";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { PRODUCT_LIMIT } from "@/lib/config";

// Product placeholder gradients for the hero phone mock (no external assets).
const MOCK_TILES = [
  "from-rose-200 to-rose-400",
  "from-sky-200 to-sky-400",
  "from-amber-200 to-amber-400",
  "from-emerald-200 to-emerald-400",
];

export default function HomePage() {
  return (
    <div>
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60rem 30rem at 50% -10%, hsl(150 84% 90% / 0.9), transparent)",
          }}
          aria-hidden
        />
        <div className="container relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <Badge variant="success" className="gap-1.5">
              <BadgeCheck className="h-3 w-3" /> 100% free — no fees, ever
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Your online store, <span className="text-primary">live in minutes.</span>
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              VendorLink gives every Nigerian vendor an instant storefront — take orders on
              WhatsApp and accept card payments with Paystack. Completely free, with no
              commissions on your sales.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Create your free store <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">How it works</a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-primary" /> No setup fees
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-primary" /> No transaction fees
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-primary" /> Mobile-first
              </span>
            </div>
          </div>

          {/* Phone mock */}
          <div className="mx-auto w-full max-w-xs">
            <div className="rounded-3xl border-8 border-slate-900 bg-background shadow-2xl">
              <div className="rounded-t-2xl bg-slate-900 px-6 pb-2 pt-3 text-center">
                <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-700" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                    AT
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Ada&apos;s Threads</p>
                    <p className="text-[10px] text-muted-foreground">Live storefront</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {MOCK_TILES.map((g, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg bg-gradient-to-br ${g} ${
                        i === 2 ? "opacity-90" : ""
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg bg-paystack/90 px-3 py-2 text-center text-xs font-semibold text-slate-900">
                    Pay now — ₦18,500
                  </div>
                  <div className="rounded-lg bg-whatsapp px-3 py-2 text-center text-xs font-semibold text-white">
                    Order via WhatsApp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="border-t bg-muted/30 py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything your store needs</h2>
            <p className="mt-2 text-muted-foreground">
              From product photos on your phone to card payments — no code required.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Instant storefront",
                desc: "Sign up and your store is live at /store/your-name. Add products straight from your phone — photos are compressed automatically.",
              },
              {
                icon: Smartphone,
                title: "WhatsApp checkout",
                desc: `Every store takes orders on WhatsApp with a ready-made message: “Hi, I want to buy [product] for [price]”. Up to ${PRODUCT_LIMIT} products, unlimited orders.`,
              },
              {
                icon: CreditCard,
                title: "Card payments",
                desc: "Accept card, bank transfer and USSD via Paystack Inline — connect your own Paystack key and the money lands in YOUR account. We never touch it.",
              },
              {
                icon: Wallet,
                title: "Free forever",
                desc: "No subscription, no commissions, no transaction fees, no hidden charges. VendorLink is 100% free while we grow — we win when you win.",
              },
              {
                icon: ShieldCheck,
                title: "Your data stays yours",
                desc: "Every store is fully isolated with database-level security. Vendors can never see each other's orders or customers.",
              },
              {
                icon: Store,
                title: "Order management",
                desc: "See every order with customer details, mark them paid or delivered, and chat with customers on WhatsApp.",
              },
            ].map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Setup guide ────────────────────────────────────────────────── */}
      <section id="setup" className="py-16 lg:py-24">
        <div className="container max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Zero-capital stack</h2>
            <p className="mt-2 text-muted-foreground">
              VendorLink runs entirely on free tiers — deploy it for your own marketplace in an
              afternoon.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Supabase",
                desc: "Postgres database, Auth, Storage (1GB) and Edge Functions on the free tier. Run the migration SQL in this repo.",
              },
              {
                step: "2",
                title: "Paystack",
                desc: "Free test keys — vendors connect their own public keys to accept card payments, and the webhook confirms every order.",
              },
              {
                step: "3",
                title: "Vercel",
                desc: "Free hosting for Next.js. Add the env vars from .env.example and deploy with one click.",
              },
            ].map((s) => (
              <Card key={s.step}>
                <CardContent className="p-6">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {s.step}
                  </span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
            Built mobile-first — over 90% of your customers shop on their phones.
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="border-t bg-primary py-16 text-primary-foreground">
        <div className="container flex flex-col items-center gap-5 text-center">
          <Logo className="[&_span:last-child]:text-white" />
          <h2 className="max-w-xl text-3xl font-bold tracking-tight">
            Your first sale could be today.
          </h2>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/signup">
              Create your free store <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
