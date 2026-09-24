import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Build E2E memakai folder terpisah (lihat scripts/e2e-build.mjs).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Ada package-lock.json lain di folder home; kunci root ke project ini.
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  experimental: {
    serverActions: {
      // Foto sudah dikompres di browser (<= 1 MB); beri ruang untuk overhead multipart.
      bodySizeLimit: "1200kb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // Menu "Verifikasi Data" digabung ke Data Makam; bookmark lama tetap jalan (query q/field ikut diteruskan).
      { source: "/admin/verifikasi", destination: "/admin/makam?status=needs_verification", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
