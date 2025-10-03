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
  "ERROR_OCCURRED"
]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "under_review", "resolved", "dismissed"]);
export const contentStatusEnum = pgEnum("content_status", ["queued", "posted", "skipped"]);

// Core tables
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  discordUserId: text("discord_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
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
    reminders: {
      lineupLock: true,
      waiver: true,
      tradeDeadline: true
    }
  }),
  modelPrefs: jsonb("model_prefs").default({
    maxTokens: 1000,
    provider: "deepseek"
  }),
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
  url: text("url"),
  content: text("content"),
  version: text("version").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

// Insert schemas
export const insertAccountSchema = createInsertSchema(accounts).pick({
  email: true,
  discordUserId: true,
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

// Types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
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
