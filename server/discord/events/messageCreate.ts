import { Client, Message } from "discord.js";
import { evaluate, allowedForChannel } from "../../services/reactionPolicy";

export function registerMessageCreate(client: Client) {
  client.on("messageCreate", async (msg: Message) => {
    try {
      if (msg.author.bot) return;
      
      const decision = evaluate(msg.content);
      if (!decision) return;
      
      if (!allowedForChannel(msg.channelId, decision)) return;
      
      await msg.react(decision);
    } catch (e) {
      console.error("[Reaction]", e);
    }
  });
}
