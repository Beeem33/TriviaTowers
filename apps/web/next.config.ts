import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@triviatowers/game-core", "@triviatowers/shared-types"],
  poweredByHeader: false,
  async headers() {
    // A full Content-Security-Policy is added in Phase 6, once the AdSense, Supabase and
    // Stripe origins are known (see docs/SECURITY.md).
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
