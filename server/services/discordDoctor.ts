import { discordService } from "./discord";
import type { IStorage } from "../storage";
import { env } from "./env";

export interface DiscordHealthCheck {
  healthy: boolean;
  checks: {
    guildId: {
      exists: boolean;
      value?: string;
    };
    channelId: {
      exists: boolean;
      value?: string;
      recommended: boolean;
    };
    botToken: {
      valid: boolean;
    };
    botInGuild: {
      installed: boolean;
      canAccessGuild: boolean;
    };
    channelAccess: {
      canReach: boolean;
      canPost: boolean;
    };
    permissions: {
      hasRequired: boolean;
      missing?: string[];
    };
  };
  errors: string[];
  recommendations: string[];
}

export class DiscordDoctorService {
  constructor(private storage: IStorage) {}

  async checkDiscordHealth(leagueId: string): Promise<DiscordHealthCheck> {
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    const result: DiscordHealthCheck = {
      healthy: false,
      checks: {
        guildId: { exists: false },
        channelId: { exists: false, recommended: true },
        botToken: { valid: false },
        botInGuild: { installed: false, canAccessGuild: false },
        channelAccess: { canReach: false, canPost: false },
        permissions: { hasRequired: false },
      },
      errors,
      recommendations,
    };

    try {
      // Step 1: Get league from storage
      const league = await this.storage.getLeague(leagueId);
      
      if (!league) {
        errors.push("League not found");
        recommendations.push("Verify the league ID is correct");
        return result;
      }

      // Step 2: Check if guildId exists
      if (!league.guildId) {
        errors.push("Guild ID not configured");
        recommendations.push("Complete Discord OAuth to link a Discord server");
        result.checks.guildId.exists = false;
      } else {
        result.checks.guildId.exists = true;
        result.checks.guildId.value = league.guildId;
      }

      // Step 3: Check if channelId exists (optional but recommended)
      if (!league.channelId) {
        recommendations.push("Set a home channel for bot messages to enable automated features");
        result.checks.channelId.exists = false;
      } else {
        result.checks.channelId.exists = true;
        result.checks.channelId.value = league.channelId;
      }

      // Step 4: Validate bot token
      try {
        const botToken = env.discord.botToken;
        if (!botToken || botToken.length < 50) {
          errors.push("Bot token is invalid or missing");
          recommendations.push("Check DISCORD_BOT_TOKEN environment variable");
          result.checks.botToken.valid = false;
          return result;
        }
        
        // Test bot token by fetching bot user via discordService
        await discordService.getBotUser();
        result.checks.botToken.valid = true;
      } catch (error) {
        errors.push("Bot token is invalid or expired");
        recommendations.push("Re-generate bot token in Discord Developer Portal");
        result.checks.botToken.valid = false;
        return result;
      }

      // Step 5: Check if bot is in guild and has access
      if (league.guildId) {
        try {
          const guildStatus = await discordService.getGuildStatus(league.guildId);
          
          if (!guildStatus.installed) {
            errors.push("Bot is not installed in the Discord server");
            recommendations.push("Use the bot install URL to add the bot to your server");
            result.checks.botInGuild.installed = false;
            result.checks.botInGuild.canAccessGuild = false;
          } else {
            result.checks.botInGuild.installed = true;
            result.checks.botInGuild.canAccessGuild = true;
          }
        } catch (error) {
          errors.push("Cannot access Discord server - bot may have been removed");
          recommendations.push("Re-install the bot to your Discord server");
          result.checks.botInGuild.installed = false;
          result.checks.botInGuild.canAccessGuild = false;
        }
      }

      // Step 6: Check channel access (if channelId is set)
      if (league.channelId && result.checks.botInGuild.installed) {
        try {
          // Try to fetch channel info via discordService
          const channelData = await discordService.getChannel(league.channelId);
          result.checks.channelAccess.canReach = true;
          result.checks.channelAccess.canPost = true;
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          
          if (errorMessage.includes("404")) {
            errors.push("Channel not found - it may have been deleted");
            recommendations.push("Select a different channel in league settings");
          } else if (errorMessage.includes("403")) {
            errors.push("Bot cannot access the selected channel");
            recommendations.push("Check channel permissions - bot needs View Channel and Send Messages");
          } else {
            errors.push(`Cannot access channel: ${errorMessage}`);
            recommendations.push("Verify channel exists and bot has permissions");
          }
          result.checks.channelAccess.canReach = false;
          result.checks.channelAccess.canPost = false;
        }
      }

      // Step 7: Check bot permissions in guild
      if (league.guildId && result.checks.botInGuild.installed) {
        try {
          // Fetch bot user info
          const botUser = await discordService.getBotUser();
          
          // Fetch guild member to get roles and permissions
          await discordService.getGuildMember(league.guildId, botUser.id);
          result.checks.permissions.hasRequired = true;
        } catch (error) {
          errors.push("Cannot verify bot permissions in server");
          recommendations.push("Ensure bot has Administrator or required permissions");
          result.checks.permissions.hasRequired = false;
        }
      }

      // Determine overall health
      // Critical checks: guildId, botToken, botInGuild
      const criticalChecks = [
        result.checks.guildId.exists,
        result.checks.botToken.valid,
        result.checks.botInGuild.installed,
      ];
      
      // Channel is OPTIONAL - if set, it should be accessible, but not required for base health
      // This allows leagues without a channel to still be healthy
      const optionalChecks = league.channelId
        ? [result.checks.channelAccess.canReach]
        : [];

      result.healthy = criticalChecks.every(check => check) && 
                       (optionalChecks.length === 0 || optionalChecks.every(check => check));

      // Add summary recommendation if not healthy
      if (!result.healthy && errors.length === 0) {
        errors.push("Discord integration is not fully configured");
      }
      
      if (result.healthy && !league.channelId) {
        recommendations.push("For best experience, set a home channel for automated messages");
      }

    } catch (error) {
      errors.push(`Unexpected error during health check: ${error instanceof Error ? error.message : String(error)}`);
      recommendations.push("Contact support if this persists");
    }

    return result;
  }

  async validateBeforeOperation(
    leagueId: string,
    operationType: "message" | "reminder" | "digest" | "command"
  ): Promise<{ ok: boolean; error?: string; recommendation?: string }> {
    const health = await this.checkDiscordHealth(leagueId);

    // For command operations, we only need the bot to be installed and healthy
    // Commands work without a configured channel
    if (operationType === "command") {
      if (!health.healthy) {
        const primaryError = health.errors[0] || "Discord integration not configured";
        const primaryRecommendation = health.recommendations[0] || "Complete Discord setup";

        return {
          ok: false,
          error: primaryError,
          recommendation: primaryRecommendation,
        };
      }
      return { ok: true };
    }

    // For message/reminder/digest operations, we need a channel
    // But we use softer validation - check channel separately
    if (operationType === "message" || operationType === "reminder" || operationType === "digest") {
      // First check if base Discord integration is healthy (guild, bot, token)
      const criticalChecks = [
        health.checks.guildId.exists,
        health.checks.botToken.valid,
        health.checks.botInGuild.installed,
      ];
      
      if (!criticalChecks.every(check => check)) {
        const primaryError = health.errors[0] || "Discord integration not configured";
        const primaryRecommendation = health.recommendations[0] || "Complete Discord setup";

        return {
          ok: false,
          error: primaryError,
          recommendation: primaryRecommendation,
        };
      }

      // Now check channel-specific requirements
      if (!health.checks.channelId.exists) {
        return {
          ok: false,
          error: "No channel configured for messages",
          recommendation: "Set a home channel in league settings to enable automated messaging",
        };
      }

      if (!health.checks.channelAccess.canPost) {
        return {
          ok: false,
          error: "Bot cannot post to the configured channel",
          recommendation: "Check channel permissions or select a different channel",
        };
      }
    }

    return { ok: true };
  }
}
