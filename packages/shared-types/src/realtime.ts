/**
 * Typed event protocol for Friend Battle rooms (Phase 4).
 *
 * Transport: Supabase Realtime channels named `room:{roomCode}`.
 *  - `presence` tracks who is connected (join/leave/reconnect).
 *  - `broadcast` carries the events below.
 *
 * Authority: events marked [server] are ONLY emitted by Edge Functions / database
 * triggers using privileged credentials. Clients must ignore copies of these events
 * that do not come from the server channel (see docs/MULTIPLAYER.md). Clients may
 * emit [client] events, which are cosmetic hints only (e.g. "ready") and are always
 * re-validated by the server before they affect game state.
 */
import type { PublicQuestion, ChoiceIndex } from "./questions";

export interface RoomPlayer {
  playerId: string;
  displayName: string;
  avatar: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  score: number;
  floors: number;
  streak: number;
}

export type RoomEvent =
  // [server] lobby lifecycle
  | { type: "room.player_joined"; player: RoomPlayer }
  | { type: "room.player_left"; playerId: string; reason: "left" | "kicked" | "timeout" }
  | { type: "room.player_ready"; playerId: string; ready: boolean }
  | { type: "room.host_changed"; playerId: string }
  // [server] match lifecycle — all timestamps are server epoch milliseconds
  | { type: "match.started"; matchId: string; questionCount: number; serverNow: number }
  | {
      type: "match.question_started";
      matchId: string;
      index: number;
      question: PublicQuestion;
      startsAt: number;
      deadline: number;
      serverNow: number;
    }
  | { type: "match.answer_locked"; matchId: string; index: number; playerId: string }
  | {
      type: "match.question_ended";
      matchId: string;
      index: number;
      correctIndex: ChoiceIndex;
      standings: RoomPlayer[];
    }
  | { type: "match.floor_added"; playerId: string; floors: number }
  | { type: "match.ended"; matchId: string; standings: RoomPlayer[]; winnerIds: string[] }
  | { type: "match.rematch_requested"; playerId: string }
  // [client] hints (never trusted)
  | { type: "client.emote"; playerId: string; emote: "cheer" | "wow" | "gg" };

export type RoomEventType = RoomEvent["type"];
