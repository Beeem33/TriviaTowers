export const SITE_NAME = "TriviaTowers.io";
export const PRODUCTION_URL = "https://triviatowers.io";

/** Base URL for links we share. Uses the current origin in development/preview builds. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return PRODUCTION_URL;
}
