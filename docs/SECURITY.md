# Security & anti-cheat

## Principles
1. The browser is untrusted. It never decides correctness, points, timing, winners or rank.
2. The answer key never reaches the browser before that player's answer is locked.
3. Competitive tables are written only by Edge Functions/RPCs; RLS makes them read-only to clients.
4. Database constraints, not client checks, enforce "one attempt" and "one answer per question".
5. Service-role keys and Stripe secrets live only in Supabase function secrets.

## Threats and controls (Phase 2+)

| Threat | Control |
| --- | --- |
| Reading answers from the bundle/network | Public question shape only; verdict returned after answer locked |
| Retrying the daily | `UNIQUE(user_id, challenge_id)`; abandoned attempts finalize with timeouts |
| Double/replayed submissions | PK `(attempt_id, question_index)`; idempotency; current-question check |
| Client-controlled timer | Server `served_at` → `answered_at`; deadline enforced server-side |
| Forged scores / leaderboard writes | No client INSERT/UPDATE policies on results; server computes score |
| Invalid attempt/room ids | Ownership/membership checks in every function; UUIDs |
| Spoofed realtime events | Server-only broadcast channel via Realtime Authorization |
| Multi-accounting | Ranked requires non-anonymous account; rate limits; CAPTCHA (Turnstile) on sign-up; anomaly review in admin |
| Payment fraud | Stripe Checkout + signature-verified webhooks; entitlements granted only from webhooks |
| XSS | React escaping; no `dangerouslySetInnerHTML`; challenge names sanitized; CSP in Phase 6 |
| Abuse/spam | Per-user/IP rate limits in Edge Functions; username filter and reserved names |

## Honest limitations
Browser trivia cannot stop a player from searching answers on another device, asking a friend, or
using multiple accounts. Mitigations are timing (15 s), per-user choice shuffling, anomaly review
(e.g., consistently ~2 s perfect runs), and keeping rewards cosmetic.

## Phase 1 status
Local play is explicitly unranked; nothing is submitted anywhere. Security headers set in
`next.config.ts` (nosniff, referrer policy, frame-deny, permissions policy). Full CSP deferred to
Phase 6 when third-party origins are known.
