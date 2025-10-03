import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { env } from "./services/env";
import { verifyDiscordSignature, generateRequestId } from "./lib/crypto";
import { discordService, InteractionResponseType, ComponentType } from "./services/discord";
import { sleeperService } from "./services/sleeper";
import { deepSeekService } from "./services/deepseek";
import { RAGService } from "./services/rag";
import { generateDigestContent } from "./services/digest";
import { EventBus } from "./services/events";
import { scheduler } from "./lib/scheduler";
import { VibesService } from "./services/vibes";
import { ModerationService } from "./services/moderation";
import { TradeFairnessService } from "./services/tradeFairness";
import { HighlightsService } from "./services/highlights";
import { RivalriesService } from "./services/rivalries";
import { ContentService } from "./services/content";
import { insertMemberSchema, insertReminderSchema, insertVoteSchema, type Member } from "@shared/schema";

// Zod schemas for Phase 2 API request validation
const vibesScoreSchema = z.object({
  leagueId: z.string().uuid(),
  channelId: z.string(),
  messageId: z.string(),
  authorId: z.string(),
  text: z.string().min(1),
});

const modFreezeSchema = z.object({
  leagueId: z.string().uuid(),
  channelId: z.string(),
  minutes: z.number().min(1).max(1440),
  reason: z.string().optional(),
});

const modClarifyRuleSchema = z.object({
  leagueId: z.string().uuid(),
  channelId: z.string(),
  question: z.string().min(1),
});

const createDisputeSchema = z.object({
  leagueId: z.string().uuid(),
  kind: z.enum(["trade", "rule", "behavior"]),
  subjectId: z.string().optional(),
  openedBy: z.string(),
  details: z.record(z.any()).optional(),
});

const updateDisputeSchema = z.object({
  status: z.enum(["open", "under_review", "resolved", "dismissed"]),
  resolution: z.record(z.any()).optional(),
});

const evaluateTradeSchema = z.object({
  leagueId: z.string().uuid(),
  tradeId: z.string(),
  proposal: z.object({
    team1: z.object({
      gives: z.array(z.string()),
      receives: z.array(z.string()),
    }),
    team2: z.object({
      gives: z.array(z.string()),
      receives: z.array(z.string()),
    }),
  }),
});

// Zod schemas for Phase 3 API request validation
const computeHighlightsSchema = z.object({
  leagueId: z.string().uuid(),
  week: z.number().int().min(1).max(18).optional(),
});

const getHighlightsSchema = z.object({
  leagueId: z.string().uuid(),
  week: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const updateRivalriesSchema = z.object({
  leagueId: z.string().uuid(),
  week: z.number().int().min(1).max(18).optional(),
});

const getRivalriesSchema = z.object({
  leagueId: z.string().uuid(),
});

const enqueueContentSchema = z.object({
  leagueId: z.string().uuid(),
  channelId: z.string(),
  scheduledAt: z.string().datetime(),
  template: z.enum(['digest', 'highlight', 'meme', 'rivalry']),
  payload: z.record(z.any()),
});

const getContentQueueSchema = z.object({
  leagueId: z.string().uuid(),
  status: z.enum(['queued', 'posted', 'skipped']).optional(),
});

// Module-level variables that will be initialized after env validation
let ragService: RAGService;
let eventBus: EventBus;
let vibesService: VibesService;
let moderationService: ModerationService;
let tradeFairnessService: TradeFairnessService;
let highlightsService: HighlightsService;
let rivalriesService: RivalriesService;
let contentService: ContentService;

// Session store for OAuth tokens (simple in-memory store for demo)
const oAuthSessions = new Map<string, {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  discordUser?: any;
}>();

// Helper to get session ID from request
function getSessionId(req: any): string {
  // Use a simple session ID based on IP + user agent for demo
  // In production, use proper session middleware
  return `${req.ip}-${req.get('user-agent')}`.replace(/[^a-zA-Z0-9]/g, '');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services after environment validation
  ragService = new RAGService(storage);
  eventBus = new EventBus(storage);
  vibesService = new VibesService(storage);
  moderationService = new ModerationService(storage);
  tradeFairnessService = new TradeFairnessService(storage);
  highlightsService = new HighlightsService();
  rivalriesService = new RivalriesService();
  contentService = new ContentService();

  // Forward scheduler events to eventBus
  scheduler.on("digest_due", (data) => eventBus.emit("digest_due", data));
  scheduler.on("sync_due", (data) => eventBus.emit("sync_due", data));
  scheduler.on("cleanup_due", (data) => eventBus.emit("cleanup_due", data));
  scheduler.on("reminder_due", (data) => eventBus.emit("reminder_due", data));
  scheduler.on("highlights_due", (data) => eventBus.emit("highlights_due", data));
  scheduler.on("rivalry_due", (data) => eventBus.emit("rivalry_due", data));
  scheduler.on("content_poster_due", () => eventBus.emit("content_poster_due"));

  // Setup event handlers
  eventBus.on("digest_due", async (data) => {
    try {
      console.log(`[Scheduler] Weekly digest due for league ${data.leagueId}`);
      
      const league = await storage.getLeague(data.leagueId);
      if (!league || !league.channelId) {
        console.warn(`Cannot send digest: League ${data.leagueId} not found or has no channel`);
        return;
      }

      if (!league.sleeperLeagueId) {
        console.warn(`Cannot generate digest: League ${data.leagueId} has no Sleeper ID`);
        return;
      }

      // Sync Sleeper data first
      const sleeperData = await sleeperService.syncLeagueData(league.sleeperLeagueId);

      // Generate digest content with actual Sleeper data
      const digest = await generateDigestContent(league, sleeperData);

      // Build digest description with Discord limit protection
      let description = digest.sections.map(s => `**${s.title}**\n${s.content}`).join("\n\n");
      
      // Discord embed description limit is 4096 chars, keep safe margin
      if (description.length > 3800) {
        description = description.substring(0, 3797) + "...";
      }

      // Post digest to Discord channel
      const embed = {
        title: `📊 ${digest.leagueName} - Weekly Digest`.substring(0, 256), // Discord title limit
        description,
        color: 0x00D2FF,
        footer: { text: `THE COMMISH • Generated ${new Date(digest.timestamp).toLocaleString()}` },
        timestamp: new Date(digest.timestamp).toISOString(), // Fix: ISO8601 format for Discord
      };

      await discordService.postMessage(league.channelId, { embeds: [embed] });
      
      // Log digest sent event (distinct from digest_due)
      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId: league.id,
        payload: { command: "digest_sent", success: true },
      });
      
      console.log(`[Scheduler] Digest sent successfully to league ${data.leagueId}`);

      // Auto-meme: Check for blowout games if feature enabled
      const featureFlags = league.featureFlags as any;
      if (featureFlags?.autoMeme && sleeperData.matchups && sleeperData.matchups.length > 0) {
        try {
          // Group matchups by matchup_id to pair teams
          const matchupGroups = new Map<number, any[]>();
          sleeperData.matchups.forEach(m => {
            if (!matchupGroups.has(m.matchup_id)) {
              matchupGroups.set(m.matchup_id, []);
            }
            matchupGroups.get(m.matchup_id)!.push(m);
          });

          // Detect blowouts (score difference > 40 points)
          const BLOWOUT_THRESHOLD = 40;
          const blowouts = [];
          
          for (const [matchupId, teams] of Array.from(matchupGroups.entries())) {
            if (teams.length === 2) {
              const team1 = teams[0];
              const team2 = teams[1];
              const score1 = team1.points || 0;
              const score2 = team2.points || 0;
              const diff = Math.abs(score1 - score2);
              
              if (diff >= BLOWOUT_THRESHOLD) {
                const winner = score1 > score2 ? team1 : team2;
                const loser = score1 > score2 ? team2 : team1;
                blowouts.push({
                  winner: winner.roster_id,
                  loser: loser.roster_id,
                  scoreDiff: diff,
                  winnerScore: Math.max(score1, score2),
                  loserScore: Math.min(score1, score2),
                });
              }
            }
          }

          // Post meme for blowouts
          if (blowouts.length > 0) {
            const memes = [
              "💥 BLOWOUT ALERT! Someone needs a wellness check...",
              "🔥 That wasn't a game, that was a crime scene!",
              "🚨 Breaking News: Local fantasy team has been reported missing!",
              "🏃 They didn't just lose, they got chased out of the building!",
              "📢 PSA: That wasn't fantasy football, that was bullying!",
              "🎯 They came to play, their opponent came to dominate!",
              "⚠️ Warning: This beatdown may be unsuitable for younger viewers!"
            ];
            
            for (const blowout of blowouts) {
              const randomMeme = memes[Math.floor(Math.random() * memes.length)];
              const embed = {
                title: "🏈 Blowout Game Detected!",
                description: `${randomMeme}\n\n**Score Difference:** ${blowout.scoreDiff.toFixed(1)} points\n**Winner:** ${blowout.winnerScore.toFixed(1)} pts\n**Loser:** ${blowout.loserScore.toFixed(1)} pts\n\nBetter luck next week! 🙏`,
                color: 0xFF6B35,
                footer: { text: "Auto-Meme powered by THE COMMISH" },
              };
              
              await discordService.postMessage(league.channelId, { embeds: [embed] });
              
              await storage.createEvent({
                type: "COMMAND_EXECUTED",
                leagueId: league.id,
                payload: { command: "auto_meme_posted", scoreDiff: blowout.scoreDiff },
              });
            }
            
            console.log(`[Scheduler] Posted ${blowouts.length} auto-meme(s) for blowout games in league ${data.leagueId}`);
          }
        } catch (memeError) {
          console.error(`[Scheduler] Failed to post auto-meme for league ${data.leagueId}:`, memeError);
          // Don't fail the entire digest if meme posting fails
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to generate/send digest for league ${data.leagueId}:`, error);
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        leagueId: data.leagueId,
        payload: { error: "digest_generation_failed", message: String(error) },
      });
    }
  });

  eventBus.on("sync_due", async (data) => {
    try {
      console.log(`[Scheduler] Sync due for league ${data.leagueId}`);
      
      const league = await storage.getLeague(data.leagueId);
      if (!league || !league.sleeperLeagueId) {
        console.warn(`Cannot sync: League ${data.leagueId} not found or has no Sleeper ID`);
        return;
      }

      // Sync Sleeper data
      await sleeperService.syncLeagueData(league.sleeperLeagueId);
      
      // Schedule reminders for upcoming deadlines
      await scheduleRemindersForLeague(league.id);
      
      // Log sync event
      await storage.createEvent({
        type: "SLEEPER_SYNCED",
        leagueId: league.id,
        payload: { success: true },
      });
      
      console.log(`[Scheduler] Sleeper data synced successfully for league ${data.leagueId}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to sync Sleeper data for league ${data.leagueId}:`, error);
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        leagueId: data.leagueId,
        payload: { error: "sleeper_sync_failed", message: String(error) },
      });
    }
  });

  eventBus.on("cleanup_due", async () => {
    try {
      console.log("[Scheduler] Global cleanup due - removing expired wizard sessions");
      const deletedCount = await storage.cleanupExpiredSetups();
      console.log(`[Scheduler] Cleaned up ${deletedCount} expired wizard sessions`);
    } catch (error) {
      console.error("[Scheduler] Failed to cleanup expired sessions:", error);
    }
  });

  eventBus.on("reminder_due", async (data) => {
    try {
      console.log(`[Scheduler] Reminder due for league ${data.leagueId}: ${data.deadlineType} (${data.hoursBefore}h before)`);
      
      const league = await storage.getLeague(data.leagueId);
      if (!league || !league.channelId) {
        console.warn(`Cannot send reminder: League ${data.leagueId} not found or has no channel`);
        return;
      }

      // Check if reminder is enabled for this deadline type
      // Default to enabled if featureFlags.reminders is undefined
      const reminderType = data.deadlineType.toLowerCase();
      const featureFlags = league.featureFlags as any;
      const remindersConfig = featureFlags?.reminders;
      
      // Check specific reminder type toggle (default to true if undefined)
      let reminderEnabled = true;
      if (remindersConfig) {
        if (reminderType.includes('lineup')) {
          reminderEnabled = remindersConfig.lineupLock !== false;
        } else if (reminderType.includes('waiver')) {
          reminderEnabled = remindersConfig.waiver !== false;
        } else if (reminderType.includes('trade')) {
          reminderEnabled = remindersConfig.tradeDeadline !== false;
        }
      }

      if (!reminderEnabled) {
        console.log(`${data.deadlineType} reminders disabled for league ${data.leagueId}, skipping`);
        return;
      }

      // Build reminder embed
      const deadlineTimestamp = Math.floor(new Date(data.deadlineTime).getTime() / 1000);
      const embed = {
        title: `⏰ Deadline Reminder`,
        description: `**${data.deadlineType}** is coming up in **${data.hoursBefore} hour${data.hoursBefore > 1 ? 's' : ''}**!\n\nDeadline: <t:${deadlineTimestamp}:F> (<t:${deadlineTimestamp}:R>)`,
        color: data.hoursBefore === 1 ? 0xDC2626 : 0xF59E0B, // Red for 1h, amber for 24h
        footer: { text: `THE COMMISH • ${league.name}` },
        timestamp: new Date().toISOString(),
      };

      // Send reminder to Discord channel
      await discordService.postMessage(league.channelId, { embeds: [embed] });
      
      // Log reminder sent event
      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId: league.id,
        payload: { 
          command: "reminder_sent", 
          deadlineType: data.deadlineType,
          hoursBefore: data.hoursBefore,
          success: true 
        },
      });
      
      console.log(`[Scheduler] Reminder sent successfully to league ${data.leagueId}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to send reminder for league ${data.leagueId}:`, error);
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        leagueId: data.leagueId,
        payload: { error: "reminder_send_failed", message: String(error) },
      });
    }
  });

  // Phase 3: Highlights + Digest enqueuing (Sunday 8 PM)
  eventBus.on("highlights_due", async (data) => {
    try {
      console.log(`[Scheduler] Highlights due for league ${data.leagueId}`);
      
      const league = await storage.getLeague(data.leagueId);
      if (!league || !league.channelId) {
        console.warn(`Cannot process highlights: League ${data.leagueId} not found or has no channel`);
        return;
      }

      const featureFlags = league.featureFlags as any;
      
      // Compute week highlights
      if (featureFlags?.highlights) {
        try {
          await highlightsService.computeWeekHighlights({ leagueId: data.leagueId, week: data.week });
          console.log(`[Scheduler] Computed highlights for league ${data.leagueId} week ${data.week}`);
          
          // Enqueue highlights content for later posting
          const scheduledAt = new Date(Date.now() + 5 * 60 * 1000); // Post 5 minutes later
          await contentService.enqueue({
            leagueId: data.leagueId,
            channelId: league.channelId,
            scheduledAt,
            template: 'highlight',
            payload: { week: data.week },
          });
          console.log(`[Scheduler] Enqueued highlights content for league ${data.leagueId}`);
        } catch (error) {
          console.error(`[Scheduler] Failed to compute/enqueue highlights for league ${data.leagueId}:`, error);
        }
      }

      // Enqueue digest content
      if (featureFlags?.autoDigest !== false) {
        try {
          const scheduledAt = new Date(Date.now() + 10 * 60 * 1000); // Post 10 minutes later
          await contentService.enqueue({
            leagueId: data.leagueId,
            channelId: league.channelId,
            scheduledAt,
            template: 'digest',
            payload: { week: data.week },
          });
          console.log(`[Scheduler] Enqueued digest content for league ${data.leagueId}`);
        } catch (error) {
          console.error(`[Scheduler] Failed to enqueue digest for league ${data.leagueId}:`, error);
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to process highlights_due for league ${data.leagueId}:`, error);
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        leagueId: data.leagueId,
        payload: { error: "highlights_processing_failed", message: String(error) },
      });
    }
  });

  // Phase 3: Rivalry card enqueuing (Monday 9 AM)
  eventBus.on("rivalry_due", async (data) => {
    try {
      console.log(`[Scheduler] Rivalry update due for league ${data.leagueId}`);
      
      const league = await storage.getLeague(data.leagueId);
      if (!league || !league.channelId) {
        console.warn(`Cannot process rivalry: League ${data.leagueId} not found or has no channel`);
        return;
      }

      const featureFlags = league.featureFlags as any;
      
      if (featureFlags?.rivalries) {
        try {
          // Update rivalries for current week
          await rivalriesService.updateHeadToHead({ leagueId: data.leagueId, week: data.week });
          console.log(`[Scheduler] Updated rivalries for league ${data.leagueId} week ${data.week}`);
          
          // Enqueue rivalry card content for later posting
          const scheduledAt = new Date(Date.now() + 5 * 60 * 1000); // Post 5 minutes later
          await contentService.enqueue({
            leagueId: data.leagueId,
            channelId: league.channelId,
            scheduledAt,
            template: 'rivalry',
            payload: { week: data.week },
          });
          console.log(`[Scheduler] Enqueued rivalry content for league ${data.leagueId}`);
        } catch (error) {
          console.error(`[Scheduler] Failed to update/enqueue rivalry for league ${data.leagueId}:`, error);
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to process rivalry_due for league ${data.leagueId}:`, error);
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        leagueId: data.leagueId,
        payload: { error: "rivalry_processing_failed", message: String(error) },
      });
    }
  });

  // Phase 3: Content queue poster (every 5 minutes)
  eventBus.on("content_poster_due", async () => {
    try {
      console.log(`[Scheduler] Content poster running`);
      const posted = await contentService.postQueued(new Date());
      console.log(`[Scheduler] Posted ${posted} queued content items`);
    } catch (error) {
      console.error(`[Scheduler] Failed to post queued content:`, error);
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        leagueId: null,
        payload: { error: "content_poster_failed", message: String(error) },
      });
    }
  });

  // Dev: Register Discord commands (requires admin key)
  app.post("/api/dev/register-commands", async (req, res) => {
    // Admin authentication
    const adminKey = req.headers["x-admin-key"];
    if (!env.app.adminKey || adminKey !== env.app.adminKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { guildId } = req.body;
      const commands = discordService.getSlashCommands();
      
      if (guildId) {
        await discordService.registerGuildCommands(guildId, commands);
        res.json({ 
          success: true, 
          message: `Registered ${commands.length} commands for guild ${guildId}`,
          commands: commands.map(cmd => cmd.name),
        });
      } else {
        // Global registration
        const response = await fetch(
          `https://discord.com/api/v10/applications/${env.discord.clientId}/commands`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bot ${env.discord.botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(commands),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Discord API error: ${response.statusText} - ${error}`);
        }

        res.json({ 
          success: true, 
          message: `Registered ${commands.length} global commands (takes up to 1 hour to propagate)`,
          commands: commands.map(cmd => cmd.name),
        });
      }
    } catch (error) {
      console.error("Command registration failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // === DEBUG ENDPOINT FOR OAUTH CONFIGURATION ===
  app.get("/api/debug/discord-oauth", (req, res) => {
    try {
      const base = env.app.baseUrl;
      const redirect = `${base}/discord-callback`;
      const params = new URLSearchParams({
        client_id: env.discord.clientId,
        response_type: "code",
        scope: "identify guilds",
        redirect_uri: redirect,
        prompt: "consent"
      });
      const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
      
      res.json({
        app_base_url: base,
        redirect_uri: redirect,
        discord_auth_url: url,
        client_id: env.discord.clientId
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // === SETUP WIZARD ENDPOINTS ===
  
  // Discord User OAuth Flow
  app.get("/api/discord/user-auth-url", (req, res) => {
    try {
      const sessionId = getSessionId(req);
      // Always use server's APP_BASE_URL to ensure case consistency
      const redirectUri = `${env.app.baseUrl}/discord-callback`;
      const authUrl = discordService.generateUserAuthUrl(redirectUri, sessionId);
      
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating Discord auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // Discord OAuth Callback
  app.get("/discord-callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const sessionId = getSessionId(req);
      const redirectUri = `${env.app.baseUrl}/discord-callback`;
      
      // Exchange code for token
      const tokenData = await discordService.exchangeCodeForToken(code, redirectUri);
      
      // Get user data
      const discordUser = await discordService.getCurrentUser(tokenData.access_token);
      
      // Store in session
      oAuthSessions.set(sessionId, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        discordUser
      });

      // Redirect back to setup page
      res.redirect(`${env.app.baseUrl}/setup?step=discord&success=true`);
    } catch (error) {
      console.error("Discord OAuth callback error:", error);
      res.redirect(`${env.app.baseUrl}/setup?step=discord&error=oauth_failed`);
    }
  });

  // Get current Discord user
  app.get("/api/discord/me", (req, res) => {
    const sessionId = getSessionId(req);
    const session = oAuthSessions.get(sessionId);
    
    if (!session?.discordUser) {
      return res.status(401).json({ error: "Not authenticated with Discord" });
    }
    
    res.json(session.discordUser);
  });

  // Get user's Discord guilds (filtered for manage permissions)
  app.get("/api/discord/my-guilds", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const session = oAuthSessions.get(sessionId);
      
      if (!session?.accessToken) {
        return res.status(401).json({ error: "Not authenticated with Discord" });
      }

      const guilds = await discordService.getUserGuilds(session.accessToken);
      
      // Filter guilds where user has MANAGE_GUILD permission (0x20)
      const manageableGuilds = guilds.filter(guild => 
        (parseInt(guild.permissions) & 0x20) === 0x20
      );
      
      res.json(manageableGuilds);
    } catch (error) {
      console.error("Error fetching user guilds:", error);
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });

  // Discord Bot Installation
  app.get("/api/discord/bot-install-url", (req, res) => {
    try {
      const { guildId } = req.query;
      
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: "guildId is required" });
      }

      // Use server's APP_BASE_URL for consistency
      const redirectUri = env.app.baseUrl;
      const botInstallUrl = discordService.generateBotInstallUrl(guildId, redirectUri);
      res.json({ url: botInstallUrl });
    } catch (error) {
      console.error("Error generating bot install URL:", error);
      res.status(500).json({ error: "Failed to generate bot install URL" });
    }
  });

  // Check guild status (bot installed, channels available)
  app.get("/api/discord/guild-status", async (req, res) => {
    try {
      const { guildId } = req.query;
      
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: "guildId is required" });
      }

      const status = await discordService.getGuildStatus(guildId);
      res.json(status);
    } catch (error) {
      console.error("Error checking guild status:", error);
      res.status(500).json({ error: "Failed to check guild status" });
    }
  });

  // Get guild channels
  app.get("/api/discord/channels", async (req, res) => {
    try {
      const { guildId } = req.query;
      
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: "guildId is required" });
      }

      const channels = await discordService.getGuildChannels(guildId);
      res.json({ channels });
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  // Save Discord setup (guild + channel selection)
  app.post("/api/setup/discord", async (req, res) => {
    try {
      const { guildId, channelId, timezone } = req.body;
      const sessionId = getSessionId(req);
      const session = oAuthSessions.get(sessionId);
      
      if (!session?.discordUser) {
        return res.status(401).json({ error: "Not authenticated with Discord" });
      }

      if (!guildId || !channelId) {
        return res.status(400).json({ error: "guildId and channelId are required" });
      }

      // Get or create account
      let account = await storage.getAccountByDiscordId(session.discordUser.id);
      if (!account) {
        const accountId = await storage.createAccount({
          email: `${session.discordUser.username}@discord.user`,
          discordUserId: session.discordUser.id,
        });
        account = await storage.getAccount(accountId);
      }

      if (!account) {
        return res.status(500).json({ error: "Failed to create account" });
      }

      // Check if league already exists for this guild
      let league = await storage.getLeagueByGuildId(guildId);
      
      if (league) {
        // Update existing league
        await storage.updateLeague(league.id, {
          channelId,
          timezone: timezone || "America/New_York",
        });
      } else {
        // Create new league
        const leagueId = await storage.createLeague({
          accountId: account.id,
          name: `Discord Server ${guildId}`,
          platform: "sleeper",
          guildId,
          channelId,
          timezone: timezone || "America/New_York",
        });
        league = await storage.getLeague(leagueId);
      }

      // Register slash commands for this guild
      const commands = discordService.getSlashCommands();
      await discordService.registerGuildCommands(guildId, commands);

      // Post welcome message
      await discordService.postMessage(channelId, {
        content: "🎉 **THE COMMISH installed!**\n\nI'm ready to help manage your fantasy league. Try these commands:\n• `/rules` - Query league rules and constitution\n• `/scoring` - Display current scoring settings\n• `/help` - Show command help\n\nNext, connect your Sleeper league in the setup wizard to unlock full features!"
      });

      // Log install event
      if (league) {
        await storage.createEvent({
          leagueId: league.id,
          type: "INSTALL_COMPLETED",
          payload: { guildId, channelId },
        });
      }

      // Update pending setup
      await storage.updatePendingSetup(sessionId, {
        selectedGuildId: guildId,
        selectedChannelId: channelId,
        timezone: timezone || "America/New_York",
      });

      res.json({ ok: true, leagueId: league?.id });
    } catch (error) {
      console.error("Discord setup error:", error);
      res.status(500).json({ error: "Setup failed" });
    }
  });

  // === SLEEPER SETUP ENDPOINTS ===

  // Get Sleeper leagues for a username
  app.get("/api/sleeper/leagues", async (req, res) => {
    try {
      const { username, season } = req.query;
      
      if (!username || !season || typeof username !== 'string' || typeof season !== 'string') {
        return res.status(400).json({ error: "username and season are required" });
      }

      // Get Sleeper user
      const user = await sleeperService.getUser(username);
      if (!user) {
        return res.status(404).json({ error: "Sleeper user not found" });
      }

      // Get leagues for this user
      const leagues = await sleeperService.getUserLeagues(user.user_id, season);
      
      res.json({ 
        leagues: leagues.map(l => ({
          league_id: l.league_id,
          name: l.name,
          season: l.season,
          total_rosters: l.total_rosters,
          status: l.status
        }))
      });
    } catch (error) {
      console.error("Error fetching Sleeper leagues:", error);
      res.status(500).json({ error: "Failed to fetch Sleeper leagues" });
    }
  });

  // Save Sleeper setup
  app.post("/api/setup/sleeper", async (req, res) => {
    try {
      const { sleeperLeagueId } = req.body;
      const sessionId = getSessionId(req);
      const session = oAuthSessions.get(sessionId);
      
      if (!session?.discordUser) {
        return res.status(401).json({ error: "Not authenticated with Discord" });
      }

      if (!sleeperLeagueId) {
        return res.status(400).json({ error: "sleeperLeagueId is required" });
      }

      // Get pending setup
      const pendingSetup = await storage.getPendingSetup(sessionId);
      if (!pendingSetup?.selectedGuildId) {
        return res.status(400).json({ error: "Discord setup not completed" });
      }

      // Update league with Sleeper info
      const league = await storage.getLeagueByGuildId(pendingSetup.selectedGuildId);
      if (!league) {
        return res.status(404).json({ error: "League not found" });
      }

      await storage.updateLeague(league.id, {
        sleeperLeagueId
      });

      // Update pending setup
      await storage.updatePendingSetup(sessionId, {
        selectedLeagueId: sleeperLeagueId
      });

      // Log event
      await storage.createEvent({
        leagueId: league.id,
        type: "SLEEPER_SYNCED",
        payload: { sleeperLeagueId },
      });

      res.json({ ok: true, leagueId: league.id });
    } catch (error) {
      console.error("Sleeper setup error:", error);
      res.status(500).json({ error: "Setup failed" });
    }
  });

  // Set home channel for setup
  app.post("/api/setup/discord/set-home-channel", async (req, res) => {
    try {
      const { guildId, channelId } = req.body;
      
      if (!guildId || !channelId) {
        return res.status(400).json({ error: "guildId and channelId are required" });
      }

      const sessionId = getSessionId(req);
      
      // Update pending setup
      await storage.updatePendingSetup(sessionId, {
        selectedGuildId: guildId,
        selectedChannelId: channelId
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting home channel:", error);
      res.status(500).json({ error: "Failed to set home channel" });
    }
  });

  // Sleeper Discovery
  app.post("/api/setup/sleeper/find", async (req, res) => {
    try {
      const { username, season } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: "username is required" });
      }

      const currentSeason = season || new Date().getFullYear().toString();
      const sessionId = getSessionId(req);
      
      // Get user ID from Sleeper
      const user = await sleeperService.getUser(username);
      if (!user) {
        return res.status(404).json({ error: "Sleeper user not found" });
      }

      // Get user's leagues for the season
      const leagues = await sleeperService.getUserLeagues(user.user_id, currentSeason);
      
      // Update pending setup
      await storage.updatePendingSetup(sessionId, {
        sleeperUsername: username,
        sleeperSeason: currentSeason
      });

      res.json({
        leagues: leagues.map((league: any) => ({
          league_id: league.league_id,
          name: league.name,
          avatar: league.avatar || null,
          season: league.season
        }))
      });
    } catch (error) {
      console.error("Error finding Sleeper leagues:", error);
      res.status(500).json({ error: "Failed to find Sleeper leagues" });
    }
  });

  // Select Sleeper league
  app.post("/api/setup/sleeper/select", async (req, res) => {
    try {
      const { leagueId } = req.body;
      
      if (!leagueId) {
        return res.status(400).json({ error: "leagueId is required" });
      }

      const sessionId = getSessionId(req);
      
      // Update pending setup
      await storage.updatePendingSetup(sessionId, {
        selectedLeagueId: leagueId
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error selecting Sleeper league:", error);
      res.status(500).json({ error: "Failed to select league" });
    }
  });

  // Finalize setup
  app.post("/api/setup/finish", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const pendingSetup = await storage.getPendingSetup(sessionId);
      const session = oAuthSessions.get(sessionId);
      
      if (!pendingSetup || !session?.discordUser) {
        return res.status(400).json({ error: "Incomplete setup data" });
      }

      const { selectedGuildId, selectedChannelId, selectedLeagueId, timezone } = pendingSetup;
      
      if (!selectedGuildId || !selectedChannelId || !selectedLeagueId) {
        return res.status(400).json({ error: "Missing required setup data" });
      }

      // 1. Create/get account
      let account = await storage.getAccountByDiscordId(session.discordUser.id);
      if (!account) {
        const accountId = await storage.createAccount({
          email: session.discordUser.email || `${session.discordUser.id}@discord.user`,
          discordUserId: session.discordUser.id
        });
        account = await storage.getAccount(accountId);
      }

      if (!account) {
        throw new Error("Failed to create account");
      }

      // 2. Get league info from Sleeper
      const leagueInfo = await sleeperService.getLeague(selectedLeagueId);
      
      // 3. Create league record
      const leagueId = await storage.createLeague({
        accountId: account.id,
        name: leagueInfo.name,
        platform: "sleeper",
        sleeperLeagueId: selectedLeagueId,
        guildId: selectedGuildId,
        channelId: selectedChannelId,
        timezone: timezone || "America/New_York"
      });

      // 4. Create member record (commissioner)
      await storage.createMember({
        leagueId,
        discordUserId: session.discordUser.id,
        role: "COMMISH"
      });

      // 5. Register slash commands for guild (server-side)
      const commands = discordService.getSlashCommands();
      await discordService.registerGuildCommands(selectedGuildId, commands);

      // 6. Post welcome message (if bot is present)
      try {
        await discordService.postWelcomeMessage(selectedChannelId, {
          leagueId,
          leagueName: leagueInfo.name,
          guildId: selectedGuildId
        });
      } catch (error) {
        console.warn("Failed to post welcome message:", error);
      }

      // 7. Clean up pending setup
      await storage.deletePendingSetup(sessionId);
      oAuthSessions.delete(sessionId);

      res.json({
        success: true,
        leagueId,
        guildId: selectedGuildId,
        channelId: selectedChannelId
      });
    } catch (error) {
      console.error("Error finishing setup:", error);
      res.status(500).json({ error: "Failed to complete setup" });
    }
  });

  // Get setup status for resuming wizard
  app.get("/api/setup/status", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const pendingSetup = await storage.getPendingSetup(sessionId);
      const session = oAuthSessions.get(sessionId);

      res.json({
        discord: {
          user: session?.discordUser || null,
          selectedGuild: pendingSetup?.selectedGuildId || null,
          selectedChannel: pendingSetup?.selectedChannelId || null
        },
        sleeper: {
          username: pendingSetup?.sleeperUsername || null,
          season: pendingSetup?.sleeperSeason || null,
          selectedLeague: pendingSetup?.selectedLeagueId || null
        },
        timezone: pendingSetup?.timezone || null
      });
    } catch (error) {
      console.error("Error getting setup status:", error);
      res.status(500).json({ error: "Failed to get setup status" });
    }
  });

  // === PHASE 2 API ENDPOINTS (v2) ===

  // Helper for auth check (admin key OR commissioner role)
  async function checkAuthV2(req: any, leagueId: string, requireCommissioner: boolean = true): Promise<{ authorized: boolean; userId?: string; error?: string }> {
    // Check admin key first
    const adminKey = req.headers["x-admin-key"];
    if (env.app.adminKey && adminKey === env.app.adminKey) {
      return { authorized: true };
    }

    // If commissioner role required, check userId
    if (requireCommissioner) {
      const userId = req.body.userId || req.headers["x-user-id"];
      if (!userId) {
        return { authorized: false, error: "userId required in body or X-User-Id header" };
      }

      const isCommish = await isUserCommish(leagueId, userId);
      if (!isCommish) {
        return { authorized: false, error: "Commissioner role required" };
      }

      return { authorized: true, userId };
    }

    return { authorized: false, error: "Unauthorized" };
  }

  // 1. POST /api/v2/vibes/score - Score message sentiment/toxicity
  app.post("/api/v2/vibes/score", async (req, res) => {
    try {
      // Validate request body
      const validation = vibesScoreSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      const { leagueId, channelId, messageId, authorId, text } = validation.data;

      // Auth check (admin key OR commissioner)
      const auth = await checkAuthV2(req, leagueId, true);
      if (!auth.authorized) {
        return res.status(401).json({ error: auth.error || "Unauthorized" });
      }

      // Score message
      const result = await vibesService.scoreMessage({
        leagueId,
        channelId,
        messageId,
        authorId,
        text,
      });

      // Emit event
      eventBus.emit("vibes_scored", {
        leagueId,
        channelId,
        messageId,
        authorId,
        toxicity: result.toxicity,
        sentiment: result.sentiment,
      });

      // Check for toxicity threshold and send alert if needed
      const league = await storage.getLeague(leagueId);
      if (league) {
        const featureFlags = league.featureFlags as any;
        const vibesMonitorEnabled = featureFlags?.vibesMonitor !== false;
        const threshold = featureFlags?.vibesThreshold || 0.7;

        if (vibesMonitorEnabled && result.toxicity >= threshold) {
          const members = await storage.getMembersByLeague(leagueId);
          const commissioner = members.find((m: Member) => m.role === "COMMISH");
          
          if (commissioner?.discordUserId) {
            try {
              await sendToxicityAlert({
                commissionerUserId: commissioner.discordUserId,
                leagueId,
                channelId,
                messageId,
                authorId,
                toxicityScore: result.toxicity,
                messageText: text,
              });
              
              console.log(`Toxicity alert sent to commissioner ${commissioner.discordUserId} for league ${leagueId}`);
            } catch (error) {
              console.error("Failed to send toxicity alert:", error);
            }
          }
        }
      }

      res.json({
        toxicity: result.toxicity,
        sentiment: result.sentiment,
      });
    } catch (error) {
      console.error("Vibes score error:", error);
      res.status(500).json({ error: "Failed to score message", code: "VIBES_SCORE_FAILED" });
    }
  });

  // 2. POST /api/v2/mod/freeze - Freeze thread
  app.post("/api/v2/mod/freeze", async (req, res) => {
    try {
      // Validate request body
      const validation = modFreezeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      const { leagueId, channelId, minutes, reason } = validation.data;

      // Auth check (commissioner required)
      const auth = await checkAuthV2(req, leagueId, true);
      if (!auth.authorized) {
        return res.status(401).json({ error: auth.error || "Unauthorized" });
      }

      // Freeze thread
      const actionId = await moderationService.freezeThread({
        leagueId,
        channelId,
        minutes,
        reason,
      });

      // Emit event
      eventBus.emit("thread_frozen", {
        leagueId,
        channelId,
        minutes,
        reason,
        actionId,
      });

      res.json({
        ok: true,
        actionId,
      });
    } catch (error) {
      console.error("Mod freeze error:", error);
      res.status(500).json({ error: "Failed to freeze thread", code: "MOD_FREEZE_FAILED" });
    }
  });

  // 3. POST /api/v2/mod/clarify-rule - Clarify rule via RAG
  app.post("/api/v2/mod/clarify-rule", async (req, res) => {
    try {
      // Validate request body
      const validation = modClarifyRuleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      const { leagueId, channelId, question } = validation.data;

      // Auth check (commissioner required)
      const auth = await checkAuthV2(req, leagueId, true);
      if (!auth.authorized) {
        return res.status(401).json({ error: auth.error || "Unauthorized" });
      }

      // Clarify rule
      const messageId = await moderationService.clarifyRule({
        leagueId,
        channelId,
        ruleQuery: question,
      });

      // Emit event
      eventBus.emit("rule_clarified", {
        leagueId,
        channelId,
        question,
        messageId,
      });

      res.json({
        ok: true,
        messageId,
      });
    } catch (error) {
      console.error("Mod clarify rule error:", error);
      res.status(500).json({ error: "Failed to clarify rule", code: "MOD_CLARIFY_FAILED" });
    }
  });

  // 4. GET /api/v2/disputes - List disputes with optional filtering
  app.get("/api/v2/disputes", async (req, res) => {
    try {
      const { leagueId, status } = req.query;

      if (!leagueId || typeof leagueId !== 'string') {
        return res.status(400).json({ error: "leagueId query parameter is required" });
      }

      // Get disputes for league
      const allDisputes = await storage.getDisputesByLeague(leagueId);
      
      // Filter by status if provided
      let disputes = allDisputes;
      if (status && typeof status === 'string') {
        disputes = allDisputes.filter(d => d.status === status);
      }

      res.json({ disputes });
    } catch (error) {
      console.error("List disputes error:", error);
      res.status(500).json({ error: "Failed to list disputes", code: "DISPUTES_LIST_FAILED" });
    }
  });

  // 5. POST /api/v2/disputes - Open dispute
  app.post("/api/v2/disputes", async (req, res) => {
    try {
      // Validate request body
      const validation = createDisputeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      const { leagueId, kind, subjectId, openedBy, details } = validation.data;

      // Create dispute
      const disputeId = await storage.createDispute({
        leagueId,
        kind,
        subjectId,
        openedBy,
        details,
      });

      const dispute = await storage.getDispute(disputeId);

      // Emit event
      eventBus.emit("dispute_opened", {
        leagueId,
        disputeId,
        kind,
        openedBy,
      });

      res.json(dispute);
    } catch (error) {
      console.error("Create dispute error:", error);
      res.status(500).json({ error: "Failed to create dispute", code: "DISPUTE_CREATE_FAILED" });
    }
  });

  // 6. PATCH /api/v2/disputes/:id - Update dispute
  app.patch("/api/v2/disputes/:id", async (req, res) => {
    try {
      const disputeId = req.params.id;

      // Validate request body
      const validation = updateDisputeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      const { status, resolution } = validation.data;

      // Get existing dispute
      const existingDispute = await storage.getDispute(disputeId);
      if (!existingDispute) {
        return res.status(404).json({ error: "Dispute not found" });
      }

      // Update dispute
      await storage.updateDispute(disputeId, {
        status,
        resolution,
      });

      const updatedDispute = await storage.getDispute(disputeId);

      // Emit event if resolved or dismissed
      if (status === "resolved" || status === "dismissed") {
        eventBus.emit("dispute_resolved", {
          leagueId: existingDispute.leagueId,
          disputeId,
          status,
          resolution,
        });
      }

      res.json(updatedDispute);
    } catch (error) {
      console.error("Update dispute error:", error);
      res.status(500).json({ error: "Failed to update dispute", code: "DISPUTE_UPDATE_FAILED" });
    }
  });

  // 7. GET /api/v2/trades/evaluate/:leagueId/:tradeId - Get trade evaluation
  app.get("/api/v2/trades/evaluate/:leagueId/:tradeId", async (req, res) => {
    try {
      const { leagueId, tradeId } = req.params;

      // Get trade evaluation from storage
      const evaluation = await storage.getTradeEvaluation(leagueId, tradeId);
      
      if (!evaluation) {
        return res.status(404).json({ 
          error: "Trade evaluation not found",
          message: "This trade has not been evaluated yet. Use POST /api/v2/trades/evaluate to create an evaluation."
        });
      }

      res.json({
        fairness: evaluation.fairnessScore ? parseFloat(evaluation.fairnessScore) : 0,
        rationale: evaluation.rationale || "No rationale provided",
        timestamp: evaluation.createdAt,
      });
    } catch (error) {
      console.error("Get trade evaluation error:", error);
      res.status(500).json({ error: "Failed to get trade evaluation", code: "TRADE_EVAL_GET_FAILED" });
    }
  });

  // 8. POST /api/v2/trades/evaluate - Evaluate trade fairness
  app.post("/api/v2/trades/evaluate", async (req, res) => {
    try {
      // Validate request body
      const validation = evaluateTradeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      const { leagueId, tradeId, proposal } = validation.data;

      // Evaluate trade
      const result = await tradeFairnessService.evaluateTrade({
        leagueId,
        tradeId,
        proposal,
      });

      // Emit event
      eventBus.emit("trade_evaluated", {
        leagueId,
        tradeId,
        score: result.score,
        rationale: result.rationale,
      });

      res.json({
        fairness: result.score,
        rationale: result.rationale,
      });
    } catch (error) {
      console.error("Trade evaluate error:", error);
      res.status(500).json({ error: "Failed to evaluate trade", code: "TRADE_EVALUATE_FAILED" });
    }
  });

  // === PHASE 3 ENGAGEMENT ENDPOINTS ===

  // 1. POST /api/v2/highlights/compute - Compute and store week highlights
  app.post("/api/v2/highlights/compute", async (req, res) => {
    try {
      // Validate request body
      const validation = computeHighlightsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      let { leagueId, week } = validation.data;

      // Auth check (admin key OR commissioner)
      const auth = await checkAuthV2(req, leagueId, true);
      if (!auth.authorized) {
        return res.status(403).json({ error: auth.error || "Unauthorized", code: "AUTH_REQUIRED" });
      }

      // Verify league exists
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: "League not found", code: "LEAGUE_NOT_FOUND" });
      }

      // If week not provided, use current week from Sleeper
      if (!week) {
        week = await sleeperService.getCurrentWeek();
      }

      // Compute highlights
      const summary = await highlightsService.computeWeekHighlights({ leagueId, week });

      // Get the computed highlights
      const highlights = await storage.getHighlightsByLeagueWeek(leagueId, week);

      // Emit event
      eventBus.emit("highlights_computed", {
        leagueId,
        week,
        count: summary.total,
      });

      res.json({
        computed: summary.total,
        highlights,
      });
    } catch (error) {
      console.error("Compute highlights error:", error);
      res.status(500).json({ error: "Failed to compute highlights", code: "HIGHLIGHTS_COMPUTE_FAILED" });
    }
  });

  // 2. GET /api/v2/highlights - List highlights
  app.get("/api/v2/highlights", async (req, res) => {
    try {
      // Validate query params
      const validation = getHighlightsSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: validation.error.issues });
      }

      const { leagueId, week } = validation.data;

      // Verify league exists
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: "League not found", code: "LEAGUE_NOT_FOUND" });
      }

      // Get highlights
      let highlights;
      if (week !== undefined) {
        highlights = await storage.getHighlightsByLeagueWeek(leagueId, week);
      } else {
        // If no week specified, return all highlights for the league
        highlights = await storage.getHighlightsByLeagueWeek(leagueId, 0);
      }

      res.json({ highlights });
    } catch (error) {
      console.error("Get highlights error:", error);
      res.status(500).json({ error: "Failed to get highlights", code: "HIGHLIGHTS_GET_FAILED" });
    }
  });

  // 3. POST /api/v2/rivalries/update - Update rivalry records
  app.post("/api/v2/rivalries/update", async (req, res) => {
    try {
      // Validate request body
      const validation = updateRivalriesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      let { leagueId, week } = validation.data;

      // Auth check (admin key OR commissioner)
      const auth = await checkAuthV2(req, leagueId, true);
      if (!auth.authorized) {
        return res.status(403).json({ error: auth.error || "Unauthorized", code: "AUTH_REQUIRED" });
      }

      // Verify league exists
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: "League not found", code: "LEAGUE_NOT_FOUND" });
      }

      // If week not provided, use current week from Sleeper
      if (!week) {
        week = await sleeperService.getCurrentWeek();
      }

      // Update rivalries
      await rivalriesService.updateHeadToHead({ leagueId, week });

      // Emit event
      eventBus.emit("rivalries_updated", {
        leagueId,
        week,
      });

      res.json({
        updated: 1,
        message: `Rivalries updated for week ${week}`,
      });
    } catch (error) {
      console.error("Update rivalries error:", error);
      res.status(500).json({ error: "Failed to update rivalries", code: "RIVALRIES_UPDATE_FAILED" });
    }
  });

  // GET /api/v2/rivalries - List all rivalries for a league
  app.get("/api/v2/rivalries", async (req, res) => {
    try {
      // Validate query params
      const validation = getRivalriesSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: validation.error.issues });
      }

      const { leagueId } = validation.data;

      // Verify league exists
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: "League not found", code: "LEAGUE_NOT_FOUND" });
      }

      // Get all rivalries for the league
      const rivalries = await storage.getRivalriesByLeague(leagueId);

      res.json({ rivalries });
    } catch (error) {
      console.error("Get rivalries error:", error);
      res.status(500).json({ error: "Failed to get rivalries", code: "RIVALRIES_GET_FAILED" });
    }
  });

  // 4. POST /api/v2/content/enqueue - Queue content for posting
  app.post("/api/v2/content/enqueue", async (req, res) => {
    try {
      // Validate request body
      const validation = enqueueContentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request body", details: validation.error.issues });
      }

      const { leagueId, channelId, scheduledAt, template, payload } = validation.data;

      // Auth check (admin key OR commissioner)
      const auth = await checkAuthV2(req, leagueId, true);
      if (!auth.authorized) {
        return res.status(403).json({ error: auth.error || "Unauthorized", code: "AUTH_REQUIRED" });
      }

      // Verify league exists
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: "League not found", code: "LEAGUE_NOT_FOUND" });
      }

      // Enqueue content
      const queuedItem = await contentService.enqueue({
        leagueId,
        channelId,
        scheduledAt: new Date(scheduledAt),
        template,
        payload,
      });

      // Emit event
      eventBus.emit("content_queued", {
        leagueId,
        template,
        scheduledAt,
      });

      res.status(201).json(queuedItem);
    } catch (error) {
      console.error("Enqueue content error:", error);
      res.status(500).json({ error: "Failed to enqueue content", code: "CONTENT_ENQUEUE_FAILED" });
    }
  });

  // GET /api/v2/content/queue - List content queue items
  app.get("/api/v2/content/queue", async (req, res) => {
    try {
      // Validate query params
      const validation = getContentQueueSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: validation.error.issues });
      }

      const { leagueId, status } = validation.data;

      // Verify league exists
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: "League not found", code: "LEAGUE_NOT_FOUND" });
      }

      // Get content queue items
      const queue = await storage.getContentQueueByLeague(leagueId, status);

      res.json({ queue });
    } catch (error) {
      console.error("Get content queue error:", error);
      res.status(500).json({ error: "Failed to get content queue", code: "CONTENT_QUEUE_GET_FAILED" });
    }
  });

  // 5. POST /api/v2/content/run - Run content poster (CRON-like)
  app.post("/api/v2/content/run", async (req, res) => {
    try {
      // Admin authentication
      const adminKey = req.headers["x-admin-key"];
      if (!env.app.adminKey || adminKey !== env.app.adminKey) {
        return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // Post queued content
      const posted = await contentService.postQueued(new Date());

      // Emit event
      eventBus.emit("content_posted", {
        count: posted,
      });

      res.json({ posted });
    } catch (error) {
      console.error("Run content poster error:", error);
      res.status(500).json({ error: "Failed to run content poster", code: "CONTENT_RUN_FAILED" });
    }
  });

  // === END PHASE 3 ENDPOINTS ===

  // === END SETUP WIZARD ENDPOINTS ===

  // === /api/v2 ALIASES (CDN Cache Bypass) ===
  // Temporary aliases to bypass potential CDN caching of old HTML responses
  // These delegate to the original handlers
  
  app.get("/api/v2/leagues/:leagueId", (req, res, next) => {
    req.url = `/api/leagues/${req.params.leagueId}`;
    next();
  });

  app.patch("/api/v2/leagues/:leagueId", (req, res, next) => {
    req.url = `/api/leagues/${req.params.leagueId}`;
    next();
  });

  app.post("/api/v2/polls", (req, res, next) => {
    req.url = `/api/polls`;
    next();
  });
  
  // === END /api/v2 ALIASES ===

  // Health check with real database connectivity test
  app.get("/api/health", async (req, res) => {
    const startTime = Date.now();
    const issues: { service: string; reason: string }[] = [];
    const latencies: Record<string, number> = {};
    
    // Test DeepSeek service
    const deepSeekStart = Date.now();
    const deepSeekHealthy = await deepSeekService.healthCheck();
    latencies.deepseek = Date.now() - deepSeekStart;
    if (!deepSeekHealthy) {
      issues.push({ service: "deepseek", reason: "Health check failed" });
    }
    
    // Test database connectivity with real query
    let databaseStatus = "connected";
    try {
      const dbStart = Date.now();
      await storage.runRawSQL("SELECT 1");
      latencies.database = Date.now() - dbStart;
    } catch (error) {
      databaseStatus = "error";
      issues.push({ service: "database", reason: String(error) });
      console.error("Database health check failed:", error);
      latencies.database = -1;
    }

    // Test OpenAI embeddings availability
    let embeddingsStatus = "available";
    try {
      if (!env.openai.apiKey) {
        embeddingsStatus = "not_configured";
        issues.push({ service: "embeddings", reason: "API key not configured" });
        latencies.openai = -1;
      } else {
        const embedStart = Date.now();
        // Quick health check - just verify config
        embeddingsStatus = "healthy";
        latencies.openai = Date.now() - embedStart;
      }
    } catch (error) {
      embeddingsStatus = "error";
      issues.push({ service: "embeddings", reason: String(error) });
      latencies.openai = -1;
    }

    // Test Sleeper API availability
    let sleeperStatus = "available";
    try {
      const sleeperStart = Date.now();
      // Simple health check - Sleeper API state endpoint
      await fetch("https://api.sleeper.app/v1/state/nfl");
      latencies.sleeper = Date.now() - sleeperStart;
      sleeperStatus = "healthy";
    } catch (error) {
      sleeperStatus = "error";
      issues.push({ service: "sleeper", reason: "API unreachable" });
      latencies.sleeper = -1;
    }

    // Test Discord bot status
    let discordStatus = "configured";
    try {
      if (!env.discord.botToken || !env.discord.clientId) {
        discordStatus = "not_configured";
        issues.push({ service: "discord", reason: "Bot credentials not configured" });
      } else {
        discordStatus = "disconnected";
        issues.push({ service: "discord", reason: "Bot not connected to gateway" });
      }
    } catch (error) {
      discordStatus = "error";
      issues.push({ service: "discord", reason: String(error) });
    }

    // Determine overall status
    const status = issues.length === 0 ? "ok" : issues.length <= 2 ? "degraded" : "critical";
    latencies.total = Date.now() - startTime;
    
    res.json({
      status,
      timestamp: new Date().toISOString(),
      latency: latencies.total,
      services: {
        database: databaseStatus,
        deepseek: deepSeekHealthy ? "healthy" : "error",
        discord: discordStatus,
        sleeper: sleeperStatus,
        embeddings: embeddingsStatus
      },
      providers: {
        llm: {
          provider: "deepseek",
          model: "deepseek-chat",
          latency: latencies.deepseek
        },
        embeddings: {
          provider: "openai",
          model: env.openai.embedModel,
          dimension: env.openai.embedDim,
          latency: latencies.openai
        },
        platform: {
          provider: "sleeper",
          latency: latencies.sleeper
        }
      },
      performance: {
        database_ms: latencies.database,
        deepseek_ms: latencies.deepseek,
        openai_ms: latencies.openai,
        sleeper_ms: latencies.sleeper,
        total_ms: latencies.total
      },
      ...(issues.length > 0 && { issues })
    });
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
  app.post("/api/discord/interactions", express.raw({ type: '*/*' }), async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      const signature = req.headers["x-signature-ed25519"] as string;
      const timestamp = req.headers["x-signature-timestamp"] as string;
      const publicKey = env.discord.publicKey;

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
        const adminCommands = ["config", "reindex", "freeze", "clarify", "trade_fairness"];
        
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
          case "whoami":
            response = await handleWhoamiCommand(interaction, league!, requestId);
            break;
          case "freeze":
            response = await handleFreezeCommand(interaction, league!, requestId);
            break;
          case "clarify":
            response = await handleClarifyCommand(interaction, league!, requestId);
            break;
          case "trade_fairness":
            response = await handleTradeFairnessCommand(interaction, league!, requestId);
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

      // Handle component interactions (channel select, buttons, etc.)
      if (interaction.type === 3) {
        const customId = interaction.data?.custom_id;
        
        if (customId === "select_home_channel") {
          return await handleChannelSelect(req, res, interaction);
        }
        
        // Handle toxicity alert action buttons
        if (customId?.startsWith("toxicity_freeze_")) {
          return await handleToxicityFreezeButton(req, res, interaction);
        }
        
        if (customId?.startsWith("toxicity_clarify_")) {
          return await handleToxicityClarifyButton(req, res, interaction);
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
  
  // Demo endpoint - returns all leagues without auth (for testing/development only)
  app.get("/api/demo/leagues", async (req, res) => {
    try {
      // Get all leagues (demo mode - no auth check)
      const allLeagues = await storage.getAllLeagues();
      res.json({ leagues: allLeagues });
    } catch (error) {
      console.error("Demo leagues error:", error);
      res.status(500).json({ error: "Failed to fetch leagues" });
    }
  });

  // Demo endpoint - returns single league by ID without auth (for testing/development only)
  app.get("/api/demo/leagues/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const league = await storage.getLeague(leagueId);
      
      if (!league) {
        return res.status(404).json({ error: "League not found" });
      }
      
      res.json({ league });
    } catch (error) {
      console.error("Demo league detail error:", error);
      res.status(500).json({ error: "Failed to fetch league" });
    }
  });

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
        const timezone = league.timezone || 'America/New_York';
        
        scheduler.scheduleWeeklyDigest(
          leagueId, 
          timezone,
          (league as any).digestDay || 'Sunday',
          (league as any).digestTime || '09:00'
        );
        scheduler.scheduleSyncJob(leagueId);
        
        // Phase 3: Schedule highlights digest (Sunday 8 PM)
        const getCurrentWeek = () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), 8, 1); // Sept 1
          const diff = now.getTime() - start.getTime();
          const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
          return Math.max(1, Math.min(18, week));
        };
        
        scheduler.scheduleHighlightsDigest(leagueId, timezone, getCurrentWeek);
        scheduler.scheduleRivalryCard(leagueId, timezone, getCurrentWeek);
        
        console.log(`Scheduled Phase 3 jobs for league ${leagueId}`);
      }

      res.json({ id: leagueId, league });
    } catch (error) {
      console.error("Failed to create league:", error);
      res.status(500).json({ error: "Failed to create league" });
    }
  });

  app.get("/api/leagues/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const league = await storage.getLeague(leagueId);
      
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      res.json(league);
    } catch (error) {
      console.error("Failed to get league:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get league" } });
    }
  });

  app.patch("/api/leagues/:leagueId", async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const { leagueId } = req.params;
      const updateData = z.object({
        featureFlags: z.record(z.unknown()).optional(),
        tone: z.string().optional(),
        timezone: z.string().optional(),
      }).parse(req.body);

      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      // Update league
      await storage.updateLeague(leagueId, updateData);
      const updatedLeague = await storage.getLeague(leagueId);

      const latency = Date.now() - startTime;
      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId,
        payload: { command: "league_settings_updated", updates: Object.keys(updateData) },
        requestId,
        latency,
      });

      res.json({ success: true, league: updatedLeague });
    } catch (error) {
      console.error("Failed to update league:", error);
      const latency = Date.now() - startTime;
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        payload: { error: String(error), endpoint: "/api/leagues/:leagueId" },
        requestId,
        latency,
      });
      res.status(500).json({ error: { code: "UPDATE_FAILED", message: "Failed to update league" } });
    }
  });

  // V2 routes (cache-busting namespace)
  app.get("/api/v2/leagues/:leagueId", async (req, res) => {
    try {
      const { leagueId } = req.params;
      const league = await storage.getLeague(leagueId);
      
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      res.json(league);
    } catch (error) {
      console.error("Failed to get league:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get league" } });
    }
  });

  app.patch("/api/v2/leagues/:leagueId", async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const { leagueId } = req.params;
      const updateData = z.object({
        featureFlags: z.record(z.unknown()).optional(),
        tone: z.string().optional(),
        timezone: z.string().optional(),
      }).parse(req.body);

      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      await storage.updateLeague(leagueId, updateData);
      const updatedLeague = await storage.getLeague(leagueId);

      const latency = Date.now() - startTime;
      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId,
        payload: { command: "league_settings_updated", updates: Object.keys(updateData) },
        requestId,
        latency,
      });

      res.json({ success: true, league: updatedLeague });
    } catch (error) {
      console.error("Failed to update league:", error);
      const latency = Date.now() - startTime;
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        payload: { error: String(error), endpoint: "/api/v2/leagues/:leagueId" },
        requestId,
        latency,
      });
      res.status(500).json({ error: { code: "UPDATE_FAILED", message: "Failed to update league" } });
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
      const { query, limit, threshold, includePassages } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }

      const results = await ragService.searchSimilarRules(
        leagueId,
        query,
        limit || 5,
        threshold || 0.7,
        includePassages !== false // Default to true
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
    // Validate X-Admin-Key header
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== env.app.adminKey) {
      return res.status(401).json({ error: "Unauthorized - valid X-Admin-Key required" });
    }

    try {
      const { leagueId } = req.query;
      
      if (!leagueId) {
        return res.status(400).json({ error: "leagueId is required" });
      }

      const league = await storage.getLeague(leagueId as string);
      if (!league) {
        return res.status(404).json({ error: "League not found" });
      }

      // Generate real digest using Sleeper data
      if (!league.sleeperLeagueId) {
        return res.status(400).json({ error: "League not configured with Sleeper ID" });
      }

      let digestContent;
      try {
        const sleeperData = await sleeperService.syncLeagueData(league.sleeperLeagueId);
        
        // Generate digest with real data
        digestContent = await generateDigestContent(league, {
          ...sleeperData,
          matchups: sleeperData.matchups || []
        });
      } catch (error) {
        console.warn("Failed to fetch Sleeper data, using fallback digest:", error);
        digestContent = {
          leagueId: league.id,
          leagueName: league.name,
          timestamp: new Date().toISOString(),
          sections: [
            {
              title: "Digest Generation",
              content: "Unable to fetch current league data. Please check your Sleeper league configuration.",
            },
          ],
          error: "Sleeper data unavailable",
        };
      }

      // Log the digest generation
      console.log(`Manual digest generated for league ${league.id}`);

      res.json({
        message: "Digest generated successfully",
        leagueId: league.id,
        digest: digestContent,
        note: digestContent.error ? "Digest generated with fallback data due to Sleeper API issues." : "Digest generated with live Sleeper data.",
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

  // POST /api/setup/activate - Final activation step
  app.post("/api/setup/activate", async (req, res) => {
    try {
      const { accountId, guildId } = req.body;
      
      if (!guildId) {
        return res.status(400).json({ error: { code: "MISSING_GUILD", message: "Guild ID is required" } });
      }

      // Get league by guild ID
      const league = await storage.getLeagueByGuildId(guildId);
      if (!league) {
        return res.status(404).json({ error: { code: "LEAGUE_NOT_FOUND", message: "League not found for this guild" } });
      }

      // Verify it has channel configured
      if (!league.channelId) {
        return res.status(400).json({ error: { code: "NO_CHANNEL", message: "No channel configured. Complete Discord setup first." } });
      }

      // Update league timestamp
      await storage.updateLeague(league.id, { 
        updatedAt: new Date()
      });

      // Log activation event
      await storage.createEvent({
        type: "INSTALL_COMPLETED",
        leagueId: league.id,
        payload: { guildId, accountId, event: "activation" },
      });

      res.json({ 
        success: true, 
        message: "League activated successfully",
        leagueId: league.id 
      });
    } catch (error) {
      console.error("Failed to activate league:", error);
      res.status(500).json({ error: { code: "ACTIVATION_FAILED", message: "Failed to activate league" } });
    }
  });

  // POST /api/discord/register-commands - Register slash commands for a guild
  app.post("/api/discord/register-commands", async (req, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!env.app.adminKey || adminKey !== env.app.adminKey) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Admin key required" } });
    }

    try {
      const { guildId } = req.query;
      
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: { code: "MISSING_GUILD", message: "Guild ID required in query" } });
      }

      const commands = discordService.getSlashCommands();
      await discordService.registerGuildCommands(guildId, commands);

      res.json({ 
        success: true, 
        message: `Registered ${commands.length} slash commands`,
        commands: commands.map(cmd => cmd.name),
        guildId 
      });
    } catch (error) {
      console.error("Failed to register commands:", error);
      res.status(500).json({ error: { code: "REGISTRATION_FAILED", message: "Failed to register commands" } });
    }
  });

  // POST /api/discord/post-test - Post a test message to the league channel
  app.post("/api/discord/post-test", async (req, res) => {
    const adminKey = req.headers["x-admin-key"];
    if (!env.app.adminKey || adminKey !== env.app.adminKey) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Admin key required" } });
    }

    try {
      const { guildId } = req.query;
      
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: { code: "MISSING_GUILD", message: "Guild ID required in query" } });
      }

      const league = await storage.getLeagueByGuildId(guildId);
      if (!league || !league.channelId) {
        return res.status(404).json({ error: { code: "NO_CHANNEL", message: "No channel configured for this guild" } });
      }

      const embed = {
        title: "🤖 Test Message from THE COMMISH",
        description: "This is a test message to verify that the bot is working correctly!",
        color: 0x00D2FF,
        fields: [
          { name: "Status", value: "✅ Connected", inline: true },
          { name: "League", value: league.name || "Unknown", inline: true },
        ],
        footer: { text: "THE COMMISH • Your Fantasy Football Assistant" },
        timestamp: new Date().toISOString(),
      };

      await discordService.postMessage(league.channelId, { embeds: [embed] });

      res.json({ 
        success: true, 
        message: "Test message posted successfully",
        channelId: league.channelId 
      });
    } catch (error) {
      console.error("Failed to post test message:", error);
      res.status(500).json({ error: { code: "POST_FAILED", message: "Failed to post test message" } });
    }
  });

  // GET /api/owners - Get owner mappings for a league
  app.get("/api/owners", async (req, res) => {
    try {
      const { leagueId } = req.query;
      
      if (!leagueId || typeof leagueId !== 'string') {
        return res.status(400).json({ error: { code: "MISSING_LEAGUE", message: "League ID required" } });
      }

      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "LEAGUE_NOT_FOUND", message: "League not found" } });
      }

      // Get all owner mappings for this league
      const mappings = await storage.getOwnerMappings(leagueId);

      res.json(mappings);
    } catch (error) {
      console.error("Failed to get owners:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get owners" } });
    }
  });

  // GET /api/owners/data - Get all data needed for owner mapping UI
  app.get("/api/owners/data", async (req, res) => {
    try {
      const { leagueId } = req.query;
      
      if (!leagueId || typeof leagueId !== 'string') {
        return res.status(400).json({ error: { code: "MISSING_LEAGUE", message: "League ID required" } });
      }

      const league = await storage.getLeague(leagueId);
      if (!league || !league.sleeperLeagueId) {
        return res.status(404).json({ error: { code: "LEAGUE_NOT_FOUND", message: "League not found or not configured" } });
      }

      // Get Discord members, Sleeper rosters, and existing mappings in parallel
      const [members, rosters, mappings] = await Promise.all([
        storage.getLeagueMembers(leagueId),
        sleeperService.getRosters(league.sleeperLeagueId),
        storage.getOwnerMappings(leagueId)
      ]);

      // Format response with all needed data
      res.json({
        discordMembers: members.map(m => ({
          id: m.id,
          discordUserId: m.discordUserId,
          discordUsername: m.discordUsername,
          role: m.role
        })),
        sleeperOwners: rosters.map(r => ({
          ownerId: r.owner_id,
          teamName: r.metadata?.team_name || `Team ${r.roster_id}`
        })),
        mappings: mappings.map(m => ({
          id: m.id,
          sleeperOwnerId: m.sleeperOwnerId,
          discordUserId: m.discordUserId,
          sleeperTeamName: m.sleeperTeamName,
          discordUsername: m.discordUsername
        }))
      });
    } catch (error) {
      console.error("Failed to get owner mapping data:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get owner mapping data" } });
    }
  });

  // POST /api/owners/map - Map Sleeper owners to Discord users
  app.post("/api/owners/map", async (req, res) => {
    try {
      const { leagueId, pairs } = req.body;
      
      if (!leagueId || !pairs || !Array.isArray(pairs)) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "leagueId and pairs array required" } });
      }

      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "LEAGUE_NOT_FOUND", message: "League not found" } });
      }

      // Validate and upsert each mapping
      const results = [];
      for (const pair of pairs) {
        if (!pair.sleeperOwnerId || !pair.discordUserId) {
          continue; // Skip invalid pairs
        }
        
        const mappingId = await storage.upsertOwnerMapping({
          leagueId,
          sleeperOwnerId: pair.sleeperOwnerId,
          sleeperTeamName: pair.sleeperTeamName || null,
          discordUserId: pair.discordUserId,
          discordUsername: pair.discordUsername || null,
        });
        
        results.push({ id: mappingId, ...pair });
      }

      // Log the mapping event
      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId,
        payload: { command: "owners_map", count: results.length },
      });

      res.json({ 
        success: true, 
        message: `Mapped ${results.length} owners successfully`,
        mappings: results
      });
    } catch (error) {
      console.error("Failed to map owners:", error);
      res.status(500).json({ error: { code: "MAPPING_FAILED", message: "Failed to map owners" } });
    }
  });

  // GET /api/polls/:leagueId - Get polls for a league
  app.get("/api/polls/:leagueId", async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const startTime = Date.now();
    try {
      const { leagueId } = req.params;

      const league = await storage.getLeague(leagueId);
      if (!league) {
        res.status(404).json({ error: { code: "LEAGUE_NOT_FOUND", message: "League not found" } });
        await storage.createEvent({
          type: "ERROR_OCCURRED",
          leagueId,
          payload: { error: "League not found", endpoint: "/api/polls/:leagueId" },
          requestId,
          latency: Date.now() - startTime,
        });
        return;
      }

      const polls = await storage.getPolls(leagueId);
      res.json({ polls });
    } catch (error) {
      console.error("Failed to get polls:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get polls" } });
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        payload: { error: String(error), endpoint: "/api/polls/:leagueId" },
        requestId,
        latency: Date.now() - startTime,
      });
    }
  });

  // POST /api/polls - Create a new poll and post to Discord
  app.post("/api/polls", async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const startTime = Date.now();
    try {
      const { leagueId, question, options, expiresAt, createdBy } = req.body;

      if (!leagueId || !question || !options || !Array.isArray(options) || options.length < 2 || !createdBy) {
        return res.status(400).json({ 
          error: { 
            code: "INVALID_INPUT", 
            message: "leagueId, question, options (min 2), and createdBy are required" 
          } 
        });
      }

      const league = await storage.getLeague(leagueId);
      if (!league) {
        res.status(404).json({ error: { code: "LEAGUE_NOT_FOUND", message: "League not found" } });
        return;
      }

      if (!league.channelId) {
        return res.status(400).json({ 
          error: { code: "NO_CHANNEL", message: "League has no Discord channel configured" } 
        });
      }

      // Create the poll in database
      const pollId = await storage.createPoll({
        leagueId,
        question,
        options,
        createdBy,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      // Post poll to Discord
      try {
        const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const pollEmbed = {
          title: `📊 ${question}`,
          description: options.map((opt: string, idx: number) => `${emojiNumbers[idx]} ${opt}`).join('\n'),
          color: 0x5865F2,
          footer: { text: `React with the corresponding number to vote${expiresAt ? ` • Expires ${new Date(expiresAt).toLocaleString()}` : ''}` }
        };

        const messageId = await discordService.postMessage(league.channelId, {
          embeds: [pollEmbed]
        });

        // Add reactions for voting
        for (let i = 0; i < Math.min(options.length, 10); i++) {
          await discordService.addReaction(league.channelId, messageId, emojiNumbers[i]);
        }

        // Update poll with Discord message ID
        await storage.updatePoll(pollId, { discordMessageId: messageId });

        res.json({ 
          success: true, 
          pollId,
          discordMessageId: messageId,
          message: "Poll created and posted to Discord" 
        });

        await storage.createEvent({
          type: "COMMAND_EXECUTED",
          leagueId,
          payload: { command: "poll_created", pollId, question },
          requestId,
          latency: Date.now() - startTime,
        });
      } catch (discordError) {
        console.error("Failed to post poll to Discord:", discordError);
        // Poll created but Discord post failed
        res.json({ 
          success: true, 
          pollId,
          message: "Poll created but failed to post to Discord",
          warning: "Discord posting failed"
        });
      }
    } catch (error) {
      console.error("Failed to create poll:", error);
      res.status(500).json({ error: { code: "CREATE_FAILED", message: "Failed to create poll" } });
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        payload: { error: String(error), endpoint: "/api/polls" },
        requestId,
        latency: Date.now() - startTime,
      });
    }
  });

  // V2 POST /api/v2/polls - Create poll (cache-busting namespace)
  app.post("/api/v2/polls", async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const startTime = Date.now();
    try {
      const { leagueId, question, options, expiresAt, createdBy } = req.body;

      if (!leagueId || !question || !options || !Array.isArray(options) || options.length < 2 || !createdBy) {
        return res.status(400).json({ 
          error: { 
            code: "INVALID_INPUT", 
            message: "leagueId, question, options (min 2), and createdBy are required" 
          } 
        });
      }

      const league = await storage.getLeague(leagueId);
      if (!league) {
        res.status(404).json({ error: { code: "LEAGUE_NOT_FOUND", message: "League not found" } });
        return;
      }

      if (!league.channelId) {
        return res.status(400).json({ 
          error: { code: "NO_CHANNEL", message: "League has no Discord channel configured" } 
        });
      }

      const pollId = await storage.createPoll({
        leagueId,
        question,
        options,
        createdBy,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      try {
        const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const pollEmbed = {
          title: `📊 ${question}`,
          description: options.map((opt: string, idx: number) => `${emojiNumbers[idx]} ${opt}`).join('\n'),
          color: 0x5865F2,
          footer: { text: `React with the corresponding number to vote${expiresAt ? ` • Expires ${new Date(expiresAt).toLocaleString()}` : ''}` }
        };

        const messageId = await discordService.postMessage(league.channelId, {
          embeds: [pollEmbed]
        });

        for (let i = 0; i < Math.min(options.length, 10); i++) {
          await discordService.addReaction(league.channelId, messageId, emojiNumbers[i]);
        }

        await storage.updatePoll(pollId, { discordMessageId: messageId });

        res.json({ 
          success: true, 
          pollId,
          discordMessageId: messageId,
          message: "Poll created and posted to Discord" 
        });

        await storage.createEvent({
          type: "COMMAND_EXECUTED",
          leagueId,
          payload: { command: "poll_created", pollId, question },
          requestId,
          latency: Date.now() - startTime,
        });
      } catch (discordError) {
        console.error("Failed to post poll to Discord:", discordError);
        res.json({ 
          success: true, 
          pollId,
          message: "Poll created but failed to post to Discord",
          warning: "Discord posting failed"
        });
      }
    } catch (error) {
      console.error("Failed to create poll:", error);
      res.status(500).json({ error: { code: "CREATE_FAILED", message: "Failed to create poll" } });
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        payload: { error: String(error), endpoint: "/api/v2/polls" },
        requestId,
        latency: Date.now() - startTime,
      });
    }
  });

  // === PHASE 1 ENDPOINTS ===

  // Owner Mapping (Members) Endpoints
  
  // GET /api/leagues/:leagueId/members - Get all members for a league
  app.get("/api/leagues/:leagueId/members", async (req, res) => {
    try {
      const { leagueId } = req.params;
      
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      const members = await storage.getLeagueMembers(leagueId);
      res.json({ members });
    } catch (error) {
      console.error("Failed to get members:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get members" } });
    }
  });

  // POST /api/leagues/:leagueId/members - Create/update member mapping
  app.post("/api/leagues/:leagueId/members", async (req, res) => {
    try {
      const { leagueId } = req.params;
      
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      const memberData = insertMemberSchema.parse({ ...req.body, leagueId });
      const memberId = await storage.createOrUpdateMember(memberData);
      const member = await storage.getMember(leagueId, memberData.discordUserId);

      res.status(201).json({ id: memberId, member });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid member data", details: error.errors } });
      }
      console.error("Failed to create/update member:", error);
      res.status(500).json({ error: { code: "CREATE_FAILED", message: "Failed to create/update member" } });
    }
  });

  // GET /api/members/discord/:discordUserId - Get member by Discord ID (optional param: leagueId)
  app.get("/api/members/discord/:discordUserId", async (req, res) => {
    try {
      const { discordUserId } = req.params;
      const { leagueId } = req.query;

      if (leagueId && typeof leagueId === "string") {
        const member = await storage.getMemberByDiscordId(leagueId, discordUserId);
        if (!member) {
          return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
        }
        return res.json({ member });
      }

      return res.status(400).json({ error: { code: "MISSING_LEAGUE_ID", message: "leagueId query parameter is required" } });
    } catch (error) {
      console.error("Failed to get member by Discord ID:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get member" } });
    }
  });

  // Reminders Endpoints

  // GET /api/leagues/:leagueId/reminders - Get all reminders
  app.get("/api/leagues/:leagueId/reminders", async (req, res) => {
    try {
      const { leagueId } = req.params;
      
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      const reminders = await storage.getReminders(leagueId);
      res.json({ reminders });
    } catch (error) {
      console.error("Failed to get reminders:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get reminders" } });
    }
  });

  // POST /api/leagues/:leagueId/reminders - Create reminder
  app.post("/api/leagues/:leagueId/reminders", async (req, res) => {
    try {
      const { leagueId } = req.params;
      
      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      const reminderData = insertReminderSchema.parse({ ...req.body, leagueId });
      const reminderId = await storage.createReminder(reminderData);
      
      res.status(201).json({ id: reminderId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid reminder data", details: error.errors } });
      }
      console.error("Failed to create reminder:", error);
      res.status(500).json({ error: { code: "CREATE_FAILED", message: "Failed to create reminder" } });
    }
  });

  // PATCH /api/reminders/:id - Update reminder
  app.patch("/api/reminders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const updateData = insertReminderSchema.partial().parse(req.body);
      await storage.updateReminder(id, updateData);
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid reminder data", details: error.errors } });
      }
      console.error("Failed to update reminder:", error);
      res.status(500).json({ error: { code: "UPDATE_FAILED", message: "Failed to update reminder" } });
    }
  });

  // DELETE /api/reminders/:id - Delete reminder
  app.delete("/api/reminders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      await storage.deleteReminder(id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete reminder:", error);
      res.status(500).json({ error: { code: "DELETE_FAILED", message: "Failed to delete reminder" } });
    }
  });

  // Polls/Votes Endpoints

  // POST /api/polls/:pollId/votes - Create vote
  app.post("/api/polls/:pollId/votes", async (req, res) => {
    try {
      const { pollId } = req.params;
      
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Poll not found" } });
      }

      if (poll.status !== "open") {
        return res.status(400).json({ error: { code: "POLL_CLOSED", message: "Poll is not open for voting" } });
      }

      const voteData = insertVoteSchema.parse({ ...req.body, pollId });
      
      try {
        const voteId = await storage.createVote(voteData);
        res.status(201).json({ id: voteId });
      } catch (voteError: any) {
        if (voteError.message?.includes("unique") || voteError.code === "23505") {
          return res.status(400).json({ error: { code: "ALREADY_VOTED", message: "User has already voted in this poll" } });
        }
        throw voteError;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid vote data", details: error.errors } });
      }
      console.error("Failed to create vote:", error);
      res.status(500).json({ error: { code: "CREATE_FAILED", message: "Failed to create vote" } });
    }
  });

  // GET /api/polls/:pollId/votes - Get all votes
  app.get("/api/polls/:pollId/votes", async (req, res) => {
    try {
      const { pollId } = req.params;
      
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Poll not found" } });
      }

      const votes = await storage.getVotes(pollId);
      res.json({ votes });
    } catch (error) {
      console.error("Failed to get votes:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get votes" } });
    }
  });

  // GET /api/polls/:pollId/votes/counts - Get vote counts by choice
  app.get("/api/polls/:pollId/votes/counts", async (req, res) => {
    try {
      const { pollId } = req.params;
      
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Poll not found" } });
      }

      const counts = await storage.getVoteCounts(pollId);
      res.json({ counts });
    } catch (error) {
      console.error("Failed to get vote counts:", error);
      res.status(500).json({ error: { code: "FETCH_FAILED", message: "Failed to get vote counts" } });
    }
  });

  // PATCH /api/polls/:pollId/status - Update poll status
  app.patch("/api/polls/:pollId/status", async (req, res) => {
    try {
      const { pollId } = req.params;
      const { status } = req.body;

      if (!status || !["open", "closed"].includes(status)) {
        return res.status(400).json({ error: { code: "INVALID_STATUS", message: "Status must be 'open' or 'closed'" } });
      }

      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Poll not found" } });
      }

      await storage.updatePollStatus(pollId, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update poll status:", error);
      res.status(500).json({ error: { code: "UPDATE_FAILED", message: "Failed to update poll status" } });
    }
  });

  // League Settings Endpoint

  // PATCH /api/leagues/:leagueId/settings - Update league settings
  app.patch("/api/leagues/:leagueId/settings", async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const { leagueId } = req.params;
      
      const updateData = z.object({
        featureFlags: z.record(z.unknown()).optional(),
        tone: z.string().optional(),
        timezone: z.string().optional(),
        modelPrefs: z.record(z.unknown()).optional(),
      }).parse(req.body);

      const league = await storage.getLeague(leagueId);
      if (!league) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "League not found" } });
      }

      await storage.updateLeague(leagueId, updateData);
      const updatedLeague = await storage.getLeague(leagueId);

      const latency = Date.now() - startTime;
      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId,
        payload: { command: "league_settings_updated", updates: Object.keys(updateData) },
        requestId,
        latency,
      });

      res.json({ success: true, league: updatedLeague });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid settings data", details: error.errors } });
      }
      console.error("Failed to update league settings:", error);
      const latency = Date.now() - startTime;
      await storage.createEvent({
        type: "ERROR_OCCURRED",
        payload: { error: String(error), endpoint: "/api/leagues/:leagueId/settings" },
        requestId,
        latency,
      });
      res.status(500).json({ error: { code: "UPDATE_FAILED", message: "Failed to update league settings" } });
    }
  });

  // === END PHASE 1 ENDPOINTS ===

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
        { leagueName: league.name },
        league.tone
      );

      // Normalize and deduplicate citations
      const seenCitations = new Set<string>();
      const normalizedCitations = response.citations
        .filter((citation: any) => {
          const key = `${citation.ruleKey}:${citation.section || ''}`;
          if (seenCitations.has(key)) return false;
          seenCitations.add(key);
          return true;
        })
        .map((citation: any, index: number) => {
          const section = citation.section ? ` (${citation.section})` : '';
          const excerpt = citation.text?.substring(0, 150) || 'No excerpt available';
          return `${index + 1}. **${citation.ruleKey}**${section}\n   "${excerpt}${citation.text?.length > 150 ? '...' : ''}"`;
        });

      const embed = {
        title: "📋 Rules Query Result",
        description: response.answer,
        color: 0x5865F2,
        fields: normalizedCitations.length > 0 ? [{
          name: "📚 Citations",
          value: normalizedCitations.join('\n\n'),
          inline: false,
        }] : [],
        footer: {
          text: `Tokens: ${response.tokensUsed} • ${requestId}`,
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
  const question = interaction.data?.options?.[0]?.value;

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

    // If no question, show summary
    if (!question) {
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
    }

    // Question provided - use RAG + DeepSeek for answer
    setTimeout(async () => {
      try {
        // Build synthetic corpus from scoring rules + Sleeper settings
        const scoringText = Object.entries(scoring)
          .filter(([_, value]) => value !== 0)
          .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value} points`)
          .join('\n');

        const syntheticRules = [
          {
            text: `League Scoring Settings (from Sleeper):\n${scoringText}`,
            citations: [{ source: 'Sleeper API', timestamp: new Date().toISOString() }],
            ruleKey: 'Sleeper Scoring'
          }
        ];

        // Search for relevant rules from constitution
        const relevantRules = await ragService.searchSimilarRules(league.id, question, 2, 0.5);
        const allRules = [...syntheticRules, ...relevantRules.map(r => r.rule)];

        const response = await deepSeekService.answerRulesQuery(
          question,
          allRules,
          { leagueName: league.name, scoringSettings: scoring },
          league.tone
        );

        // Normalize and deduplicate citations
        const seenCitations = new Set<string>();
        const normalizedCitations = response.citations
          .filter((citation: any) => {
            const key = `${citation.ruleKey}:${citation.section || ''}`;
            if (seenCitations.has(key)) return false;
            seenCitations.add(key);
            return true;
          })
          .map((citation: any, index: number) => {
            const section = citation.section ? ` (${citation.section})` : '';
            const excerpt = citation.text?.substring(0, 150) || 'No excerpt available';
            return `${index + 1}. **${citation.ruleKey}**${section}\n   "${excerpt}${citation.text?.length > 150 ? '...' : ''}"`;
          });

        const embed = {
          title: "🏈 Scoring Query Result",
          description: response.answer,
          color: 0x10B981,
          fields: normalizedCitations.length > 0 ? [{
            name: "📚 Citations",
            value: normalizedCitations.join('\n\n'),
            inline: false,
          }] : [],
          footer: {
            text: `Tokens: ${response.tokensUsed} • ${requestId}`,
          },
        };

        await discordService.followUpInteraction(interaction.token, {
          embeds: [embed],
          flags: 64,
        });
      } catch (error) {
        console.error("Scoring query failed:", error);
        await discordService.followUpInteraction(interaction.token, {
          content: "❌ Failed to process scoring query. Please try again.",
          flags: 64,
        });
      }
    }, 100);

    return {
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64 },
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
        name: "🏈 /scoring [question]",
        value: "Display scoring settings or ask scoring questions with AI",
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

      case "tone":
        const toneValue = interaction.data?.options?.[0]?.options?.find((opt: any) => opt.name === "style")?.value;
        
        if (!toneValue) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "❌ Please specify a tone (professional, casual, funny, savage, neutral)",
              flags: 64,
            },
          };
        }

        const validTones = ['professional', 'casual', 'funny', 'savage', 'neutral'];
        if (!validTones.includes(toneValue)) {
          return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `❌ Invalid tone. Choose from: ${validTones.join(', ')}`,
              flags: 64,
            },
          };
        }

        updateData.tone = toneValue;
        responseMessage = `✅ Bot tone updated to **${toneValue}**`;
        break;

      default:
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "❌ Unknown config option. Use: timezone, digest, tone, or feature",
            flags: 64,
          },
        };
    }

    // Update the league in storage
    await storage.updateLeague(league.id, updateData);
    
    // Re-schedule digest and Phase 3 jobs if digest config or timezone changed
    if (subcommand === 'digest' || subcommand === 'timezone') {
      // Unschedule existing jobs
      scheduler.unschedule(`digest_${league.id}`);
      scheduler.unscheduleLeaguePhase3(league.id);
      
      // Re-schedule with updated settings
      const updatedLeague = await storage.getLeague(league.id);
      if (updatedLeague) {
        const timezone = updatedLeague.timezone || 'America/New_York';
        
        scheduler.scheduleWeeklyDigest(
          league.id,
          timezone,
          'Sunday',
          '09:00'
        );
        
        // Phase 3: Re-schedule highlights and rivalry jobs
        const getCurrentWeek = () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), 8, 1); // Sept 1
          const diff = now.getTime() - start.getTime();
          const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
          return Math.max(1, Math.min(18, week));
        };
        
        scheduler.scheduleHighlightsDigest(league.id, timezone, getCurrentWeek);
        scheduler.scheduleRivalryCard(league.id, timezone, getCurrentWeek);
        
        console.log(`Re-scheduled Phase 3 jobs for league ${league.id}`);
      }
    }
    
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

async function handleWhoamiCommand(interaction: any, league: any, requestId: string) {
  try {
    // Guard: Ensure league exists
    if (!league) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "❌ This command must be used in a configured league server.",
          flags: 64,
        },
      };
    }

    // Extract Discord user ID from interaction
    const userId = interaction.member?.user?.id || interaction.user?.id;
    
    if (!userId) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "❌ Unable to identify user from Discord interaction.",
          flags: 64,
        },
      };
    }

    // Get member info from storage by Discord user ID
    // Note: storage.getMember expects (leagueId, discordUserId) per schema
    const member = await storage.getMember(league.id, userId);

    if (!member) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `❓ **Not Registered**\n\nYou're not currently registered as a member of **${league.name}**.\n\nContact your league commissioner to get added.`,
          flags: 64,
        },
      };
    }

    const roleEmoji = member.role === "COMMISH" ? "👑" : "📊";
    const roleLabel = member.role === "COMMISH" ? "Commissioner" : "Manager";

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `${roleEmoji} **Your League Profile**\n\n🏈 **League:** ${league.name}\n🎯 **Role:** ${roleLabel}\n🆔 **Member ID:** ${member.id}\n👤 **Discord ID:** <@${userId}>`,
        flags: 64,
      },
    };
  } catch (error) {
    console.error("Whoami command failed:", error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Failed to retrieve member info. Please try again.",
        flags: 64,
      },
    };
  }
}

async function handleFreezeCommand(interaction: any, league: any, requestId: string) {
  try {
    const minutes = interaction.data?.options?.find((opt: any) => opt.name === "minutes")?.value;
    const reason = interaction.data?.options?.find((opt: any) => opt.name === "reason")?.value;
    const channelId = interaction.channel_id;

    if (!minutes || !reason || !channelId) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "❌ Missing required parameters (minutes, reason).",
          flags: 64,
        },
      };
    }

    await moderationService.freezeThread({
      leagueId: league.id,
      channelId,
      minutes,
      reason,
    });

    await storage.createEvent({
      type: "COMMAND_EXECUTED",
      leagueId: league.id,
      payload: { command: "freeze", minutes, reason },
      requestId,
    });

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `✅ **Thread frozen for ${minutes} minute${minutes > 1 ? 's' : ''}**\n\n📝 Reason: ${reason}`,
        flags: 64,
      },
    };
  } catch (error) {
    console.error("Freeze command failed:", error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Failed to freeze thread. Please try again.",
        flags: 64,
      },
    };
  }
}

async function handleClarifyCommand(interaction: any, league: any, requestId: string) {
  const question = interaction.data?.options?.find((opt: any) => opt.name === "question")?.value;
  const channelId = interaction.channel_id;

  if (!question) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Please provide a rule question to clarify.",
        flags: 64,
      },
    };
  }

  setTimeout(async () => {
    try {
      const relevantRules = await ragService.searchSimilarRules(league.id, question, 3, 0.6);
      
      if (relevantRules.length === 0) {
        await discordService.postMessage(channelId, {
          content: "❓ I couldn't find any relevant rules for your question. Try rephrasing or check your league constitution.",
        });
        return;
      }

      const response = await deepSeekService.answerRulesQuery(
        question,
        relevantRules.map(r => r.rule),
        { leagueName: league.name },
        league.tone
      );

      const seenCitations = new Set<string>();
      const normalizedCitations = response.citations
        .filter((citation: any) => {
          const key = `${citation.ruleKey}:${citation.section || ''}`;
          if (seenCitations.has(key)) return false;
          seenCitations.add(key);
          return true;
        })
        .map((citation: any, index: number) => {
          const section = citation.section ? ` (${citation.section})` : '';
          const excerpt = citation.text?.substring(0, 150) || 'No excerpt available';
          return `${index + 1}. **${citation.ruleKey}**${section}\n   "${excerpt}${citation.text?.length > 150 ? '...' : ''}"`;
        });

      const embed = {
        title: "📋 Rule Clarification",
        description: response.answer,
        color: 0x5865F2,
        fields: normalizedCitations.length > 0 ? [{
          name: "📚 Citations",
          value: normalizedCitations.join('\n\n'),
          inline: false,
        }] : [],
        footer: {
          text: `Posted by Commissioner • ${requestId}`,
        },
      };

      await discordService.postMessage(channelId, { embeds: [embed] });

      await moderationService.clarifyRule({
        leagueId: league.id,
        channelId,
        ruleQuery: question,
      });

      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId: league.id,
        payload: { command: "clarify", question },
        requestId,
      });
    } catch (error) {
      console.error("Clarify command follow-up failed:", error);
      await discordService.postMessage(channelId, {
        content: "❌ Failed to post rule clarification. Please try again.",
      });
    }
  }, 100);

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: 64 },
  };
}

async function handleTradeFairnessCommand(interaction: any, league: any, requestId: string) {
  const tradeId = interaction.data?.options?.find((opt: any) => opt.name === "trade_id")?.value;

  if (!tradeId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "❌ Please provide a trade ID to evaluate.",
        flags: 64,
      },
    };
  }

  setTimeout(async () => {
    try {
      const mockProposal = {
        team1: {
          gives: ["Player A", "Player B"],
          receives: ["Player C"],
        },
        team2: {
          gives: ["Player C"],
          receives: ["Player A", "Player B"],
        },
      };

      const evaluation = await tradeFairnessService.evaluateTrade({
        leagueId: league.id,
        tradeId,
        proposal: mockProposal,
      });

      const scoreColor = evaluation.score >= 80 ? 0x10B981 : 
                         evaluation.score >= 60 ? 0xF59E0B : 0xEF4444;

      const embed = {
        title: "⚖️ Trade Fairness Evaluation",
        description: `**Trade ID:** ${tradeId}\n\n**Fairness Score:** ${evaluation.score.toFixed(0)}/100`,
        color: scoreColor,
        fields: [
          {
            name: "📊 Rationale",
            value: evaluation.rationale,
            inline: false,
          },
          {
            name: "📋 Details",
            value: `Team 1 gives: ${evaluation.inputs.team1.playersGiven} player(s)\nTeam 2 gives: ${evaluation.inputs.team2.playersGiven} player(s)`,
            inline: false,
          },
        ],
        footer: {
          text: `Evaluated by Commissioner • ${requestId}`,
        },
      };

      await discordService.followUpInteraction(interaction.token, {
        embeds: [embed],
        flags: 64,
      });

      await storage.createEvent({
        type: "COMMAND_EXECUTED",
        leagueId: league.id,
        payload: { command: "trade_fairness", tradeId, score: evaluation.score },
        requestId,
      });
    } catch (error) {
      console.error("Trade fairness command failed:", error);
      await discordService.followUpInteraction(interaction.token, {
        content: "❌ Failed to evaluate trade fairness. Please try again.",
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

// Send toxicity alert DM to commissioner
async function sendToxicityAlert(params: {
  commissionerUserId: string;
  leagueId: string;
  channelId: string;
  messageId: string;
  authorId: string;
  toxicityScore: number;
  messageText: string;
}): Promise<void> {
  const { commissionerUserId, leagueId, channelId, messageId, authorId, toxicityScore, messageText } = params;

  const messageSummary = messageText.length > 100 ? messageText.substring(0, 100) + "..." : messageText;

  const embed = {
    title: "⚠️ Toxicity Alert",
    description: `A message in your league has been flagged for high toxicity.`,
    color: 0xEF4444,
    fields: [
      {
        name: "Toxicity Score",
        value: `${(toxicityScore * 100).toFixed(0)}%`,
        inline: true,
      },
      {
        name: "Channel",
        value: `<#${channelId}>`,
        inline: true,
      },
      {
        name: "Author",
        value: `<@${authorId}>`,
        inline: true,
      },
      {
        name: "Message Preview",
        value: messageSummary,
        inline: false,
      },
    ],
    footer: {
      text: "THE COMMISH Vibes Monitor",
    },
  };

  const components = [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: 2, // Secondary (gray)
          label: "Freeze Thread (10min)",
          custom_id: `toxicity_freeze_${leagueId}_${channelId}_${messageId}`,
        },
        {
          type: ComponentType.BUTTON,
          style: 1, // Primary (blue)
          label: "Post Rule Clarification",
          custom_id: `toxicity_clarify_${leagueId}_${channelId}_${messageId}`,
        },
      ],
    },
  ];

  await discordService.sendDM(commissionerUserId, {
    embeds: [embed],
    components,
  });
}

// Handle toxicity alert "Freeze Thread" button
async function handleToxicityFreezeButton(req: any, res: any, interaction: any): Promise<any> {
  try {
    const customId = interaction.data?.custom_id;
    const [, , leagueId, channelId, messageId] = customId.split('_');

    await moderationService.freezeThread({
      leagueId,
      channelId,
      minutes: 10,
      reason: "Automatic freeze due to toxicity alert",
    });

    await storage.createEvent({
      type: "COMMAND_EXECUTED",
      leagueId,
      payload: { 
        command: "toxicity_freeze", 
        channelId, 
        messageId,
        autoTriggered: true,
      },
    });

    return res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: "✅ **Thread frozen for 10 minutes** due to toxicity alert.\n\nThe thread has been temporarily frozen to prevent further escalation.",
        embeds: [],
        components: [],
      },
    });
  } catch (error) {
    console.error("Toxicity freeze button failed:", error);
    return res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: "❌ Failed to freeze thread. Please try again or use the `/freeze` command.",
        components: [],
      },
    });
  }
}

// Handle toxicity alert "Post Rule Clarification" button
async function handleToxicityClarifyButton(req: any, res: any, interaction: any): Promise<any> {
  try {
    const customId = interaction.data?.custom_id;
    const [, , leagueId, channelId, messageId] = customId.split('_');

    const league = await storage.getLeague(leagueId);
    if (!league) {
      return res.json({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: "❌ League not found.",
          components: [],
        },
      });
    }

    const question = "What are the rules about respectful communication and behavior in our league?";
    const relevantRules = await ragService.searchSimilarRules(leagueId, question, 3, 0.6);

    if (relevantRules.length > 0) {
      const response = await deepSeekService.answerRulesQuery(
        question,
        relevantRules.map(r => r.rule),
        { leagueName: league.name },
        league.tone ?? undefined
      );

      const seenCitations = new Set<string>();
      const normalizedCitations = response.citations
        .filter((citation: any) => {
          const key = `${citation.ruleKey}:${citation.section || ''}`;
          if (seenCitations.has(key)) return false;
          seenCitations.add(key);
          return true;
        })
        .map((citation: any, index: number) => {
          const section = citation.section ? ` (${citation.section})` : '';
          const excerpt = citation.text?.substring(0, 150) || 'No excerpt available';
          return `${index + 1}. **${citation.ruleKey}**${section}\n   "${excerpt}${citation.text?.length > 150 ? '...' : ''}"`;
        });

      const embed = {
        title: "📋 League Conduct Reminder",
        description: response.answer,
        color: 0x5865F2,
        fields: normalizedCitations.length > 0 ? [{
          name: "📚 Citations",
          value: normalizedCitations.join('\n\n'),
          inline: false,
        }] : [],
        footer: {
          text: "Posted by Commissioner via Vibes Monitor",
        },
      };

      await discordService.postMessage(channelId, { embeds: [embed] });
    } else {
      await discordService.postMessage(channelId, {
        content: "📋 **League Conduct Reminder**\n\nPlease remember to keep discussions respectful and constructive. Let's maintain a positive environment for everyone in the league.",
      });
    }

    await storage.createEvent({
      type: "COMMAND_EXECUTED",
      leagueId,
      payload: { 
        command: "toxicity_clarify", 
        channelId, 
        messageId,
        autoTriggered: true,
      },
    });

    return res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: "✅ **Rule clarification posted** to the channel.\n\nA reminder about league conduct has been posted to help de-escalate the situation.",
        embeds: [],
        components: [],
      },
    });
  } catch (error) {
    console.error("Toxicity clarify button failed:", error);
    return res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: "❌ Failed to post rule clarification. Please try again or use the `/clarify` command.",
        components: [],
      },
    });
  }
}

// Utility function to schedule reminders for upcoming deadlines
async function scheduleRemindersForLeague(leagueId: string) {
  try {
    const league = await storage.getLeague(leagueId);
    if (!league) return;

    // Get upcoming deadlines (next 30 days)
    const upcomingDeadlines = await storage.getUpcomingDeadlines(leagueId, 20);
    
    if (upcomingDeadlines.length === 0) {
      console.log(`No upcoming deadlines found for league ${leagueId}`);
      return;
    }

    // Unschedule existing reminders for this league
    scheduler.unscheduleReminders(leagueId);

    // Count deadlines by type for logging
    const deadlinesByType: Record<string, number> = {};
    let scheduledCount = 0;

    // Schedule reminders for each deadline (handles lineup lock, waiver, trade, and custom deadlines)
    for (const deadline of upcomingDeadlines) {
      const deadlineTime = new Date(deadline.isoTime);
      const hoursUntilDeadline = (deadlineTime.getTime() - Date.now()) / (1000 * 60 * 60);
      
      // Track deadline types
      deadlinesByType[deadline.type] = (deadlinesByType[deadline.type] || 0) + 1;
      
      // Only schedule reminders for deadlines that are at least 1 hour away
      if (hoursUntilDeadline < 1) {
        console.log(`Skipping ${deadline.type} (${deadline.id}) - deadline is less than 1h away`);
        continue;
      }

      // Determine which reminder times to use based on time until deadline
      const reminderTimes: number[] = [];
      if (hoursUntilDeadline >= 24) {
        reminderTimes.push(24, 1); // 24h and 1h before
      } else if (hoursUntilDeadline >= 1) {
        reminderTimes.push(1); // Only 1h before
      }

      if (reminderTimes.length > 0) {
        scheduler.scheduleReminder(
          leagueId,
          deadline.id,
          deadline.type,
          deadlineTime,
          league.timezone || "America/New_York",
          reminderTimes
        );
        scheduledCount++;
      }
    }

    console.log(
      `Scheduled reminders for ${scheduledCount} deadlines in league ${leagueId}:`,
      deadlinesByType
    );
  } catch (error) {
    console.error(`Failed to schedule reminders for league ${leagueId}:`, error);
  }
}
