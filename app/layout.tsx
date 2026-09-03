import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "VendorLink lets Nigerian vendors create an online storefront in minutes — free forever, with WhatsApp checkout and Paystack card payments. No fees, no commissions.",
  keywords: ["ecommerce", "Nigeria", "online store", "Paystack", "WhatsApp commerce", "small business"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
