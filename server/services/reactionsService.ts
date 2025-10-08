import { allow } from "../lib/rateLimiter";

export interface ShouldReactResult {
  react: boolean;
  emoji?: string;
}

export async function shouldReact(
  message: string,
  channelId: string
): Promise<ShouldReactResult> {
  if (!message) {
    return { react: false };
  }

  // Check heuristics for emoji matching
  let emoji: string | undefined;

  if (/\b(gg|good game)\b/i.test(message)) {
    emoji = '❤️';
  } else if (/\b(thanks|awesome|love|great|amazing|fun)\b/i.test(message)) {
    emoji = '👍';
  }

  // No match found
  if (!emoji) {
    return { react: false };
  }

  // Apply rate limiting: 1 per 5 seconds (rate: 1/5 = 0.2), burst: 2
  const rateLimitKey = `reactions:${channelId}`;
  const allowed = allow(rateLimitKey, 0.2, 2);

  if (!allowed) {
    return { react: false };
  }

  return { react: true, emoji };
}
