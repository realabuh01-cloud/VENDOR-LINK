/** @type {import('next').NextConfig} */
const nextConfig = {
  // Product/logo images live in Supabase Storage (product-images bucket) —
  // allow them through next/image's optimizer.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
