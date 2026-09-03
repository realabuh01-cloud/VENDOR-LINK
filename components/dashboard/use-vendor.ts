"use client";

/**
 * Shared vendor-data hook for dashboard pages: session → store.
 */
import * as React from "react";
import { getMyStore, getSession } from "@/lib/api";
import type { Session, Store } from "@/lib/types";

export interface VendorData {
  session: Session | null;
  store: Store | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVendor(initialSession: Session | null = null): VendorData {
  const [session, setSession] = React.useState<Session | null>(initialSession);
  const [store, setStore] = React.useState<Store | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      const s = session ?? (await getSession());
      setSession(s);
      if (!s) {
        setStore(null);
        return;
      }
      setStore(await getMyStore());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your account.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, store, loading, error, refresh };
}
