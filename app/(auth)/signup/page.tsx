import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { APP_VERSION } from "@/lib/config";

export const metadata: Metadata = { title: "Create your store" };

export default function SignupPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center" aria-label="Back home">
          <Logo className="justify-center" />
        </Link>
        <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
          <AuthForm mode="signup" />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">VendorLink v{APP_VERSION}</p>
      </div>
    </div>
  );
}
