import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Format a Naira amount: 18500 → "₦18,500". */
export function formatNaira(amount: number): string {
  return naira.format(amount || 0);
}

const shortDate = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Format an ISO date: "16 Aug 2026". */
export function formatDate(iso: string): string {
  try {
    return shortDate.format(new Date(iso));
  } catch {
    return "—";
  }
}

/** Relative time: "2h ago", "3d ago". */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Convert a Nigerian phone number to international digits: 08012345678 → 2348012345678. */
export function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return `234${digits}`;
}

/** True for a plausible Nigerian mobile number (11 digits, 0/234 prefix). */
export function isValidNigerianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (!digits.startsWith("0") && !digits.startsWith("234")) return false;
  // Nigerian mobile prefixes: 070x, 080x, 081x, 090x, 091x
  const last10 = digits.slice(-10);
  return /^(70|80|81|90|91)/.test(last10);
}

/** Slugify store names: "Ada's Threads" → "adas-threads". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

/** Short readable id: "9f3c…2ab1". */
export function shortId(id: string, chars = 4): string {
  return id.slice(0, chars).toUpperCase();
}

/** "chidinma.eze" → "Chidinma Eze" (display helper). */
export function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Strip an API error's machine prefix: "FREE_LIMIT:…" → "…". */
export function friendlyError(message: string): string {
  const idx = message.indexOf(":");
  if (idx > 0 && idx < 12) return message.slice(idx + 1).trim();
  return message;
}
