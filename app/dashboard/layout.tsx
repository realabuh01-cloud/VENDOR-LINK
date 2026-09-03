import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Session } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * Vendor dashboard layout (protected).
 * Server-side session check (middleware also guards /dashboard).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const session: Session = {
    user: {
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string) ?? null,
      phone: (user.user_metadata?.phone as string) ?? null,
    },
  };

  return <DashboardShell initialSession={session}>{children}</DashboardShell>;
}
