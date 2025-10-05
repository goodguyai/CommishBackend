import { z } from "zod";
import { nanoid } from "nanoid";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env.js";
import { events } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { 
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined 
});
const db = drizzle(client);

// Discord API types
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: {
    id: string;
    name: string;
    type: number;
    options?: Array<{
      name: string;
      type: number;
      value: string | number | boolean;
    }>;
  };
  guild_id?: string;
  channel_id?: string;
  member?: {
    user: DiscordUser;
    roles: string[];
  };
  user?: DiscordUser;
  token: string;
  version: number;
}

export interface DiscordInteractionResponse {
  type: number;
  data?: {
    content?: string;
    embeds?: any[];
    flags?: number;
    components?: any[];
    choices?: any[];
  };
}

// Discord interaction response types
export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
} as const;

// Discord component types
export const ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
  SELECT_MENU: 3,
  TEXT_INPUT: 4,
  USER_SELECT: 5,
  ROLE_SELECT: 6,
  MENTIONABLE_SELECT: 7,
  CHANNEL_SELECT: 8,
} as const;

export class DiscordService {
  private readonly baseUrl = "https://discord.com/api/v10";
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly botToken: string;

  constructor() {
    this.clientId = process.env.DISCORD_CLIENT_ID || "";
    this.clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
    this.botToken = process.env.DISCORD_BOT_TOKEN || "";
  }

  // OAuth2 flows
  generateUserAuthUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds",
    });

    if (state) {
      params.append("state", state);
    }

    return `https://discord.com/oauth2/authorize?${params}`;
  }

  generateBotInstallUrl(guildId: string): string {
    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('scope', 'bot applications.commands');
    url.searchParams.set('permissions', env.discord.botPermissions);
    url.searchParams.set('guild_id', guildId);
    url.searchParams.set('disable_guild_select', 'true');
    
    // No redirect_uri or response_type for bot install
    return url.toString();
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }> {
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord OAuth error: ${response.statusText}`);
    }

    return response.json();
  }

  async getCurrentUser(accessToken: string): Promise<DiscordUser> {
    const response = await fetch(`${this.baseUrl}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    const response = await fetch(`${this.baseUrl}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Bot interactions
  async respondToInteraction(
    interactionId: string,
    interactionToken: string,
    response: DiscordInteractionResponse
  ): Promise<void> {
    const url = `${this.baseUrl}/interactions/${interactionId}/${interactionToken}/callback`;
    
    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    });

    if (!apiResponse.ok) {
      throw new Error(`Discord interaction response error: ${apiResponse.statusText}`);
    }
  }

  async followUpInteraction(
    interactionToken: string,
    message: {
      content?: string;
      embeds?: any[];
      flags?: number;
      components?: any[];
    }
  ): Promise<void> {
    const url = `${this.baseUrl}/webhooks/${this.clientId}/${interactionToken}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Discord follow-up error: ${response.statusText}`);
    }
  }

  // Command registration
  async registerGuildCommands(guildId: string, commands: any[]): Promise<void> {
    const url = `${this.baseUrl}/applications/${this.clientId}/guilds/${guildId}/commands`;
    
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      throw new Error(`Discord command registration error: ${response.statusText}`);
    }
  }

  createChannelSelectComponent(): any {
    return {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.CHANNEL_SELECT,
          custom_id: "select_home_channel",
          placeholder: "Select the home channel for THE COMMISH",
          channel_types: [0], // Text channels only
        },
      ],
    };
  }

  // Get guild channels
  async getGuildChannels(guildId: string): Promise<Array<{id: string, name: string, type: number}>> {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/channels`,
        {
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }
      
      const channels = await response.json();
      
      // Filter for text channels (type 0) and threads (type 11)
      return channels
        .filter((ch: any) => ch.type === 0 || ch.type === 11)
        .map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          type: ch.type
        }));
    } catch (error) {
      console.error("Failed to get guild channels:", error);
      throw error;
    }
  }

  // Get guild members
  async getGuildMembers(guildId: string): Promise<Array<{id: string, username: string, avatar?: string}>> {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
        {
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
        }
      );
      
      if (!response.ok) {
        console.warn("Could not fetch guild members, may need GUILD_MEMBERS intent");
        return [];
      }
      
      const members = await response.json();
      
      return members
        .filter((m: any) => !m.user.bot)
        .map((m: any) => ({
          id: m.user.id,
          username: m.user.username,
          avatar: m.user.avatar,
        }));
    } catch (error) {
      console.error("Failed to get guild members:", error);
      return [];
    }
  }

  // Post message to channel
  async postMessage(
    channelId: string, 
    payload: { content?: string; embeds?: any[]; components?: any[] }, 
    idempotencyKey?: string
  ): Promise<string> {
    // Delegate to the standalone reliability wrapper
    const result = await postMessage({
      channelId,
      content: payload.content,
      embeds: payload.embeds,
      components: payload.components,
      idempotencyKey,
    });
    
    if (!result.ok || !result.messageId) {
      throw new Error(result.error || 'Failed to post message');
    }
    
    return result.messageId;
  }

  // Add reaction to message
  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    const encodedEmoji = encodeURIComponent(emoji);
    const url = `${this.baseUrl}/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`;
    
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to add reaction: ${response.statusText}`);
      // Don't throw - reactions are non-critical
    }
  }

  // Send DM to user
  async sendDM(userId: string, content: any): Promise<string> {
    try {
      // First, create a DM channel with the user
      const createDMResponse = await fetch(`${this.baseUrl}/users/@me/channels`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: userId,
        }),
      });

      if (!createDMResponse.ok) {
        throw new Error(`Failed to create DM channel: ${createDMResponse.statusText}`);
      }

      const dmChannel = await createDMResponse.json();

      // Then, send the message to that DM channel
      const sendMessageResponse = await fetch(`${this.baseUrl}/channels/${dmChannel.id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(content),
      });

      if (!sendMessageResponse.ok) {
        throw new Error(`Failed to send DM: ${sendMessageResponse.statusText}`);
      }

      const message = await sendMessageResponse.json();
      return message.id;
    } catch (error) {
      console.error("Failed to send DM:", error);
      throw error;
    }
  }

  // Standard slash commands
  getSlashCommands(): any[] {
    return [
      {
        name: "rules",
        description: "Query league rules and constitution",
        options: [
          {
            name: "question",
            description: "Your question about the rules",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "deadlines",
        description: "Show upcoming league deadlines",
      },
      {
        name: "scoring",
        description: "Display scoring settings or ask scoring questions",
        options: [
          {
            name: "question",
            description: "Optional: Ask a question about scoring (leave blank for summary)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "help",
        description: "Show command help and usage examples",
      },
      {
        name: "config",
        description: "Configure bot settings (Commissioner only)",
        options: [
          {
            name: "timezone",
            description: "Set the league timezone",
            type: 1, // SUB_COMMAND
            options: [
              {
                name: "timezone",
                description: "Timezone (e.g., America/New_York)",
                type: 3, // STRING
                required: true,
              },
            ],
          },
          {
            name: "digest",
            description: "Configure weekly digest schedule",
            type: 1, // SUB_COMMAND
            options: [
              {
                name: "day",
                description: "Day of the week",
                type: 3, // STRING
                required: false,
                choices: [
                  { name: "Monday", value: "Monday" },
                  { name: "Tuesday", value: "Tuesday" },
                  { name: "Wednesday", value: "Wednesday" },
                  { name: "Thursday", value: "Thursday" },
                  { name: "Friday", value: "Friday" },
                  { name: "Saturday", value: "Saturday" },
                  { name: "Sunday", value: "Sunday" },
                ],
              },
              {
                name: "time",
                description: "Time in HH:MM format (24-hour)",
                type: 3, // STRING
                required: false,
              },
            ],
          },
          {
            name: "feature",
            description: "Enable or disable bot features",
            type: 1, // SUB_COMMAND
            options: [
              {
                name: "name",
                description: "Feature to toggle",
                type: 3, // STRING
                required: true,
                choices: [
                  { name: "RAG Q&A", value: "rag_qa" },
                  { name: "Weekly Digest", value: "weekly_digest" },
                  { name: "Deadline Reminders", value: "deadline_reminders" },
                  { name: "Scoring Updates", value: "scoring_updates" },
                ],
              },
              {
                name: "enabled",
                description: "Enable or disable the feature",
                type: 5, // BOOLEAN
                required: true,
              },
            ],
          },
          {
            name: "tone",
            description: "Set the bot's personality/tone",
            type: 1, // SUB_COMMAND
            options: [
              {
                name: "style",
                description: "Choose the bot's tone",
                type: 3, // STRING
                required: true,
                choices: [
                  { name: "Professional", value: "professional" },
                  { name: "Casual", value: "casual" },
                  { name: "Funny", value: "funny" },
                  { name: "Savage", value: "savage" },
                  { name: "Neutral", value: "neutral" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "digest",
        description: "Generate and post the weekly digest immediately",
      },
      {
        name: "poll",
        description: "Create a quick poll for league members",
        options: [
          {
            name: "question",
            description: "The poll question",
            type: 3, // STRING
            required: true,
          },
          {
            name: "options",
            description: "Poll options separated by | (e.g., Yes | No | Maybe)",
            type: 3, // STRING
            required: true,
          },
          {
            name: "duration",
            description: "How long to keep poll open (in hours, default 24)",
            type: 4, // INTEGER
            required: false,
          },
        ],
      },
      {
        name: "reindex",
        description: "Rebuild RAG index (Commissioner only)",
      },
      {
        name: "whoami",
        description: "Show your member info and role in the league",
      },
      {
        name: "freeze",
        description: "Freeze thread to prevent escalation (Commissioner only)",
        options: [
          {
            name: "minutes",
            description: "Duration in minutes (1-1440)",
            type: 4, // INTEGER
            required: true,
            min_value: 1,
            max_value: 1440,
          },
          {
            name: "reason",
            description: "Why freezing the thread",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "clarify",
        description: "Post rule clarification in channel (Commissioner only)",
        options: [
          {
            name: "question",
            description: "Rule question to clarify",
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: "trade_fairness",
        description: "Evaluate trade fairness (Commissioner only)",
        options: [
          {
            name: "trade_id",
            description: "Trade ID to evaluate",
            type: 3, // STRING
            required: true,
          },
        ],
      },
    ];
  }

  // Guild status and management
  async getGuildStatus(guildId: string): Promise<{
    installed: boolean;
    channels: { id: string; name: string; type: number }[];
  }> {
    try {
      // Check if bot is in guild by trying to get guild info
      const response = await fetch(`${this.baseUrl}/guilds/${guildId}`, {
        headers: {
          Authorization: `Bot ${this.botToken}`,
        },
      });

      if (!response.ok) {
        return { installed: false, channels: [] };
      }

      // Get channels if bot is present
      const channelsResponse = await fetch(`${this.baseUrl}/guilds/${guildId}/channels`, {
        headers: {
          Authorization: `Bot ${this.botToken}`,
        },
      });

      if (!channelsResponse.ok) {
        return { installed: true, channels: [] };
      }

      const channels = await channelsResponse.json();
      
      // Filter to text channels only (type 0)
      const textChannels = channels
        .filter((channel: any) => channel.type === 0)
        .map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type
        }));

      return { installed: true, channels: textChannels };
    } catch (error) {
      console.error("Error checking guild status:", error);
      return { installed: false, channels: [] };
    }
  }

  // Welcome message with setup info
  async postWelcomeMessage(channelId: string, data: {
    leagueId: string;
    leagueName: string;
    guildId: string;
  }): Promise<void> {
    try {
      const welcomeMessage = {
        embeds: [
          {
            title: "🏈 THE COMMISH is Ready!",
            description: `Welcome to **${data.leagueName}**! I'm your AI-powered fantasy football commissioner assistant.`,
            color: 0x2b2d31,
            fields: [
              {
                name: "🎯 What I can do",
                value: "• Answer rule questions with `/ask`\n• Track important deadlines\n• Help with scoring disputes\n• Generate weekly league reports",
                inline: false
              },
              {
                name: "🚀 Get Started",
                value: "Try `/ask` followed by any question about your league rules or `/help` to see all available commands.",
                inline: false
              }
            ],
            footer: {
              text: "THE COMMISH • AI Fantasy Football Assistant"
            }
          }
        ],
        components: [
          {
            type: ComponentType.ACTION_ROW,
            components: [
              {
                type: ComponentType.BUTTON,
                style: 5, // Link button
                label: "View Dashboard",
                url: `${env.app.baseUrl}/league/${data.leagueId}`
              }
            ]
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(welcomeMessage),
      });

      if (!response.ok) {
        throw new Error(`Failed to post welcome message: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error posting welcome message:", error);
      throw error;
    }
  }

  // Get bot user info
  async getBotUser(): Promise<DiscordUser> {
    const response = await fetch(`${this.baseUrl}/users/@me`, {
      headers: {
        Authorization: `Bot ${this.botToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Get global commands
  async getGlobalCommands(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/applications/${this.clientId}/commands`, {
      headers: {
        Authorization: `Bot ${this.botToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const discordService = new DiscordService();

// Centralized postMessage utility with idempotency and rate limit handling
export interface PostMessageOptions {
  channelId: string;
  content?: string;
  embeds?: any[];
  components?: any[];
  idempotencyKey?: string;
}

export interface PostMessageResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  rateLimited?: boolean;
}

async function checkIdempotentPost(idempotencyKey: string): Promise<any | null> {
  const existing = await db.select()
    .from(events)
    .where(
      and(
        eq(events.requestId, idempotencyKey),
        eq(events.type, 'MESSAGE_POSTED')
      )
    )
    .limit(1);
  
  return existing.length > 0 ? existing[0] : null;
}

async function logPostEvent(idempotencyKey: string, payload: any): Promise<void> {
  await db.insert(events).values({
    type: 'MESSAGE_POSTED',
    requestId: idempotencyKey,
    payload,
  });
}

export async function postMessage(options: PostMessageOptions): Promise<PostMessageResult> {
  const { channelId, content, embeds, components, idempotencyKey } = options;
  
  const idemKey = idempotencyKey || nanoid();
  
  const existingEvent = await checkIdempotentPost(idemKey);
  if (existingEvent) {
    console.log(`[Discord Post] Skipping duplicate post: ${idemKey}`);
    return {
      ok: true,
      messageId: existingEvent.payload.messageId,
    };
  }
  
  const body: any = {};
  if (content) body.content = content;
  if (embeds) body.embeds = embeds;
  if (components) body.components = components;
  
  let attempts = 0;
  const maxAttempts = 3;
  let backoffMs = 1000;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      
      if (response.status === 429) {
        const retryData = await response.json();
        const retryAfter = retryData.retry_after || backoffMs / 1000;
        
        console.warn(`[Discord Post] Rate limited, retry in ${retryAfter}s (attempt ${attempts}/${maxAttempts})`);
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          backoffMs *= 2;
          continue;
        } else {
          await logPostEvent(idemKey, { error: 'Rate limit exceeded', attempts });
          return {
            ok: false,
            error: 'Rate limit exceeded',
            rateLimited: true,
          };
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Discord Post] Failed: ${response.status} - ${errorText}`);
        
        await logPostEvent(idemKey, { error: `HTTP ${response.status}`, attempts });
        
        return {
          ok: false,
          error: `Discord API error: ${response.status}`,
        };
      }
      
      const message = await response.json();
      
      await logPostEvent(idemKey, {
        messageId: message.id,
        channelId,
        attempts,
        success: true,
      });
      
      return {
        ok: true,
        messageId: message.id,
      };
      
    } catch (e: any) {
      console.error(`[Discord Post] Exception on attempt ${attempts}:`, e.message);
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      } else {
        await logPostEvent(idemKey, { error: e.message, attempts });
        return {
          ok: false,
          error: e.message,
        };
      }
    }
  }
  
  return {
    ok: false,
    error: 'Max retries exceeded',
  };
}
