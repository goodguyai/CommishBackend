#!/usr/bin/env tsx

/**
 * Discord Slash Command Registration Script
 * 
 * This script registers slash commands for THE COMMISH bot.
 * It can register commands globally or for specific guilds.
 * 
 * Usage:
 *   Global: npm run register-commands
 *   Guild:  npm run register-commands -- --guild GUILD_ID
 */

import { discordService } from "../services/discord.js";

const GUILD_ID = process.argv.includes("--guild") 
  ? process.argv[process.argv.indexOf("--guild") + 1]
  : null;

async function registerCommands() {
  console.log("🤖 THE COMMISH - Discord Command Registration");
  console.log("=".repeat(50));

  try {
    // Validate environment
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;

    if (!botToken || !clientId) {
      console.error("❌ Missing required environment variables:");
      if (!botToken) console.error("  • DISCORD_BOT_TOKEN");
      if (!clientId) console.error("  • DISCORD_CLIENT_ID");
      process.exit(1);
    }

    const commands = discordService.getSlashCommands();
    console.log(`📋 Found ${commands.length} commands to register:`);
    
    commands.forEach((cmd, i) => {
      console.log(`  ${i + 1}. /${cmd.name} - ${cmd.description}`);
      if (cmd.options) {
        cmd.options.forEach((opt: any) => {
          if (opt.type === 1) { // SUB_COMMAND
            console.log(`     └─ ${opt.name}: ${opt.description}`);
          }
        });
      }
    });

    console.log();

    if (GUILD_ID) {
      console.log(`🎯 Registering commands for guild: ${GUILD_ID}`);
      await discordService.registerGuildCommands(GUILD_ID, commands);
      console.log("✅ Guild commands registered successfully!");
      console.log(`📝 Commands are now available in Discord server ${GUILD_ID}`);
    } else {
      console.log("🌍 Registering global commands...");
      const response = await fetch(
        `https://discord.com/api/v10/applications/${clientId}/commands`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(commands),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Discord API error: ${response.statusText} - ${error}`);
      }

      console.log("✅ Global commands registered successfully!");
      console.log("⏰ Note: Global commands take up to 1 hour to propagate");
    }

    console.log();
    console.log("🚀 Commands registered! Users can now use:");
    commands.forEach((cmd) => {
      console.log(`  • /${cmd.name}`);
    });

  } catch (error) {
    console.error("❌ Command registration failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
registerCommands().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});