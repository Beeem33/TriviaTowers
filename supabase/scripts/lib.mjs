/**
 * Minimal Supabase Management API client for running SQL.
 * Env: SUPABASE_PROJECT_REF (default: the TriviaTowers project) and SUPABASE_ACCESS_TOKEN
 * (a personal access token, sbp_…). Never commit the token.
 */
export const REF = process.env.SUPABASE_PROJECT_REF ?? "bicckuevfsfvmmfpgdrg";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

export async function sql(query) {
  if (!TOKEN) throw new Error("Set SUPABASE_ACCESS_TOKEN to a Supabase personal access token.");
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text.slice(0, 2000)}`);
  return text ? JSON.parse(text) : [];
}
