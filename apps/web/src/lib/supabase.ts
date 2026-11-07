/**
 * Supabase client (browser only). The URL and publishable key are public by design:
 * every request is limited by Row Level Security and SECURITY DEFINER functions.
 * Override with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * NEXT_PUBLIC_ONLINE=false builds a fully offline app (e.g. the single-file preview).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Placeholders such as "auto" fall back to the TriviaTowers project.
const URL = envUrl && /^https:\/\//.test(envUrl) ? envUrl : "https://bicckuevfsfvmmfpgdrg.supabase.co";
const KEY = envKey && /^(sb_publishable_|eyJ)/.test(envKey) ? envKey : "sb_publishable_zs3tIKKqVoH_6zjynrz9eg_iVbcbRMc";
export const ONLINE_ENABLED = process.env.NEXT_PUBLIC_ONLINE !== "false";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!ONLINE_ENABLED || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "tt.auth" },
    });
  }
  return client;
}

/** Returns the current user, signing in as an anonymous guest if needed (no form, no email). */
export async function ensureGuest(): Promise<SupabaseClient> {
  const sb = supabase();
  if (!sb) throw new Error("offline");
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) throw error;
  }
  return sb;
}

/** Existing session only (never creates a guest) — for read-only views like leaderboards. */
export async function currentClient(): Promise<SupabaseClient | null> {
  const sb = supabase();
  if (!sb) return null;
  await sb.auth.getSession();
  return sb;
}

export function withTimeout<T>(p: PromiseLike<T>, ms = 10_000): Promise<T> {
  return Promise.race([Promise.resolve(p), new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}
