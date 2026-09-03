import Link from "next/link";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <Logo className="justify-center" />
        <p className="mt-8 text-6xl font-extrabold text-primary">404</p>
        <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page (or store) you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
