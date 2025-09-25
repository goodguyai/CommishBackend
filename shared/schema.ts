import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, real, pgEnum, uuid, boolean, customType } from "drizzle-orm/pg-core";

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
  "COMMAND_EXECUTED",
  "ERROR_OCCURRED"
]);

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
  featureFlags: jsonb("feature_flags").default({
    qa: true,
    deadlines: true,
    digest: true,
    trade_helper: false
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
  role: memberRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  featureFlags: true,
  modelPrefs: true,
});

export const insertMemberSchema = createInsertSchema(members).pick({
  leagueId: true,
  discordUserId: true,
  role: true,
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
