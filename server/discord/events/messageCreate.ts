import { Client, Message } from "discord.js";
import { shouldReact } from "../../services/reactionsService";
import { mark } from "../../services/idempotency";
import { storage } from "../../storage";

export function registerMessageCreate(client: Client) {
  client.on("messageCreate", async (msg: Message) => {
    try {
      // Early exit if message is from a bot
      if (msg.author.bot) return;

      // Get guildId from message
      const guildId = msg.guildId;
      if (!guildId) return;

      // Get league by guildId
      const league = await storage.getLeagueByGuildId(guildId);
      if (!league) return;

      // Check if reactions feature is enabled
      const features = league.features as any;
      if (!features?.reactions) return;

      // Check if we should react to this message
      const decision = await shouldReact(msg.content, msg.channelId);
      if (!decision.react || !decision.emoji) return;

      // Add reaction to the message
      await msg.react(decision.emoji);

      // Record activity in bot_activity table
      await mark({
        leagueId: league.id,
        guildId: guildId,
        channelId: msg.channelId,
        kind: 'reaction',
        key: `reaction:${msg.id}`,
        status: 'SUCCESS',
        detail: {
          emoji: decision.emoji,
          messageId: msg.id,
          channelId: msg.channelId,
        },
      });
    } catch (e) {
      console.error("[Reaction]", e);
    }
  });
}
