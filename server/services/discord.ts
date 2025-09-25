import { z } from "zod";

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

  generateBotInstallUrl(guildId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: "bot applications.commands",
      permissions: "84992", // View Channels (1024) + Send Messages (2048) + Read History (65536) + Embed Links (16384)
      guild_id: guildId,
      disable_guild_select: "true",
      redirect_uri: redirectUri,
    });

    return `https://discord.com/oauth2/authorize?${params}`;
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
        description: "Display current scoring settings",
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
        ],
      },
      {
        name: "reindex",
        description: "Rebuild RAG index (Commissioner only)",
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
                url: `${process.env.APP_BASE_URL || 'https://localhost:5000'}/league/${data.leagueId}`
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
}

export const discordService = new DiscordService();
