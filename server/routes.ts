import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { verifyDiscordSignature, generateRequestId } from "./lib/crypto";
import { discordService, InteractionResponseType, ComponentType } from "./services/discord";
import { sleeperService } from "./services/sleeper";
import { deepSeekService } from "./services/deepseek";
import { RAGService } from "./services/rag";
import { EventBus } from "./services/events";
import { scheduler } from "./lib/scheduler";

const ragService = new RAGService(storage);
const eventBus = new EventBus(storage);

// Setup event handlers
eventBus.on("digest_due", async (data) => {
  console.log("Weekly digest due for league:", data.leagueId);
  // TODO: Generate and send digest
});

eventBus.on("sync_due", async (data) => {
  console.log("Sync due for league:", data.leagueId);
  // TODO: Trigger Sleeper sync
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    const deepSeekHealthy = await deepSeekService.healthCheck();
    
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        deepseek: deepSeekHealthy ? "healthy" : "error",
        discord: "configured",
        sleeper: "available"
      }
    });
  });

  // Discord OAuth2 routes
  app.get("/api/discord/auth-url", async (req, res) => {
    try {
      const { redirectUri, state } = req.query;
      
      if (!redirectUri || typeof redirectUri !== "string") {
        return res.status(400).json({ error: "redirectUri is required" });
      }

      const authUrl = discordService.generateUserAuthUrl(redirectUri, state as string);
      res.json({ authUrl });
    } catch (error) {
      console.error("Failed to generate Discord auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/discord/bot-install-url", async (req, res) => {
    try {
      const { guildId, redirectUri } = req.query;
      
      if (!guildId || !redirectUri || typeof guildId !== "string" || typeof redirectUri !== "string") {
        return res.status(400).json({ error: "guildId and redirectUri are required" });
      }

      const installUrl = discordService.generateBotInstallUrl(guildId, redirectUri);
      res.json({ installUrl });
    } catch (error) {
      console.error("Failed to generate bot install URL:", error);
      res.status(500).json({ error: "Failed to generate install URL" });
    }
  });

  app.post("/api/discord/oauth-callback", async (req, res) => {
    try {
      const { code, redirectUri } = req.body;
      
      if (!code || !redirectUri) {
        return res.status(400).json({ error: "code and redirectUri are required" });
      }

      const tokenData = await discordService.exchangeCodeForToken(code, redirectUri);
      const user = await discordService.getCurrentUser(tokenData.access_token);
      const guilds = await discordService.getUserGuilds(tokenData.access_token);

      // Check if account exists
      let account = await storage.getAccountByDiscordId(user.id);
      
      if (!account) {
        // Create new account
        const accountId = await storage.createAccount({
          email: `${user.username}@discord.temp`, // Placeholder email
          discordUserId: user.id,
        });
        account = await storage.getAccount(accountId);
      }

      res.json({
        user,
        guilds: guilds.filter(g => g.owner || (parseInt(g.permissions) & 0x20) !== 0), // Admin or Manage Server
        account,
      });
    } catch (error) {
      console.error("Discord OAuth callback failed:", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Discord interactions endpoint - use raw body for signature verification
  app.post("/api/discord/interactions", express.raw({ type: 'application/json' }), async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      const signature = req.headers["x-signature-ed25519"] as string;
      const timestamp = req.headers["x-signature-timestamp"] as string;
      const publicKey = process.env.DISCORD_PUBLIC_KEY || "";

      if (!signature || !timestamp) {
        return res.status(401).json({ error: "Missing required headers" });
      }

      const body = req.body.toString('utf8');
      
      if (!verifyDiscordSignature(signature, timestamp, body, publicKey)) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const interaction = JSON.parse(body);
      
      // Handle PING
      if (interaction.type === 1) {
        return res.json({ type: InteractionResponseType.PONG });
      }

      // Handle slash commands
      if (interaction.type === 2) {
        const commandName = interaction.data?.name;
        const guildId = interaction.guild_id;
        const userId = interaction.member?.user?.id || interaction.user?.id;
        
        // Get league for this guild
        const league = guildId ? await storage.getLeagueByGuildId(guildId) : null;
        
        if (!league && commandName !== "help") {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "❌ This server is not configured with THE COMMISH. Please run setup first.",
              flags: 64, // Ephemeral
            },
          });
        }

        // Check permissions for admin commands
        const isCommish = league ? await isUserCommish(league.id, userId) : false;
        const adminCommands = ["config", "reindex"];
        
        if (adminCommands.includes(commandName!) && !isCommish) {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "❌ This command is only available to commissioners.",
              flags: 64, // Ephemeral
            },
          });
        }

        // Route commands
        let response;
        
        switch (commandName) {
          case "rules":
            response = await handleRulesCommand(interaction, league!, requestId);
            break;
          case "deadlines":
            response = await handleDeadlinesCommand(interaction, league!, requestId);
            break;
          case "scoring":
            response = await handleScoringCommand(interaction, league!, requestId);
            break;
          case "help":
            response = await handleHelpCommand(interaction);
            break;
          case "config":
            response = await handleConfigCommand(interaction, league!, requestId);
            break;
          case "reindex":
            response = await handleReindexCommand(interaction, league!, requestId);
            break;
          default:
            response = {
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "❌ Unknown command. Use `/help` for available commands.",
                flags: 64,
              },
            };
        }

        // Log interaction
        const latency = Date.now() - startTime;
        
        if (league) {
          eventBus.emitCommandExecuted(
            commandName!,
            league.id,
            userId,
            latency,
            undefined,
            requestId
          );
        }

        return res.json(response);
      }

      // Handle component interactions (channel select, etc.)
      if (interaction.type === 3) {
        const customId = interaction.data?.custom_id;
        
        if (customId === "select_home_channel") {
          return await handleChannelSelect(req, res, interaction);
        }
      }

      res.status(400).json({ error: "Unsupported interaction type" });
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`Interaction failed after ${latency}ms:`, error);
      
      eventBus.emitError(error instanceof Error ? error.message : String(error), { requestId, latency });
      
      res.status(500).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "❌ An error occurred processing your request. Please try again.",
          flags: 64,
        },
      });
    }
  });

  // League management routes
  app.get("/api/leagues", async (req, res) => {
    try {
      const { accountId } = req.query;
      
      if (!accountId || typeof accountId !== "string") {
        return res.status(400).json({ error: "accountId is required" });
      }

      const leagues = await storage.getLeaguesByAccount(accountId);
      res.json(leagues);
    } catch (error) {
      console.error("Failed to get leagues:", error);
      res.status(500).json({ error: "Failed to get leagues" });
    }
  });

  app.post("/api/leagues", async (req, res) => {
    try {
      const leagueData = z.object({
        accountId: z.string(),
        name: z.string(),
        sleeperLeagueId: z.string().optional(),
        guildId: z.string().optional(),
        channelId: z.string().optional(),
        timezone: z.string().default("America/New_York"),
      }).parse(req.body);

      const leagueId = await storage.createLeague(leagueData);
      const league = await storage.getLeague(leagueId);

      // Schedule jobs for this league
      if (league) {
        scheduler.scheduleWeeklyDigest(leagueId, league.timezone || 'America/New_York');
        scheduler.scheduleSyncJob(leagueId);
      }

      res.json({ id: leagueId, league });
    } catch (error) {
      console.error("Failed to create league:", error);
      res.status(500).json({ error: "Failed to create league" });
    }
  });

  // Sleeper integration routes
  app.get("/api/sleeper/league/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const league = await sleeperService.getLeague(leagueId);
      res.json(league);
    } catch (error) {
      console.error("Failed to get Sleeper league:", error);
      res.status(500).json({ error: "Failed to get league data" });
    }
  });

  app.post("/api/sleeper/sync/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const startTime = Date.now();
      
      const syncData = await sleeperService.syncLeagueData(leagueId);
      const latency = Date.now() - startTime;
      
      // Store facts in database
      const dbLeague = await storage.getLeagueBySleeperLeagueId(leagueId);
      
      if (dbLeague) {
        await storage.createOrUpdateFact({
          leagueId: dbLeague.id,
          key: "league_data",
          value: syncData.league,
          source: "SLEEPER",
        });
        
        await storage.createOrUpdateFact({
          leagueId: dbLeague.id,
          key: "current_week",
          value: { week: syncData.currentWeek },
          source: "SLEEPER",
        });

        eventBus.emitSleeperSynced(dbLeague.id, latency);
      }
      
      res.json({ 
        success: true, 
        latency,
        data: syncData 
      });
    } catch (error) {
      console.error("Failed to sync Sleeper data:", error);
      res.status(500).json({ error: "Failed to sync league data" });
    }
  });

  // RAG and rules routes
  app.post("/api/rag/index/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const { content, version, type } = req.body;
      
      if (!content || !version) {
        return res.status(400).json({ error: "content and version are required" });
      }

      const result = await ragService.indexDocument(leagueId, content, version, type);
      
      eventBus.emitRulesUpdated(leagueId, version, result.rulesIndexed);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to index document:", error);
      res.status(500).json({ error: "Failed to index document" });
    }
  });

  app.post("/api/rag/search/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const { query, limit, threshold } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }

      const results = await ragService.searchSimilarRules(
        leagueId,
        query,
        limit || 5,
        threshold || 0.7
      );
      
      res.json(results);
    } catch (error) {
      console.error("Failed to search rules:", error);
      res.status(500).json({ error: "Failed to search rules" });
    }
  });

  app.get("/api/rag/stats/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const stats = await ragService.getIndexStats(leagueId);
      res.json(stats);
    } catch (error) {
      console.error("Failed to get RAG stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Manual digest trigger for testing
  app.post("/api/digest/run", async (req, res) => {
    try {
      const { leagueId } = req.query;
      
      if (!leagueId) {
        return res.status(400).json({ error: "leagueId is required" });
      }

      const league = await storage.getLeague(leagueId as string);
      if (!league) {
        return res.status(404).json({ error: "League not found" });
      }

      // TODO: Implement digest generation logic
      const digestContent = {
        leagueId: league.id,
        leagueName: league.name,
        timestamp: new Date().toISOString(),
        sections: [
          {
            title: "Weekly Matchups",
            content: "This week's matchups and scores would be displayed here.",
          },
          {
            title: "Waiver Wire Activity", 
            content: "Recent waiver wire pickups and drops would be shown here.",
          },
          {
            title: "Trade Activity",
            content: "Recent trades and pending trade offers would be listed here.",
          },
        ],
      };

      // Log the digest generation
      console.log(`Manual digest generated for league ${league.id}`);

      res.json({
        message: "Digest generated successfully",
        leagueId: league.id,
        digest: digestContent,
        note: "This is a test digest. Full implementation requires Sleeper data integration.",
      });
    } catch (error) {
      console.error("Failed to generate digest:", error);
      res.status(500).json({ error: "Failed to generate digest" });
    }
  });

  // Events and analytics
  app.get("/api/events", async (req, res) => {
    try {
      const { leagueId, limit } = req.query;
      const events = await storage.getRecentEvents(
        leagueId as string, 
        limit ? parseInt(limit as string) : undefined
      );
      res.json(events);
    } catch (error) {
      console.error("Failed to get events:", error);
      res.status(500).json({ error: "Failed to get events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for command handling
async function isUserCommish(leagueId: string, userId: string): Promise<boolean> {
  const member = await storage.getMember(leagueId, userId);
  return member?.role === "COMMISH";
}

async function handleRulesCommand(interaction: any, league: any, requestId: string) {
  const question = interaction.data?.options?.[0]?.value;
  
  if (!question) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Please provide a question about the rules.",
        flags: 64,
      },
    };
  }

  // Defer the response since RAG search + LLM might take time
  setTimeout(async () => {
    try {
      const relevantRules = await ragService.searchSimilarRules(league.id, question, 3, 0.6);
      
      if (relevantRules.length === 0) {
        await discordService.followUpInteraction(interaction.token, {
          content: "❓ I couldn't find any relevant rules for your question. Try rephrasing or contact your commissioner.",
          flags: 64,
        });
        return;
      }

      const response = await deepSeekService.answerRulesQuery(
        question,
        relevantRules.map(r => r.rule),
        { leagueName: league.name }
      );

      const embed = {
        title: "📋 Rules Query Result",
        description: response.answer,
        color: 0x5865F2,
        fields: response.citations.map((citation: any, index: number) => ({
          name: `Citation ${index + 1}`,
          value: `**${citation.ruleKey}**: ${citation.text.substring(0, 100)}...`,
          inline: false,
        })),
        footer: {
          text: `Tokens used: ${response.tokensUsed} • Request ID: ${requestId}`,
        },
      };

      await discordService.followUpInteraction(interaction.token, {
        embeds: [embed],
        flags: 64,
      });
    } catch (error) {
      console.error("Rules command follow-up failed:", error);
      await discordService.followUpInteraction(interaction.token, {
        content: "❌ Failed to process rules query. Please try again.",
        flags: 64,
      });
    }
  }, 100);

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: 64 },
  };
}

async function handleDeadlinesCommand(interaction: any, league: any, requestId: string) {
  try {
    const deadlines = await storage.getUpcomingDeadlines(league.id, 5);
    
    if (deadlines.length === 0) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "✅ No upcoming deadlines found.",
          flags: 64,
        },
      };
    }

    const embed = {
      title: "📅 Upcoming Deadlines",
      description: deadlines.map(deadline => 
        `**${deadline.type}**: <t:${Math.floor(new Date(deadline.isoTime).getTime() / 1000)}:R>`
      ).join('\n'),
      color: 0xF59E0B,
      footer: {
        text: `League: ${league.name}`,
      },
    };

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embed],
        flags: 64,
      },
    };
  } catch (error) {
    console.error("Deadlines command failed:", error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Failed to fetch deadlines. Please try again.",
        flags: 64,
      },
    };
  }
}

async function handleScoringCommand(interaction: any, league: any, requestId: string) {
  try {
    if (!league.sleeperLeagueId) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "❌ This league is not connected to Sleeper.",
          flags: 64,
        },
      };
    }

    const sleeperLeague = await sleeperService.getLeague(league.sleeperLeagueId);
    const scoring = sleeperLeague.scoring_settings;

    const embed = {
      title: "🏈 Scoring Settings",
      description: Object.entries(scoring)
        .filter(([_, value]) => value !== 0)
        .map(([key, value]) => `**${key.replace(/_/g, ' ').toUpperCase()}**: ${value}`)
        .join('\n'),
      color: 0x10B981,
      footer: {
        text: `${league.name} • Powered by Sleeper`,
      },
    };

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embed],
        flags: 64,
      },
    };
  } catch (error) {
    console.error("Scoring command failed:", error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Failed to fetch scoring settings. Please try again.",
        flags: 64,
      },
    };
  }
}

async function handleHelpCommand(interaction: any) {
  const embed = {
    title: "👑 THE COMMISH - Command Help",
    description: "AI-powered fantasy league management bot",
    color: 0x5865F2,
    fields: [
      {
        name: "📋 /rules <question>",
        value: "Query league rules and constitution",
        inline: false,
      },
      {
        name: "📅 /deadlines",
        value: "Show upcoming league deadlines",
        inline: false,
      },
      {
        name: "🏈 /scoring",
        value: "Display current scoring settings",
        inline: false,
      },
      {
        name: "⚙️ /config <setting> (Commissioner only)",
        value: "Configure bot settings",
        inline: false,
      },
      {
        name: "🔄 /reindex (Commissioner only)",
        value: "Rebuild rules index",
        inline: false,
      },
    ],
    footer: {
      text: "Powered by DeepSeek AI • Questions? Contact your commissioner",
    },
  };

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [embed],
      flags: 64,
    },
  };
}

async function handleConfigCommand(interaction: any, league: any, requestId: string) {
  const subcommand = interaction.data?.options?.[0]?.name;
  const value = interaction.data?.options?.[0]?.options?.[0]?.value;
  
  // If no subcommand, show current configuration
  if (!subcommand) {
    const embed = {
      title: "⚙️ Configuration",
      description: `Current configuration for **${league.name}**`,
      color: 0x8B5CF6,
      fields: [
        {
          name: "🏠 Home Channel",
          value: league.channelId ? `<#${league.channelId}>` : "Not set",
          inline: true,
        },
        {
          name: "🌍 Timezone",
          value: league.timezone || "America/New_York",
          inline: true,
        },
        {
          name: "🚀 Features",
          value: Object.entries(league.featureFlags || {})
            .map(([key, enabled]) => `${enabled ? '✅' : '❌'} ${key}`)
            .join('\n') || "Default features",
          inline: false,
        },
        {
          name: "📅 Digest Schedule",
          value: `${league.digestDay || 'Tuesday'} at ${league.digestTime || '09:00'}`,
          inline: true,
        },
      ],
      footer: {
        text: "Use /config timezone, /config digest, or /config feature to change settings",
      },
    };

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embed],
        flags: 64,
      },
    };
  }

  // Handle subcommands
  try {
    let updateData: any = {};
    let responseMessage = "";

    switch (subcommand) {
      case "timezone":
        if (!value) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "❌ Please specify a timezone (e.g., America/New_York, Europe/London)",
              flags: 64,
            },
          };
        }
        updateData.timezone = value;
        responseMessage = `✅ Timezone updated to **${value}**`;
        break;

      case "digest":
        const day = interaction.data?.options?.[0]?.options?.find((opt: any) => opt.name === "day")?.value;
        const time = interaction.data?.options?.[0]?.options?.find((opt: any) => opt.name === "time")?.value;
        
        if (day) updateData.digestDay = day;
        if (time) updateData.digestTime = time;
        
        responseMessage = `✅ Digest schedule updated: **${day || league.digestDay || 'Tuesday'}** at **${time || league.digestTime || '09:00'}**`;
        break;

      case "feature":
        const featureName = interaction.data?.options?.[0]?.options?.find((opt: any) => opt.name === "name")?.value;
        const enabled = interaction.data?.options?.[0]?.options?.find((opt: any) => opt.name === "enabled")?.value;
        
        if (!featureName) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "❌ Please specify a feature name (rules_queries, deadlines, scoring, digests)",
              flags: 64,
            },
          };
        }

        const currentFlags = league.featureFlags || {};
        currentFlags[featureName] = enabled !== false; // Default to true unless explicitly false
        updateData.featureFlags = currentFlags;
        
        responseMessage = `✅ Feature **${featureName}** ${enabled !== false ? 'enabled' : 'disabled'}`;
        break;

      default:
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "❌ Unknown config option. Use: timezone, digest, or feature",
            flags: 64,
          },
        };
    }

    // Update the league in storage
    await storage.updateLeague(league.id, updateData);
    
    // Log the configuration change
    console.log(`Config updated for league ${league.id}: ${subcommand}`, updateData);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: responseMessage,
        flags: 64,
      },
    };
  } catch (error) {
    console.error("Config command failed:", error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Failed to update configuration. Please try again.",
        flags: 64,
      },
    };
  }
}

async function handleReindexCommand(interaction: any, league: any, requestId: string) {
  // Defer the response since reindexing might take time
  setTimeout(async () => {
    try {
      const result = await ragService.reindexLeague(league.id);
      
      await discordService.followUpInteraction(interaction.token, {
        content: `✅ **Reindexing Complete**\n\n📊 **Results:**\n• Rules indexed: ${result.rulesIndexed}\n• Embeddings generated: ${result.embeddingsGenerated}`,
        flags: 64,
      });
    } catch (error) {
      console.error("Reindex command follow-up failed:", error);
      await discordService.followUpInteraction(interaction.token, {
        content: "❌ Reindexing failed. Please try again.",
        flags: 64,
      });
    }
  }, 100);

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: 64 },
  };
}

async function handleChannelSelect(req: any, res: any, interaction: any) {
  try {
    const channelId = interaction.data?.values?.[0];
    const guildId = interaction.guild_id;
    
    if (!channelId || !guildId) {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "❌ Failed to get channel selection.",
          flags: 64,
        },
      });
    }

    // Update league with selected channel
    const league = await storage.getLeagueByGuildId(guildId);
    
    if (league) {
      await storage.updateLeague(league.id, { channelId });
      
      eventBus.emitInstallCompleted(league.id, guildId, channelId);
      
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ **THE COMMISH is now configured!**\n\n🏠 Home channel: <#${channelId}>\n\nYou can now use slash commands like \`/rules\`, \`/deadlines\`, and \`/scoring\`.`,
        },
      });
    } else {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "❌ League configuration not found. Please contact support.",
          flags: 64,
        },
      });
    }
  } catch (error) {
    console.error("Channel select failed:", error);
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Failed to configure channel. Please try again.",
        flags: 64,
      },
    });
  }
}
