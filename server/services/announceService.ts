import { withRetry } from "../lib/retry";
import { allow } from "../lib/rateLimiter";
import { hasSucceeded, mark } from "./idempotency";
import { discordService } from "./discord";
import { createHash } from "crypto";

export async function preview(text: string) {
  // Could run LLM tone-check here; for now just echo
  return { ok: true, preview: text };
}

export async function post(params: {
  guildId: string;
  channelId: string;
  text: string;
  mention?: "@everyone" | "@here" | string;
  leagueId?: string;
  requestId?: string;
}) {
  const { guildId, channelId, text, mention, leagueId, requestId } = params;
  
  // Create idempotency key with SHA-256 hash of content
  const contentToHash = `${text}:${mention ?? ""}`;
  const contentHash = createHash('sha256').update(contentToHash).digest('hex');
  const idemKey = `announce:${guildId}:${channelId}:${contentHash}`;
  
  if (await hasSucceeded(idemKey)) {
    return { ok: true, skipped: true };
  }

  // Cooldown guard per channel
  if (!allow(`announce:${channelId}`, 1/60, 1)) { // 1 per minute
    return { ok: false, code: "COOLDOWN", message: "Announcements are rate-limited" };
  }

  // Format message with mention if provided
  const body = mention ? `${mention} ${text}` : text;

  // Use DiscordService to post message with retry logic
  const messageId = await withRetry(() => 
    discordService.postMessage(channelId, { content: body })
  );
  
  await mark({ 
    kind: "announce", 
    key: idemKey, 
    status: "SUCCESS", 
    detail: { messageId }, 
    guildId, 
    channelId, 
    leagueId, 
    requestId 
  });
  
  return { ok: true, messageId };
}
