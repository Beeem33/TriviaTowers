import { currentClient, withTimeout } from "./supabase";

export interface BoardRow {
  rank: number;
  display_name: string;
  score: number;
  correct: number;
  total_answer_ms: number;
  is_guest: boolean;
  is_me: boolean;
  players: number;
}

/** Daily leaderboard from the server. Throws when offline. */
export async function fetchLeaderboard(dateKey: string | null, limit = 50, offset = 0): Promise<BoardRow[]> {
  const sb = await currentClient();
  if (!sb) throw new Error("offline");
  const { data, error } = await withTimeout(sb.rpc("daily_leaderboard", { p_date: dateKey, p_limit: limit, p_offset: offset }));
  if (error) throw new Error(error.message);
  return ((data ?? []) as BoardRow[]).map((r) => ({ ...r, rank: Number(r.rank), players: Number(r.players) }));
}

export const MEDALS = ["🥇", "🥈", "🥉"];
