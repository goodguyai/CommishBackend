import { allow } from "../lib/rateLimiter";

export type ReactionDecision = "👍" | "❤️" | null;

export function evaluate(content: string): ReactionDecision {
  if (!content) return null;
  if (/\b(gg|nice|good game|great game)\b/i.test(content)) return "❤️";
  // Lightweight positive sentiment heuristic
  if (/\b(thanks|awesome|love|great|amazing|fun)\b/i.test(content)) return "👍";
  return null;
}

export function allowedForChannel(channelId: string, emoji: string) {
  // Rate-limit per channel+emoji to avoid spam
  return allow(`react:${channelId}:${emoji}`, 0.2, 2); // ~1 reaction / 5s, burst 2
}
