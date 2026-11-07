export const SITE_NAME = "TriviaTowers.io";
export const PRODUCTION_URL = "https://triviatowers.io";

/** NEXT_PUBLIC_SITE_URL if it is a real http(s) URL; anything else (empty, "auto") means unset. */
export function configuredSiteUrl(): string | null {
  const v = process.env.NEXT_PUBLIC_SITE_URL;
  return v && /^https?:\/\/[^\s]+$/.test(v) ? v.replace(/\/$/, "") : null;
}

/** Base URL for links we share. Uses the current origin unless a real URL is configured. */
export function siteUrl(): string {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return PRODUCTION_URL;
}
