import type { NextConfig } from "next";

/**
 * Static export: every page is prerendered to plain HTML/JS in `out/`, so the site can be
 * hosted for free on a CDN (Cloudflare Pages). All dynamic work happens in the browser and
 * in Supabase. Security headers live in public/_headers (applied by Cloudflare).
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@triviatowers/game-core", "@triviatowers/shared-types"],
  poweredByHeader: false,
};

export default nextConfig;
