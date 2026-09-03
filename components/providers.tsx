"use client";

/**
 * Tiny toast system (no dependencies) — Provider mounts the viewport,
 * useToast() pushes notifications. Mobile-friendly (bottom, above the fold
 * of the thumb).
 */
import * as React from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback<ToastContextValue["toast"]>(({ title, description, variant = "default" }) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, title, description, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg animate-slide-up",
              t.variant === "success" && "border-emerald-200",
              t.variant === "error" && "border-red-200",
            )}
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : t.variant === "error" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{t.title}</p>
              {t.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
