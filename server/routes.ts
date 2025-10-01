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

// Module-level variables that will be initialized after env validation
let ragService: RAGService;
let eventBus: EventBus;

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

  // Setup event handlers
  eventBus.on("digest_due", async (data) => {
    try {
      console.log(`[Scheduler] Weekly digest due for league ${data.leagueId}`);
      
      const league = await storage.getLeague(data.leagueId);
      if (!league || !league.channelId) {
        console.warn(`Cannot send digest: League ${data.leagueId} not found or has no channel`);
        return;
      }

      // Generate digest content
      const digest = await generateDigestContent(league, sleeperService);

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

  // === END SETUP WIZARD ENDPOINTS ===

  // Health check with real database connectivity test
  app.get("/api/health", async (req, res) => {
    const startTime = Date.now();
    const issues: string[] = [];
    
    // Test DeepSeek service
    const deepSeekHealthy = await deepSeekService.healthCheck();
    if (!deepSeekHealthy) issues.push("deepseek");
    
    // Test database connectivity with real query
    let databaseStatus = "connected";
    let databaseLatency = 0;
    try {
      const dbStart = Date.now();
      await storage.runRawSQL("SELECT 1");
      databaseLatency = Date.now() - dbStart;
    } catch (error) {
      databaseStatus = "error";
      issues.push("database");
      console.error("Database health check failed:", error);
    }

    // Test OpenAI embeddings availability (basic check)
    let embeddingsStatus = "available";
    try {
      if (!env.openai.apiKey) {
        embeddingsStatus = "not_configured";
        issues.push("embeddings");
      }
    } catch (error) {
      embeddingsStatus = "error";
      issues.push("embeddings");
    }

    // Determine overall status
    const status = issues.length === 0 ? "ok" : "degraded";
    const totalLatency = Date.now() - startTime;
    
    res.json({
      status,
      timestamp: new Date().toISOString(),
      latency: totalLatency,
      services: {
        database: databaseStatus,
        deepseek: deepSeekHealthy ? "healthy" : "error",
        discord: "configured",
        sleeper: "available",
        embeddings: embeddingsStatus
      },
      embeddings: {
        provider: "openai",
        model: env.openai.embedModel,
        dimension: env.openai.embedDim
      },
      performance: {
        database_latency: databaseLatency,
        total_latency: totalLatency
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
          case "whoami":
            response = await handleWhoamiCommand(interaction, league!, requestId);
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
