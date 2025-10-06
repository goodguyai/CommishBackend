import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, real, pgEnum, uuid, boolean, customType, unique, numeric } from "drizzle-orm/pg-core";

// Custom vector type for pgvector extension
const vector = (dimension: number = 1536) => customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${dimension})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const memberRoleEnum = pgEnum("member_role", ["COMMISH", "MANAGER"]);
export const documentTypeEnum = pgEnum("document_type", ["ORIGINAL", "NORMALIZED"]);
export const factSourceEnum = pgEnum("fact_source", ["SLEEPER", "RULE", "MANUAL"]);
export const deadlineSourceEnum = pgEnum("deadline_source", ["RULE", "MANUAL", "DERIVED"]);
export const eventTypeEnum = pgEnum("event_type", [
  "INSTALL_COMPLETED", 
  "RULES_UPDATED", 
  "SLEEPER_SYNCED", 
  "DIGEST_DUE",
  "DIGEST_SENT",
  "DIGEST_SKIPPED",
  "DIGEST_FAILED",
  "COMMAND_EXECUTED",
  "RULES_INDEX_FAILED",
  "MISCONFIGURED",
  "ERROR_OCCURRED",
  "MESSAGE_POSTED"
]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "under_review", "resolved", "dismissed"]);
export const contentStatusEnum = pgEnum("content_status", ["queued", "posted", "skipped"]);

// Core tables
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  discordUserId: text("discord_user_id"),
  name: text("name"),
  plan: text("plan").default("beta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAccounts = pgTable("user_accounts", {
  userId: uuid("user_id").notNull(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
}, (table) => ({
  pk: { primaryKey: true, columns: [table.userId, table.accountId] },
}));

export const betaInvites = pgTable("beta_invites", {
  code: text("code").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  claimedBy: uuid("claimed_by"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
});

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  name: text("name").notNull(),
  platform: text("platform").notNull().default("sleeper"),
  sleeperLeagueId: text("sleeper_league_id"),
  guildId: text("guild_id"),
  channelId: text("channel_id"),
  timezone: text("timezone").default("America/New_York"),
  tone: text("tone").default("neutral"),
  featureFlags: jsonb("feature_flags").default({
    qa: true,
    deadlines: true,
    digest: true,
    trade_helper: false,
    autoMeme: false,
    digestEnabled: true,
    highlights: false,
    rivalries: false,
    creativeTrashTalk: false,
    deepStats: false,
    reminders: {
      lineupLock: true,
      waiver: true,
      tradeDeadline: true
    }
  }),
  channels: jsonb("channels").default({
    digests: null,
    reminders: null,
    polls: null,
    highlights: null
  }),
  personality: jsonb("personality").default({
    style: "neutral",
    customTemplate: null
  }),
  modelPrefs: jsonb("model_prefs").default({
    maxTokens: 1000,
    provider: "deepseek"
  }),
  digestFrequency: text("digest_frequency").default("off"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  discordUserId: text("discord_user_id").notNull(),
  role: memberRoleEnum("role").default("MANAGER"),
  sleeperOwnerId: text("sleeper_owner_id"),
  sleeperTeamName: text("sleeper_team_name"),
  discordUsername: text("discord_username"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqLeagueSleeper: unique("uq_members_league_sleeper").on(table.leagueId, table.sleeperOwnerId),
  uniqLeagueDiscord: unique("uq_members_league_discord").on(table.leagueId, table.discordUserId),
}));

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  type: documentTypeEnum("type").notNull(),
  title: text("title").notNull().default("League Constitution"),
  url: text("url"),
  content: text("content"),
  version: text("version").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  version: text("version").notNull(),
  sectionId: text("section_id").notNull(),
  ruleKey: text("rule_key").notNull(),
  text: text("text").notNull(),
  citations: jsonb("citations").default([]),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Embeddings table with pgvector support
export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: uuid("rule_id").references(() => rules.id).notNull(),
  contentHash: text("content_hash").notNull(), // SHA-256 hash for deduplication (allows duplicates)
  embedding: vector(1536)("embedding").notNull(), // pgvector column
  provider: text("provider").notNull().default("openai"), // Track embedding provider
  model: text("model").notNull().default("text-embedding-3-small"), // Track model used
  createdAt: timestamp("created_at").defaultNow(),
});

export const facts = pgTable("facts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  source: factSourceEnum("source").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deadlines = pgTable("deadlines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  type: text("type").notNull(),
  isoTime: timestamp("iso_time").notNull(),
  source: deadlineSourceEnum("source").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id),
  type: eventTypeEnum("type").notNull(),
  payload: jsonb("payload").default({}),
  requestId: text("request_id"),
  latency: integer("latency"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const discordInteractions = pgTable("discord_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  interactionId: text("interaction_id").notNull().unique(),
  leagueId: uuid("league_id").references(() => leagues.id),
  commandName: text("command_name"),
  userId: text("user_id").notNull(),
  channelId: text("channel_id"),
  guildId: text("guild_id"),
  responseTime: integer("response_time"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pendingSetup = pgTable("pending_setup", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  webUserId: uuid("web_user_id"), // Future: link to auth.users.id if we add Supabase auth
  sessionId: text("session_id"), // Alternative: track by session ID for now
  selectedGuildId: text("selected_guild_id"),
  selectedChannelId: text("selected_channel_id"),
  sleeperUsername: text("sleeper_username"),
  sleeperSeason: text("sleeper_season"),
  selectedLeagueId: text("selected_league_id"),
  timezone: text("timezone").default("America/New_York"),
  expiresAt: timestamp("expires_at"), // TTL: wizard session expires after 24 hours
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Note: owner_mappings is now a view on members table (see migration 0005)
// Keeping this for backward compatibility with existing queries
export const ownerMappings = pgTable("owner_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  sleeperOwnerId: text("sleeper_owner_id").notNull(),
  sleeperTeamName: text("sleeper_team_name"),
  discordUserId: text("discord_user_id").notNull(),
  discordUsername: text("discord_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // Array of strings
  discordMessageId: text("discord_message_id"),
  createdBy: text("created_by").notNull(), // Discord user ID
  anonymous: boolean("anonymous").default(true).notNull(),
  status: text("status").default("open").notNull(), // 'open' | 'closed'
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const votes = pgTable("votes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: uuid("poll_id").references(() => polls.id).notNull(),
  voterId: text("voter_id").notNull(), // Discord user ID
  choice: text("choice").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqPollVoter: unique().on(table.pollId, table.voterId),
}));

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  type: text("type").notNull(), // 'lineup_lock' | 'waivers' | 'trade_deadline' | 'bye_week' | 'custom'
  cron: text("cron").notNull(),
  message: text("message"),
  channelId: text("channel_id"),
  timezone: text("timezone").default("UTC").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastFired: timestamp("last_fired"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sentimentLogs = pgTable("sentiment_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id").notNull(),
  authorId: text("author_id").notNull(),
  summary: text("summary"),
  toxicityScore: numeric("toxicity_score", { precision: 4, scale: 3 }),
  sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modActions = pgTable("mod_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  targetChannelId: text("target_channel_id"),
  targetMessageId: text("target_message_id"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  kind: text("kind").notNull(),
  subjectId: text("subject_id"),
  openedBy: text("opened_by").notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  details: jsonb("details"),
  resolution: jsonb("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const tradeEvaluations = pgTable("trade_evaluations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  tradeId: text("trade_id").notNull(),
  fairnessScore: numeric("fairness_score", { precision: 5, scale: 2 }),
  rationale: text("rationale"),
  inputs: jsonb("inputs"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqTradeEval: unique("uniq_trade_eval").on(table.leagueId, table.tradeId),
}));

export const tradeInsights = pgTable("trade_insights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  payload: jsonb("payload").notNull(),
  fairness: real("fairness"),
  rationale: text("rationale"),
  projectionDelta: text("projection_delta"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const highlights = pgTable("highlights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  week: integer("week").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rivalries = pgTable("rivalries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  aWins: integer("a_wins").notNull().default(0),
  bWins: integer("b_wins").notNull().default(0),
  lastMeetingWeek: integer("last_meeting_week"),
  meta: jsonb("meta"),
}, (table) => ({
  uniqRivalry: unique("uniq_rivalry").on(table.leagueId, table.teamA, table.teamB),
}));

export const contentQueue = pgTable("content_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  channelId: text("channel_id").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  template: text("template").notNull(),
  payload: jsonb("payload").notNull(),
  status: contentStatusEnum("status").notNull().default("queued"),
  postedMessageId: text("posted_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sleeper sync tables
export const sleeperIntegrations = pgTable("sleeper_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  sleeperLeagueId: text("sleeper_league_id").notNull(),
  season: text("season").notNull(),
  sport: text("sport").notNull().default("nfl"),
  username: text("username"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqLeague: unique("uq_sleeper_int_league").on(table.leagueId),
  uniqSleeperSeason: unique("uq_sleeper_int_sleeper_season").on(table.sleeperLeagueId, table.season),
}));

export const sleeperSettingsSnapshots = pgTable("sleeper_settings_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull().default("sleeper"),
  payload: jsonb("payload").notNull(),
});

export const leagueSettings = pgTable("league_settings", {
  leagueId: uuid("league_id").primaryKey().references(() => leagues.id, { onDelete: "cascade" }),
  scoring: jsonb("scoring").notNull().default({}),
  roster: jsonb("roster").notNull().default({}),
  waivers: jsonb("waivers").notNull().default({}),
  playoffs: jsonb("playoffs").notNull().default({}),
  trades: jsonb("trades").notNull().default({}),
  misc: jsonb("misc").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leagueSettingsOverrides = pgTable("league_settings_overrides", {
  leagueId: uuid("league_id").primaryKey().references(() => leagues.id, { onDelete: "cascade" }),
  overrides: jsonb("overrides").notNull().default({}),
  updatedBy: uuid("updated_by").references(() => accounts.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settingsChangeEvents = pgTable("settings_change_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  path: text("path").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  detectedAt: timestamp("detected_at").defaultNow(),
});

export const constitutionTemplates = pgTable("constitution_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  templateMd: text("template_md").notNull(),
}, (table) => ({
  uniqLeagueSlug: unique("uq_const_tmpl_league_slug").on(table.leagueId, table.slug),
}));

export const constitutionRender = pgTable("constitution_render", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  contentMd: text("content_md").notNull(),
  renderedAt: timestamp("rendered_at").defaultNow(),
}, (table) => ({
  uniqLeagueSlug: unique("uq_const_render_league_slug").on(table.leagueId, table.slug),
}));

// Sleeper league data tables
export const sleeperRosters = pgTable("sleeper_rosters", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  sleeperRosterId: text("sleeper_roster_id").notNull(),
  ownerId: text("owner_id"),
  players: jsonb("players").notNull().default([]),
  bench: jsonb("bench").notNull().default([]),
  ir: jsonb("ir").notNull().default([]),
  metadata: jsonb("metadata").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqLeagueRoster: unique("uq_sleeper_roster_league_roster").on(table.leagueId, table.sleeperRosterId),
}));

export const sleeperTransactions = pgTable("sleeper_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  txId: text("tx_id").notNull(),
  type: text("type").notNull(),
  status: text("status"),
  faabSpent: integer("faab_spent"),
  adds: jsonb("adds").default([]),
  drops: jsonb("drops").default([]),
  parties: jsonb("parties").default([]),
  processedAt: timestamp("processed_at"),
  raw: jsonb("raw").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqLeagueTx: unique("uq_sleeper_tx_league_tx").on(table.leagueId, table.txId),
}));

export const sleeperMatchups = pgTable("sleeper_matchups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  week: integer("week").notNull(),
  matchupId: text("matchup_id").notNull(),
  rosterIdHome: text("roster_id_home"),
  rosterIdAway: text("roster_id_away"),
  scoreHome: numeric("score_home"),
  scoreAway: numeric("score_away"),
  status: text("status"),
  raw: jsonb("raw").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqLeagueWeekMatchup: unique("uq_sleeper_matchup_league_week_matchup").on(table.leagueId, table.week, table.matchupId),
}));

export const leagueStandings = pgTable("league_standings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  season: text("season").notNull(),
  asOf: timestamp("as_of").notNull().defaultNow(),
  table: jsonb("table").notNull(),
}, (table) => ({
  uniqLeagueSeasonAsOf: unique("uq_league_standings_league_season_asof").on(table.leagueId, table.season, table.asOf),
}));

export const botActivity = pgTable("bot_activity", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid("league_id").references(() => leagues.id),
  guildId: text("guild_id"),
  channelId: text("channel_id"),
  kind: text("kind").notNull(),
  key: text("key"),
  status: text("status").notNull(),
  detail: jsonb("detail").default({}),
  requestId: text("request_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertAccountSchema = createInsertSchema(accounts).pick({
  email: true,
  discordUserId: true,
  name: true,
  plan: true,
});

export const insertUserAccountSchema = createInsertSchema(userAccounts).pick({
  userId: true,
  accountId: true,
  role: true,
});

export const insertBetaInviteSchema = createInsertSchema(betaInvites).pick({
  code: true,
  claimedBy: true,
  claimedAt: true,
});

export const insertLeagueSchema = createInsertSchema(leagues).pick({
  accountId: true,
  name: true,
  platform: true,
  sleeperLeagueId: true,
  guildId: true,
  channelId: true,
  timezone: true,
  tone: true,
  featureFlags: true,
  modelPrefs: true,
  channels: true,
  personality: true,
});

export const insertMemberSchema = createInsertSchema(members).pick({
  leagueId: true,
  discordUserId: true,
  role: true,
  sleeperOwnerId: true,
  sleeperTeamName: true,
  discordUsername: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  leagueId: true,
  type: true,
  url: true,
  content: true,
  version: true,
});

export const insertRuleSchema = createInsertSchema(rules).pick({
  leagueId: true,
  documentId: true,
  version: true,
  sectionId: true,
  ruleKey: true,
  text: true,
  citations: true,
  tags: true,
});

export const insertFactSchema = createInsertSchema(facts).pick({
  leagueId: true,
  key: true,
  value: true,
  source: true,
});

export const insertDeadlineSchema = createInsertSchema(deadlines).pick({
  leagueId: true,
  type: true,
  isoTime: true,
  source: true,
  description: true,
  completed: true,
});

export const insertEventSchema = createInsertSchema(events).pick({
  leagueId: true,
  type: true,
  payload: true,
  requestId: true,
  latency: true,
});

export const insertEmbeddingSchema = createInsertSchema(embeddings).pick({
  ruleId: true,
  contentHash: true,
  embedding: true,
  provider: true,
  model: true,
});

export const insertPendingSetupSchema = createInsertSchema(pendingSetup).pick({
  webUserId: true,
  sessionId: true,
  selectedGuildId: true,
  selectedChannelId: true,
  sleeperUsername: true,
  sleeperSeason: true,
  selectedLeagueId: true,
  timezone: true,
});

export const insertOwnerMappingSchema = createInsertSchema(ownerMappings).pick({
  leagueId: true,
  sleeperOwnerId: true,
  sleeperTeamName: true,
  discordUserId: true,
  discordUsername: true,
});

export const insertPollSchema = createInsertSchema(polls).pick({
  leagueId: true,
  question: true,
  options: true,
  createdBy: true,
  anonymous: true,
  status: true,
  expiresAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  pollId: true,
  voterId: true,
  choice: true,
});

export const insertReminderSchema = createInsertSchema(reminders).pick({
  leagueId: true,
  type: true,
  cron: true,
  message: true,
  channelId: true,
  timezone: true,
  enabled: true,
  metadata: true,
});

export const insertSentimentLogSchema = createInsertSchema(sentimentLogs).pick({
  leagueId: true,
  channelId: true,
  messageId: true,
  authorId: true,
  summary: true,
  toxicityScore: true,
  sentimentScore: true,
});

export const insertModActionSchema = createInsertSchema(modActions).pick({
  leagueId: true,
  actor: true,
  action: true,
  targetChannelId: true,
  targetMessageId: true,
  reason: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).pick({
  leagueId: true,
  kind: true,
  subjectId: true,
  openedBy: true,
  status: true,
  details: true,
  resolution: true,
  resolvedAt: true,
});

export const insertTradeEvaluationSchema = createInsertSchema(tradeEvaluations).pick({
  leagueId: true,
  tradeId: true,
  fairnessScore: true,
  rationale: true,
  inputs: true,
});

export const insertTradeInsightSchema = createInsertSchema(tradeInsights).pick({
  leagueId: true,
  payload: true,
  fairness: true,
  rationale: true,
  projectionDelta: true,
  recommendation: true,
});

export const insertHighlightSchema = createInsertSchema(highlights).pick({
  leagueId: true,
  week: true,
  kind: true,
  payload: true,
});

export const insertRivalrySchema = createInsertSchema(rivalries).pick({
  leagueId: true,
  teamA: true,
  teamB: true,
  aWins: true,
  bWins: true,
  lastMeetingWeek: true,
  meta: true,
});

export const insertContentQueueSchema = createInsertSchema(contentQueue).pick({
  leagueId: true,
  channelId: true,
  scheduledAt: true,
  template: true,
  payload: true,
  status: true,
  postedMessageId: true,
});

export const insertBotActivitySchema = createInsertSchema(botActivity).pick({
  leagueId: true,
  guildId: true,
  channelId: true,
  kind: true,
  key: true,
  status: true,
  detail: true,
  requestId: true,
});

export const insertSleeperIntegrationSchema = createInsertSchema(sleeperIntegrations).pick({
  leagueId: true,
  sleeperLeagueId: true,
  season: true,
  sport: true,
  username: true,
});

export const insertSleeperSettingsSnapshotSchema = createInsertSchema(sleeperSettingsSnapshots).pick({
  leagueId: true,
  source: true,
  payload: true,
});

export const insertLeagueSettingsSchema = createInsertSchema(leagueSettings).pick({
  leagueId: true,
  scoring: true,
  roster: true,
  waivers: true,
  playoffs: true,
  trades: true,
  misc: true,
});

export const insertLeagueSettingsOverrideSchema = createInsertSchema(leagueSettingsOverrides).pick({
  leagueId: true,
  overrides: true,
  updatedBy: true,
});

export const insertSettingsChangeEventSchema = createInsertSchema(settingsChangeEvents).pick({
  leagueId: true,
  source: true,
  path: true,
  oldValue: true,
  newValue: true,
});

export const insertConstitutionTemplateSchema = createInsertSchema(constitutionTemplates).pick({
  leagueId: true,
  slug: true,
  templateMd: true,
});

export const insertConstitutionRenderSchema = createInsertSchema(constitutionRender).pick({
  leagueId: true,
  slug: true,
  contentMd: true,
});

export const insertSleeperRosterSchema = createInsertSchema(sleeperRosters).pick({
  leagueId: true,
  sleeperRosterId: true,
  ownerId: true,
  players: true,
  bench: true,
  ir: true,
  metadata: true,
});

export const insertSleeperTransactionSchema = createInsertSchema(sleeperTransactions).pick({
  leagueId: true,
  txId: true,
  type: true,
  status: true,
  faabSpent: true,
  adds: true,
  drops: true,
  parties: true,
  processedAt: true,
  raw: true,
});

export const insertSleeperMatchupSchema = createInsertSchema(sleeperMatchups).pick({
  leagueId: true,
  week: true,
  matchupId: true,
  rosterIdHome: true,
  rosterIdAway: true,
  scoreHome: true,
  scoreAway: true,
  status: true,
  raw: true,
});

export const insertLeagueStandingsSchema = createInsertSchema(leagueStandings).pick({
  leagueId: true,
  season: true,
  table: true,
});

// Types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type UserAccount = typeof userAccounts.$inferSelect;
export type InsertUserAccount = z.infer<typeof insertUserAccountSchema>;
export type BetaInvite = typeof betaInvites.$inferSelect;
export type InsertBetaInvite = z.infer<typeof insertBetaInviteSchema>;
export type League = typeof leagues.$inferSelect;
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Rule = typeof rules.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Fact = typeof facts.$inferSelect;
export type InsertFact = z.infer<typeof insertFactSchema>;
export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = z.infer<typeof insertEmbeddingSchema>;
export type DiscordInteraction = typeof discordInteractions.$inferSelect;
export type PendingSetup = typeof pendingSetup.$inferSelect;
export type InsertPendingSetup = z.infer<typeof insertPendingSetupSchema>;
export type OwnerMapping = typeof ownerMappings.$inferSelect;
export type InsertOwnerMapping = z.infer<typeof insertOwnerMappingSchema>;
export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type SentimentLog = typeof sentimentLogs.$inferSelect;
export type InsertSentimentLog = z.infer<typeof insertSentimentLogSchema>;
export type ModAction = typeof modActions.$inferSelect;
export type InsertModAction = z.infer<typeof insertModActionSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type TradeEvaluation = typeof tradeEvaluations.$inferSelect;
export type InsertTradeEvaluation = z.infer<typeof insertTradeEvaluationSchema>;
export type TradeInsight = typeof tradeInsights.$inferSelect;
export type InsertTradeInsight = z.infer<typeof insertTradeInsightSchema>;
export type Highlight = typeof highlights.$inferSelect;
export type InsertHighlight = z.infer<typeof insertHighlightSchema>;
export type Rivalry = typeof rivalries.$inferSelect;
export type InsertRivalry = z.infer<typeof insertRivalrySchema>;
export type ContentQueue = typeof contentQueue.$inferSelect;
export type InsertContentQueue = z.infer<typeof insertContentQueueSchema>;
export type BotActivity = typeof botActivity.$inferSelect;
export type InsertBotActivity = z.infer<typeof insertBotActivitySchema>;
export type SleeperIntegration = typeof sleeperIntegrations.$inferSelect;
export type InsertSleeperIntegration = z.infer<typeof insertSleeperIntegrationSchema>;
export type SleeperSettingsSnapshot = typeof sleeperSettingsSnapshots.$inferSelect;
export type InsertSleeperSettingsSnapshot = z.infer<typeof insertSleeperSettingsSnapshotSchema>;
export type LeagueSettings = typeof leagueSettings.$inferSelect;
export type InsertLeagueSettings = z.infer<typeof insertLeagueSettingsSchema>;
export type LeagueSettingsOverride = typeof leagueSettingsOverrides.$inferSelect;
export type InsertLeagueSettingsOverride = z.infer<typeof insertLeagueSettingsOverrideSchema>;
export type SettingsChangeEvent = typeof settingsChangeEvents.$inferSelect;
export type InsertSettingsChangeEvent = z.infer<typeof insertSettingsChangeEventSchema>;
export type ConstitutionTemplate = typeof constitutionTemplates.$inferSelect;
export type InsertConstitutionTemplate = z.infer<typeof insertConstitutionTemplateSchema>;
export type ConstitutionRender = typeof constitutionRender.$inferSelect;
export type InsertConstitutionRender = z.infer<typeof insertConstitutionRenderSchema>;
export type SleeperRoster = typeof sleeperRosters.$inferSelect;
export type InsertSleeperRoster = z.infer<typeof insertSleeperRosterSchema>;
export type SleeperTransaction = typeof sleeperTransactions.$inferSelect;
export type InsertSleeperTransaction = z.infer<typeof insertSleeperTransactionSchema>;
export type SleeperMatchup = typeof sleeperMatchups.$inferSelect;
export type InsertSleeperMatchup = z.infer<typeof insertSleeperMatchupSchema>;
export type LeagueStandings = typeof leagueStandings.$inferSelect;
export type InsertLeagueStandings = z.infer<typeof insertLeagueStandingsSchema>;

// Keep legacy user schema for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
