import { Client, TextChannel } from "discord.js";
import { withRetry } from "../lib/retry";
import { allow } from "../lib/rateLimiter";
import { hasSucceeded, mark } from "./idempotency";

export async function preview(text: string) {
  // Could run LLM tone-check here; for now just echo
  return { ok: true, preview: text };
}

export async function post(params: {
  client: Client;
  guildId: string;
  channelId: string;
  text: string;
  mention?: "@everyone" | "@here" | string;
  leagueId?: string;
  requestId?: string;
}) {
  const { client, guildId, channelId, text, mention, leagueId, requestId } = params;
  const idemKey = `announce:${guildId}:${channelId}:${text}:${mention ?? ""}`;
  
  if (await hasSucceeded(idemKey)) {
    return { ok: true, skipped: true };
  }

  // Cooldown guard per channel
  if (!allow(`announce:${channelId}`, 1/60, 1)) { // 1 per minute
    return { ok: false, code: "COOLDOWN", message: "Announcements are rate-limited" };
  }

  const channel = await withRetry(async () => {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) throw new Error("CHANNEL_NOT_FOUND");
    return ch as TextChannel;
  });

  const body = mention ? `${mention} ${text}` : text;

  const msg = await withRetry(() => channel.send({ content: body }));
  
  await mark({ 
    kind: "announce", 
    key: idemKey, 
    status: "SUCCESS", 
    detail: { messageId: msg.id }, 
    guildId, 
    channelId, 
    leagueId, 
    requestId 
  });
  
  return { ok: true, messageId: msg.id };
}
