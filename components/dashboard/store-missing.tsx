"use client";

import { Alert, Button } from "@/components/ui";

/**
 * Rendered instead of a silent blank page when a signed-in vendor has no
 * store row. Turns a "mystery blank dashboard" into an actionable message.
 */
export function StoreMissingNotice({ onRetry }: { onRetry?: () => void }) {
  return (
    <Alert variant="warning" className="mt-2 space-y-2">
      <p className="font-semibold">We couldn&apos;t load your store.</p>
      <p className="text-sm">
        Your account is signed in, but no store is attached to it yet. If this keeps happening,
        the database migration hasn&apos;t fully run for this project — re-run{" "}
        <code className="rounded bg-muted px-1">0001_init.sql</code> and{" "}
        <code className="rounded bg-muted px-1">BACKFILL-USERS.sql</code> in the Supabase SQL
        editor, then try again.
      </p>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Alert>
  );
}
