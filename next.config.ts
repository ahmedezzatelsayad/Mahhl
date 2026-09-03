import type { NextConfig } from "next";

// ⚠️ `output: "standalone"` must NEVER be active on Vercel:
// Vercel's build finalizer expects `.next/next-server.js.nft.json`, which
// standalone builds do not emit at that path → deploy fails with
// "Error: ENOENT ... next-server.js.nft.json".
// Standalone is only for self-hosting: BUILD_STANDALONE=1 npm run build:standalone
const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  // DevOps hardening (Owasp security-headers baseline for e-commerce)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        // long-cache immutable static assets
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
