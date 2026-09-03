import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Image upload Route Handler (server-side).
 *
 * Receives the CLIENT-COMPRESSED image (< 500KB target), verifies ownership
 * and constraints again (defense in depth), then writes it to the public
 * `product-images` bucket at `<storeId>/<uuid>.<ext>` using the SERVICE ROLE
 * key. The relative path is returned and stored in `products.image_path`.
 *
 * Why service-role here: the upload path must be unforgeable (vendor can
 * only write into their own folder), and Storage RLS policies back this up.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB hard cap (client already enforces)
const BUCKET = "product-images";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server is not configured for uploads." }, { status: 503 });
  }

  // ── 1. Session ────────────────────────────────────────────────────────
  const { createServerClient } = await import("@supabase/ssr");
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: () => undefined,
      remove: () => undefined,
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // ── 2. Parse & validate the file ──────────────────────────────────────
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!ACCEPTED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 2MB or smaller." }, { status: 400 });
  }

  // ── 3. Vendor's own store only ────────────────────────────────────────
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: "No store found for this account." }, { status: 400 });
  }

  // ── 4. Write to Storage (service role; RLS would also allow the vendor) ─
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uuid = crypto.randomUUID();
  const path = `${store.id}/${uuid}.${ext}`;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const bytes = await file.arrayBuffer();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Upload failed:", error.message);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }

  // ── 5. Return the RELATIVE path (stored in products.image_path) ───────
  return NextResponse.json({ path });
}
