import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, sql, cosineDistance, lte } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User, InsertUser, Account, InsertAccount, League, InsertLeague,
  Member, InsertMember, Document, InsertDocument, Rule, InsertRule,
  Fact, InsertFact, Deadline, InsertDeadline, Event, InsertEvent,
  DiscordInteraction, PendingSetup, InsertPendingSetup,
  OwnerMapping, InsertOwnerMapping, Poll, InsertPoll,
  Vote, InsertVote, Reminder, InsertReminder,
  SentimentLog, InsertSentimentLog, TradeInsight, InsertTradeInsight,
  ModAction, InsertModAction, Dispute, InsertDispute,
  TradeEvaluation, InsertTradeEvaluation,
  Highlight, InsertHighlight, Rivalry, InsertRivalry,
  ContentQueue, InsertContentQueue
} from "@shared/schema";
import { EmbeddingResult } from "./services/rag";
import { env } from "./services/env";

export interface IStorage {
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Account methods
  getAccount(id: string): Promise<Account | undefined>;
  getAccountByEmail(email: string): Promise<Account | undefined>;
  getAccountByDiscordId(discordUserId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<string>;
  updateAccountDiscordId(accountId: string, discordUserId: string): Promise<void>;

  // League methods
  getLeague(id: string): Promise<League | undefined>;
  getAllLeagues(): Promise<League[]>;
  getLeaguesByAccount(accountId: string): Promise<League[]>;
  getLeagueByGuildId(guildId: string): Promise<League | undefined>;
  getLeaguesByGuildId(guildId: string): Promise<League[]>;
  getLeagueBySleeperLeagueId(sleeperLeagueId: string): Promise<League | undefined>;
  createLeague(league: InsertLeague): Promise<string>;
  updateLeague(id: string, updates: Partial<League>): Promise<void>;
  deleteLeague(id: string): Promise<void>;

  // Member methods
  getMember(leagueId: string, discordUserId: string): Promise<Member | undefined>;
  getLeagueMembers(leagueId: string): Promise<Member[]>;
  getMembersByLeague(leagueId: string): Promise<Member[]>;
  createMember(member: InsertMember): Promise<string>;
  updateMemberRole(leagueId: string, discordUserId: string, role: "COMMISH" | "MANAGER"): Promise<void>;
  deleteMember(leagueId: string, discordUserId: string): Promise<void>;

  // Document methods
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByLeague(leagueId: string): Promise<Document[]>;
  getDocumentsWithMetadata(leagueId: string): Promise<Array<{
    id: string;
    title: string;
    version: string;
    contentType: string;
    chunksCount: number;
    lastIndexed: Date;
  }>>;
  createDocument(document: InsertDocument): Promise<string>;
  updateDocument(id: string, updates: Partial<Document>): Promise<void>;
  deleteDocument(id: string): Promise<void>;

  // Rule methods
  getRule(id: string): Promise<Rule | undefined>;
  getRulesByLeague(leagueId: string): Promise<Rule[]>;
  createRule(rule: InsertRule): Promise<string>;
  updateRule(id: string, updates: Partial<Rule>): Promise<void>;
  clearLeagueRules(leagueId: string): Promise<void>;

  // Embedding methods
  createEmbedding(ruleId: string, contentHash: string, vector: number[], provider?: string, model?: string): Promise<string>;
  getEmbeddingByContentHash(contentHash: string): Promise<{ id: string; embedding: number[] } | null>;
  searchSimilarEmbeddings(leagueId: string, queryVector: number[], limit: number, threshold: number): Promise<EmbeddingResult[]>;

  // Fact methods
  getFact(leagueId: string, key: string): Promise<Fact | undefined>;
  getFactsByLeague(leagueId: string): Promise<Fact[]>;
  createOrUpdateFact(fact: InsertFact): Promise<string>;
  deleteFact(leagueId: string, key: string): Promise<void>;

  // Deadline methods
  getDeadline(id: string): Promise<Deadline | undefined>;
  getUpcomingDeadlines(leagueId: string, limit?: number): Promise<Deadline[]>;
  createDeadline(deadline: InsertDeadline): Promise<string>;
  updateDeadline(id: string, updates: Partial<Deadline>): Promise<void>;
  markDeadlineCompleted(id: string): Promise<void>;
  deleteDeadline(id: string): Promise<void>;

  // Event methods
  createEvent(event: InsertEvent): Promise<string>;
  getRecentEvents(leagueId?: string, limit?: number): Promise<Event[]>;

  // Discord interaction methods
  createDiscordInteraction(interaction: any): Promise<string>;
  getInteractionStats(leagueId: string): Promise<any>;

  // Analytics methods
  getLeagueIndexStats(leagueId: string): Promise<{
    documentsCount: number;
    rulesCount: number;
    embeddingsCount: number;
    lastUpdated: Date | null;
  }>;

  // Pending setup methods
  getPendingSetup(sessionId: string): Promise<PendingSetup | undefined>;
  createPendingSetup(setup: InsertPendingSetup): Promise<string>;
  updatePendingSetup(sessionId: string, updates: Partial<PendingSetup>): Promise<void>;
  deletePendingSetup(sessionId: string): Promise<void>;
  cleanupExpiredSetups(): Promise<number>; // Returns count of deleted sessions

  // Owner mapping methods
  getOwnerMappings(leagueId: string): Promise<OwnerMapping[]>;
  getOwnerMapping(leagueId: string, sleeperOwnerId: string): Promise<OwnerMapping | undefined>;
  createOwnerMapping(mapping: InsertOwnerMapping): Promise<string>;
  updateOwnerMapping(leagueId: string, sleeperOwnerId: string, updates: Partial<OwnerMapping>): Promise<void>;
  deleteOwnerMapping(leagueId: string, sleeperOwnerId: string): Promise<void>;
  upsertOwnerMapping(mapping: InsertOwnerMapping): Promise<string>;

  // Poll methods
  getPolls(leagueId: string): Promise<Poll[]>;
  getPoll(id: string): Promise<Poll | undefined>;
  createPoll(poll: InsertPoll): Promise<string>;
  updatePoll(id: string, updates: Partial<Poll>): Promise<void>;
  deletePoll(id: string): Promise<void>;

  // Member/Owner Mapping methods (Phase 1)
  getMemberByDiscordId(leagueId: string, discordUserId: string): Promise<Member | undefined>;
  createOrUpdateMember(data: InsertMember): Promise<string>;
  getMembers(leagueId: string): Promise<Member[]>;
  upsertMember(data: {
    leagueId: string;
    discordUserId: string;
    sleeperOwnerId?: string;
    sleeperTeamName?: string;
    discordUsername?: string;
    role?: 'COMMISH' | 'MANAGER';
  }): Promise<Member>;

  // Reminder methods (Phase 1)
  getReminders(leagueId: string): Promise<Reminder[]>;
  createReminder(data: InsertReminder): Promise<string>;
  updateReminder(id: string, data: Partial<InsertReminder>): Promise<void>;
  deleteReminder(id: string): Promise<void>;

  // Vote methods (Phase 1)
  createVote(data: InsertVote): Promise<string>;
  getVotes(pollId: string): Promise<Vote[]>;
  getVoteCounts(pollId: string): Promise<{ choice: string; count: number }[]>;
  updatePollStatus(pollId: string, status: string): Promise<void>;

  // Sentiment methods (Phase 1)
  createSentimentLog(data: InsertSentimentLog): Promise<string>;
  getSentimentLogs(leagueId: string, since?: Date): Promise<SentimentLog[]>;

  // Trade Insight methods (Phase 1)
  createTradeInsight(data: InsertTradeInsight): Promise<string>;
  getTradeInsights(leagueId: string, limit?: number): Promise<TradeInsight[]>;

  // Phase 2 methods
  createModAction(data: InsertModAction): Promise<string>;
  createDispute(data: InsertDispute): Promise<string>;
  getDispute(id: string): Promise<Dispute | undefined>;
  getDisputesByLeague(leagueId: string): Promise<Dispute[]>;
  updateDispute(id: string, updates: Partial<Dispute>): Promise<void>;
  createTradeEvaluation(data: InsertTradeEvaluation): Promise<string>;
  getTradeEvaluation(leagueId: string, tradeId: string): Promise<TradeEvaluation | undefined>;

  // Phase 3 methods
  createHighlight(highlight: InsertHighlight): Promise<string>;
  getHighlightsByLeagueWeek(leagueId: string, week: number): Promise<Highlight[]>;
  deleteHighlightsByLeagueWeek(leagueId: string, week: number): Promise<void>;
  createOrUpdateRivalry(rivalry: InsertRivalry): Promise<string>;
  getRivalry(leagueId: string, teamA: string, teamB: string): Promise<Rivalry | undefined>;
  getRivalriesByLeague(leagueId: string): Promise<Rivalry[]>;
  createContentQueueItem(item: InsertContentQueue): Promise<string>;
  getQueuedContent(now: Date): Promise<ContentQueue[]>;
  getContentQueueByLeague(leagueId: string, status?: string): Promise<ContentQueue[]>;
  updateContentQueueStatus(id: string, status: string, postedMessageId?: string): Promise<void>;

  // Activation flow methods (Phase 4)
  getUserAccount(userId: string): Promise<string | null>;
  linkUserAccount(userId: string, accountId: string, role: string): Promise<void>;
  findDemoLeague(accountId: string): Promise<string | null>;

  // Sleeper sync methods
  saveSleeperLink(params: { leagueId: string; sleeperLeagueId: string; season: string; username?: string }): Promise<void>;
  getSleeperIntegration(leagueId: string): Promise<{ sleeperLeagueId: string; season: string; sport: string } | null>;
  saveSleeperSnapshot(params: { leagueId: string; payload: any }): Promise<void>;
  getLeagueSettings(leagueId: string): Promise<any | null>;
  saveLeagueSettings(params: { leagueId: string; scoring: any; roster: any; waivers: any; playoffs: any; trades: any; misc: any }): Promise<void>;
  saveSettingsChangeEvent(params: { leagueId: string; source: string; path: string; oldValue: any; newValue: any }): Promise<void>;
  getSettingsChangeEvents(leagueId: string, limit?: number): Promise<any[]>;
  saveConstitutionTemplate(params: { leagueId: string; slug: string; templateMd: string }): Promise<void>;
  getConstitutionTemplates(leagueId: string): Promise<any[]>;
  saveConstitutionRender(params: { leagueId: string; slug: string; contentMd: string }): Promise<void>;
  getConstitutionRenders(leagueId: string): Promise<any[]>;
  getLeagueSettingsOverrides(leagueId: string): Promise<any | null>;
  saveLeagueSettingsOverrides(params: { leagueId: string; overrides: any; updatedBy?: string }): Promise<void>;

  // Migration methods
  runRawSQL(query: string): Promise<any>;
  ensurePgVectorExtension(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    const databaseUrl = env.database.url;
    
    // Safety check: ensure we're using Supabase (direct or pooler)
    const url = new URL(databaseUrl);
    const isSupabaseDirect = url.hostname.endsWith('.supabase.co');
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');
    
    if (!isSupabaseDirect && !isSupabasePooler) {
      throw new Error(`Safety check: expected Supabase host (*.supabase.co or *.pooler.supabase.com), got ${url.hostname}`);
    }
    
    const connection = postgres(databaseUrl, {
      ssl: { rejectUnauthorized: false },
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Required for transaction pooler
    });
    this.db = drizzle(connection, { schema });
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    const users = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return users[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return users[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const users = await this.db.insert(schema.users).values(insertUser).returning();
    return users[0];
  }

  // Account methods
  async getAccount(id: string): Promise<Account | undefined> {
    const accounts = await this.db.select().from(schema.accounts).where(eq(schema.accounts.id, id));
    return accounts[0];
  }

  async getAccountByEmail(email: string): Promise<Account | undefined> {
    const accounts = await this.db.select().from(schema.accounts).where(eq(schema.accounts.email, email));
    return accounts[0];
  }

  async getAccountByDiscordId(discordUserId: string): Promise<Account | undefined> {
    const accounts = await this.db.select().from(schema.accounts).where(eq(schema.accounts.discordUserId, discordUserId));
    return accounts[0];
  }

  async createAccount(account: InsertAccount): Promise<string> {
    const accounts = await this.db.insert(schema.accounts).values(account).returning();
    return accounts[0].id;
  }

  async updateAccountDiscordId(accountId: string, discordUserId: string): Promise<void> {
    await this.db.update(schema.accounts)
      .set({ discordUserId })
      .where(eq(schema.accounts.id, accountId));
  }

  // League methods
  async getLeague(id: string): Promise<League | undefined> {
    const leagues = await this.db.select().from(schema.leagues).where(eq(schema.leagues.id, id));
    return leagues[0];
  }

  async getAllLeagues(): Promise<League[]> {
    return this.db.select().from(schema.leagues);
  }

  async getLeaguesByAccount(accountId: string): Promise<League[]> {
    return this.db.select().from(schema.leagues).where(eq(schema.leagues.accountId, accountId));
  }

  async getLeagueByGuildId(guildId: string): Promise<League | undefined> {
    const leagues = await this.db.select().from(schema.leagues).where(eq(schema.leagues.guildId, guildId));
    return leagues[0];
  }

  async getLeaguesByGuildId(guildId: string): Promise<League[]> {
    return await this.db.select().from(schema.leagues).where(eq(schema.leagues.guildId, guildId));
  }

  async getLeagueBySleeperLeagueId(sleeperLeagueId: string): Promise<League | undefined> {
    const leagues = await this.db.select().from(schema.leagues).where(eq(schema.leagues.sleeperLeagueId, sleeperLeagueId));
    return leagues[0];
  }

  async createLeague(league: InsertLeague): Promise<string> {
    const leagues = await this.db.insert(schema.leagues).values(league).returning();
    return leagues[0].id;
  }

  async updateLeague(id: string, updates: Partial<League>): Promise<void> {
    await this.db.update(schema.leagues)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.leagues.id, id));
  }

  async deleteLeague(id: string): Promise<void> {
    await this.db.delete(schema.leagues).where(eq(schema.leagues.id, id));
  }

  // Member methods
  async getMember(leagueId: string, discordUserId: string): Promise<Member | undefined> {
    const members = await this.db.select().from(schema.members)
      .where(and(eq(schema.members.leagueId, leagueId), eq(schema.members.discordUserId, discordUserId)));
    return members[0];
  }

  async getLeagueMembers(leagueId: string): Promise<Member[]> {
    return this.db.select().from(schema.members).where(eq(schema.members.leagueId, leagueId));
  }

  async getMembersByLeague(leagueId: string): Promise<Member[]> {
    return this.db.select().from(schema.members).where(eq(schema.members.leagueId, leagueId));
  }

  async createMember(member: InsertMember): Promise<string> {
    const members = await this.db.insert(schema.members).values(member).returning();
    return members[0].id;
  }

  async updateMemberRole(leagueId: string, discordUserId: string, role: "COMMISH" | "MANAGER"): Promise<void> {
    await this.db.update(schema.members)
      .set({ role })
      .where(and(eq(schema.members.leagueId, leagueId), eq(schema.members.discordUserId, discordUserId)));
  }

  async deleteMember(leagueId: string, discordUserId: string): Promise<void> {
    await this.db.delete(schema.members)
      .where(and(eq(schema.members.leagueId, leagueId), eq(schema.members.discordUserId, discordUserId)));
  }

  // Document methods
  async getDocument(id: string): Promise<Document | undefined> {
    const documents = await this.db.select().from(schema.documents).where(eq(schema.documents.id, id));
    return documents[0];
  }

  async getDocumentsByLeague(leagueId: string): Promise<Document[]> {
    return this.db.select().from(schema.documents)
      .where(eq(schema.documents.leagueId, leagueId))
      .orderBy(desc(schema.documents.createdAt));
  }

  async getDocumentsWithMetadata(leagueId: string): Promise<Array<{
    id: string;
    title: string;
    version: string;
    contentType: string;
    chunksCount: number;
    lastIndexed: Date;
  }>> {
    const result = await this.db.select({
      id: schema.documents.id,
      title: schema.documents.title,
      version: schema.documents.version,
      type: schema.documents.type,
      updatedAt: schema.documents.updatedAt,
      rulesCount: sql<number>`COUNT(DISTINCT ${schema.rules.id})::int`,
    })
      .from(schema.documents)
      .leftJoin(schema.rules, eq(schema.rules.documentId, schema.documents.id))
      .where(eq(schema.documents.leagueId, leagueId))
      .groupBy(schema.documents.id, schema.documents.title, schema.documents.version, schema.documents.type, schema.documents.updatedAt)
      .orderBy(desc(schema.documents.updatedAt));

    return result.map(row => ({
      id: row.id,
      title: row.title,
      version: row.version,
      contentType: row.type === 'ORIGINAL' ? 'text/plain' : 'text/plain',
      chunksCount: row.rulesCount,
      lastIndexed: row.updatedAt || new Date(),
    }));
  }

  async createDocument(document: InsertDocument): Promise<string> {
    const documents = await this.db.insert(schema.documents).values(document).returning();
    return documents[0].id;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    await this.db.update(schema.documents)
      .set(updates)
      .where(eq(schema.documents.id, id));
  }

  async deleteDocument(id: string): Promise<void> {
    await this.db.delete(schema.documents).where(eq(schema.documents.id, id));
  }

  // Rule methods
  async getRule(id: string): Promise<Rule | undefined> {
    const rules = await this.db.select().from(schema.rules).where(eq(schema.rules.id, id));
    return rules[0];
  }

  async getRulesByLeague(leagueId: string): Promise<Rule[]> {
    return this.db.select().from(schema.rules).where(eq(schema.rules.leagueId, leagueId));
  }

  async createRule(rule: InsertRule): Promise<string> {
    const rules = await this.db.insert(schema.rules).values(rule).returning();
    return rules[0].id;
  }

  async updateRule(id: string, updates: Partial<Rule>): Promise<void> {
    await this.db.update(schema.rules)
      .set(updates)
      .where(eq(schema.rules.id, id));
  }

  async clearLeagueRules(leagueId: string): Promise<void> {
    // First delete embeddings for rules in this league
    await this.db.execute(sql`
      DELETE FROM ${schema.embeddings} 
      WHERE rule_id IN (
        SELECT id FROM ${schema.rules} WHERE league_id = ${leagueId}
      )
    `);
    
    // Then delete the rules
    await this.db.delete(schema.rules).where(eq(schema.rules.leagueId, leagueId));
  }

  // Embedding methods
  async getEmbeddingByContentHash(contentHash: string): Promise<{ id: string; embedding: number[] } | null> {
    const results = await this.db.execute(sql`
      SELECT id, embedding FROM ${schema.embeddings} WHERE content_hash = ${contentHash} LIMIT 1
    `);
    const row = (results as unknown as any[])[0];
    if (!row) return null;
    
    // Parse embedding with robust type handling
    let embedding: number[];
    if (Array.isArray(row.embedding)) {
      embedding = row.embedding;
    } else if (typeof row.embedding === 'string') {
      try {
        // Try JSON parse first
        embedding = JSON.parse(row.embedding);
      } catch {
        // Fallback to manual parsing for pgvector string format
        const embeddingStr = row.embedding.replace(/[\[\]]/g, '');
        embedding = embeddingStr.split(',').map((n: string) => parseFloat(n.trim()));
      }
    } else {
      console.warn('Unknown embedding format, treating as cache miss');
      return null;
    }
    
    // Validate embedding and treat zero vectors as cache miss
    if (!embedding || embedding.length === 0 || embedding.every(val => val === 0)) {
      console.warn('Invalid or zero embedding found, treating as cache miss');
      return null;
    }
    
    return { id: row.id, embedding };
  }

  async createEmbedding(ruleId: string, contentHash: string, vector: number[], provider: string = "openai", model: string = "text-embedding-3-small"): Promise<string> {
    const embeddings = await this.db.execute(sql`
      INSERT INTO ${schema.embeddings} (rule_id, content_hash, embedding, provider, model)
      VALUES (${ruleId}, ${contentHash}, ${sql.raw(`'[${vector.join(',')}]'::vector`)}, ${provider}, ${model})
      RETURNING id
    `);
    return (embeddings as unknown as any[])[0]?.id;
  }

  async searchSimilarEmbeddings(
    leagueId: string,
    queryVector: number[],
    limit: number,
    threshold: number
  ): Promise<EmbeddingResult[]> {
    const results = await this.db.execute(sql`
      SELECT 
        e.rule_id,
        1 - (e.embedding <=> ${sql.raw(`'[${queryVector.join(',')}]'::vector`)}) as similarity,
        r.text,
        r.rule_key,
        r.citations,
        r.section_id,
        r.version,
        r.document_id,
        d.title as document_title,
        d.version as document_version
      FROM ${schema.embeddings} e
      JOIN ${schema.rules} r ON e.rule_id = r.id
      JOIN ${schema.documents} d ON r.document_id = d.id
      WHERE r.league_id = ${leagueId}
        AND 1 - (e.embedding <=> ${sql.raw(`'[${queryVector.join(',')}]'::vector`)}) > ${threshold}
      ORDER BY e.embedding <=> ${sql.raw(`'[${queryVector.join(',')}]'::vector`)}
      LIMIT ${limit}
    `);

    return (results as unknown as any[]).map(row => ({
      ruleId: row.rule_id,
      similarity: row.similarity,
      rule: {
        text: row.text,
        ruleKey: row.rule_key,
        citations: row.citations,
        sectionId: row.section_id,
        version: row.version,
        documentId: row.document_id,
      },
      sourceDoc: row.document_title,
      sourceVersion: row.document_version,
      confidence: row.similarity,
    }));
  }

  // Fact methods
  async getFact(leagueId: string, key: string): Promise<Fact | undefined> {
    const facts = await this.db.select().from(schema.facts)
      .where(and(eq(schema.facts.leagueId, leagueId), eq(schema.facts.key, key)));
    return facts[0];
  }

  async getFactsByLeague(leagueId: string): Promise<Fact[]> {
    return this.db.select().from(schema.facts).where(eq(schema.facts.leagueId, leagueId));
  }

  async createOrUpdateFact(fact: InsertFact): Promise<string> {
    const existing = await this.getFact(fact.leagueId, fact.key);
    
    if (existing) {
      await this.db.update(schema.facts)
        .set({ value: fact.value, source: fact.source, updatedAt: new Date() })
        .where(and(eq(schema.facts.leagueId, fact.leagueId), eq(schema.facts.key, fact.key)));
      return existing.id;
    } else {
      const facts = await this.db.insert(schema.facts).values(fact).returning();
      return facts[0].id;
    }
  }

  async deleteFact(leagueId: string, key: string): Promise<void> {
    await this.db.delete(schema.facts)
      .where(and(eq(schema.facts.leagueId, leagueId), eq(schema.facts.key, key)));
  }

  // Deadline methods
  async getDeadline(id: string): Promise<Deadline | undefined> {
    const deadlines = await this.db.select().from(schema.deadlines).where(eq(schema.deadlines.id, id));
    return deadlines[0];
  }

  async getUpcomingDeadlines(leagueId: string, limit: number = 10): Promise<Deadline[]> {
    return this.db.select().from(schema.deadlines)
      .where(and(
        eq(schema.deadlines.leagueId, leagueId),
        eq(schema.deadlines.completed, false),
        sql`${schema.deadlines.isoTime} > NOW()`
      ))
      .orderBy(schema.deadlines.isoTime)
      .limit(limit);
  }

  async createDeadline(deadline: InsertDeadline): Promise<string> {
    const deadlines = await this.db.insert(schema.deadlines).values(deadline).returning();
    return deadlines[0].id;
  }

  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<void> {
    await this.db.update(schema.deadlines)
      .set(updates)
      .where(eq(schema.deadlines.id, id));
  }

  async markDeadlineCompleted(id: string): Promise<void> {
    await this.db.update(schema.deadlines)
      .set({ completed: true })
      .where(eq(schema.deadlines.id, id));
  }

  async deleteDeadline(id: string): Promise<void> {
    await this.db.delete(schema.deadlines).where(eq(schema.deadlines.id, id));
  }

  // Event methods
  async createEvent(event: InsertEvent): Promise<string> {
    const events = await this.db.insert(schema.events).values(event).returning();
    return events[0].id;
  }

  async getRecentEvents(leagueId?: string, limit: number = 50): Promise<Event[]> {
    if (leagueId) {
      return this.db.select().from(schema.events)
        .where(eq(schema.events.leagueId, leagueId))
        .orderBy(desc(schema.events.createdAt))
        .limit(limit);
    }
    
    return this.db.select().from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(limit);
  }

  // Discord interaction methods
  async createDiscordInteraction(interaction: any): Promise<string> {
    const interactions = await this.db.insert(schema.discordInteractions).values(interaction).returning();
    return interactions[0].id;
  }

  async getInteractionStats(leagueId: string): Promise<any> {
    const stats = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total_interactions,
        AVG(response_time) as avg_response_time,
        SUM(tokens_used) as total_tokens,
        COUNT(DISTINCT user_id) as unique_users
      FROM ${schema.discordInteractions}
      WHERE league_id = ${leagueId}
        AND created_at > NOW() - INTERVAL '24 hours'
    `);

    return (stats as any)[0];
  }

  // Analytics methods
  async getLeagueIndexStats(leagueId: string): Promise<{
    documentsCount: number;
    rulesCount: number;
    embeddingsCount: number;
    lastUpdated: Date | null;
  }> {
    const stats = await this.db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM ${schema.documents} WHERE league_id = ${leagueId}) as documents_count,
        (SELECT COUNT(*) FROM ${schema.rules} WHERE league_id = ${leagueId}) as rules_count,
        (SELECT COUNT(*) FROM ${schema.embeddings} e 
         JOIN ${schema.rules} r ON e.rule_id = r.id 
         WHERE r.league_id = ${leagueId}) as embeddings_count,
        (SELECT MAX(created_at) FROM ${schema.rules} WHERE league_id = ${leagueId}) as last_updated
    `);

    const result = (stats as any)[0];
    
    return {
      documentsCount: parseInt(result.documents_count) || 0,
      rulesCount: parseInt(result.rules_count) || 0,
      embeddingsCount: parseInt(result.embeddings_count) || 0,
      lastUpdated: result.last_updated ? new Date(result.last_updated) : null,
    };
  }

  // Pending setup methods
  async getPendingSetup(sessionId: string): Promise<PendingSetup | undefined> {
    const results = await this.db.select().from(schema.pendingSetup).where(eq(schema.pendingSetup.sessionId, sessionId));
    const setup = results[0];
    
    // Check expiry - return undefined if expired
    if (setup && setup.expiresAt && new Date() > setup.expiresAt) {
      await this.deletePendingSetup(sessionId); // Clean up expired session
      return undefined;
    }
    
    return setup;
  }

  async createPendingSetup(insertSetup: InsertPendingSetup): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour TTL
    
    const results = await this.db.insert(schema.pendingSetup)
      .values({ ...insertSetup, expiresAt })
      .returning({ id: schema.pendingSetup.id });
    return results[0].id;
  }

  async updatePendingSetup(sessionId: string, updates: Partial<PendingSetup>): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Refresh 24 hour TTL on updates
    
    // Exclude expiresAt from updates to prevent override
    const { expiresAt: _, ...safeUpdates } = updates;
    
    await this.db.update(schema.pendingSetup)
      .set({ ...safeUpdates, updatedAt: new Date(), expiresAt })
      .where(eq(schema.pendingSetup.sessionId, sessionId));
  }

  async deletePendingSetup(sessionId: string): Promise<void> {
    await this.db.delete(schema.pendingSetup).where(eq(schema.pendingSetup.sessionId, sessionId));
  }

  async cleanupExpiredSetups(): Promise<number> {
    const result = await this.db.delete(schema.pendingSetup)
      .where(sql`${schema.pendingSetup.expiresAt} < NOW()`)
      .returning({ id: schema.pendingSetup.id });
    return result.length;
  }

  // Owner mapping methods
  async getOwnerMappings(leagueId: string): Promise<OwnerMapping[]> {
    return await this.db.select().from(schema.ownerMappings).where(eq(schema.ownerMappings.leagueId, leagueId));
  }

  async getOwnerMapping(leagueId: string, sleeperOwnerId: string): Promise<OwnerMapping | undefined> {
    const results = await this.db.select().from(schema.ownerMappings)
      .where(and(eq(schema.ownerMappings.leagueId, leagueId), eq(schema.ownerMappings.sleeperOwnerId, sleeperOwnerId)));
    return results[0];
  }

  async createOwnerMapping(mapping: InsertOwnerMapping): Promise<string> {
    const results = await this.db.insert(schema.ownerMappings).values(mapping).returning({ id: schema.ownerMappings.id });
    return results[0].id;
  }

  async updateOwnerMapping(leagueId: string, sleeperOwnerId: string, updates: Partial<OwnerMapping>): Promise<void> {
    await this.db.update(schema.ownerMappings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.ownerMappings.leagueId, leagueId), eq(schema.ownerMappings.sleeperOwnerId, sleeperOwnerId)));
  }

  async deleteOwnerMapping(leagueId: string, sleeperOwnerId: string): Promise<void> {
    await this.db.delete(schema.ownerMappings)
      .where(and(eq(schema.ownerMappings.leagueId, leagueId), eq(schema.ownerMappings.sleeperOwnerId, sleeperOwnerId)));
  }

  async upsertOwnerMapping(mapping: InsertOwnerMapping): Promise<string> {
    const existing = await this.getOwnerMapping(mapping.leagueId, mapping.sleeperOwnerId);
    if (existing) {
      await this.updateOwnerMapping(mapping.leagueId, mapping.sleeperOwnerId, mapping);
      return existing.id;
    } else {
      return await this.createOwnerMapping(mapping);
    }
  }

  // Poll methods implementation
  async getPolls(leagueId: string): Promise<Poll[]> {
    return this.db.select().from(schema.polls).where(eq(schema.polls.leagueId, leagueId)).orderBy(desc(schema.polls.createdAt));
  }

  async getPoll(id: string): Promise<Poll | undefined> {
    const results = await this.db.select().from(schema.polls).where(eq(schema.polls.id, id));
    return results[0];
  }

  async createPoll(poll: InsertPoll): Promise<string> {
    const results = await this.db.insert(schema.polls).values(poll).returning({ id: schema.polls.id });
    return results[0].id;
  }

  async updatePoll(id: string, updates: Partial<Poll>): Promise<void> {
    await this.db.update(schema.polls).set(updates).where(eq(schema.polls.id, id));
  }

  async deletePoll(id: string): Promise<void> {
    await this.db.delete(schema.polls).where(eq(schema.polls.id, id));
  }

  // Member/Owner Mapping methods (Phase 1)
  async getMemberByDiscordId(leagueId: string, discordUserId: string): Promise<Member | undefined> {
    return this.getMember(leagueId, discordUserId);
  }

  async createOrUpdateMember(data: InsertMember): Promise<string> {
    try {
      const result = await this.db.insert(schema.members)
        .values(data)
        .onConflictDoUpdate({
          target: [schema.members.leagueId, schema.members.discordUserId],
          set: {
            role: data.role,
            sleeperOwnerId: data.sleeperOwnerId,
            sleeperTeamName: data.sleeperTeamName,
            discordUsername: data.discordUsername,
          }
        })
        .returning({ id: schema.members.id });
      return result[0].id;
    } catch (error) {
      console.error('Error in createOrUpdateMember:', error);
      throw error;
    }
  }

  async getMembers(leagueId: string): Promise<Member[]> {
    return this.db.select()
      .from(schema.members)
      .where(eq(schema.members.leagueId, leagueId))
      .orderBy(schema.members.sleeperTeamName);
  }

  async upsertMember(data: {
    leagueId: string;
    discordUserId: string;
    sleeperOwnerId?: string;
    sleeperTeamName?: string;
    discordUsername?: string;
    role?: 'COMMISH' | 'MANAGER';
  }): Promise<Member> {
    const existing = await this.db.select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.leagueId, data.leagueId),
          eq(schema.members.discordUserId, data.discordUserId)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      const [updated] = await this.db.update(schema.members)
        .set({
          sleeperOwnerId: data.sleeperOwnerId,
          sleeperTeamName: data.sleeperTeamName,
          discordUsername: data.discordUsername,
          role: data.role || 'MANAGER',
        })
        .where(eq(schema.members.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [inserted] = await this.db.insert(schema.members)
        .values({
          leagueId: data.leagueId,
          discordUserId: data.discordUserId,
          sleeperOwnerId: data.sleeperOwnerId,
          sleeperTeamName: data.sleeperTeamName,
          discordUsername: data.discordUsername,
          role: data.role || 'MANAGER',
        })
        .returning();
      return inserted;
    }
  }

  // Reminder methods (Phase 1)
  async getReminders(leagueId: string): Promise<Reminder[]> {
    return this.db.select()
      .from(schema.reminders)
      .where(eq(schema.reminders.leagueId, leagueId))
      .orderBy(desc(schema.reminders.createdAt));
  }

  async createReminder(data: InsertReminder): Promise<string> {
    const result = await this.db.insert(schema.reminders)
      .values(data)
      .returning({ id: schema.reminders.id });
    return result[0].id;
  }

  async updateReminder(id: string, data: Partial<InsertReminder>): Promise<void> {
    await this.db.update(schema.reminders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.reminders.id, id));
  }

  async deleteReminder(id: string): Promise<void> {
    await this.db.delete(schema.reminders).where(eq(schema.reminders.id, id));
  }

  // Vote methods (Phase 1)
  async createVote(data: InsertVote): Promise<string> {
    try {
      const result = await this.db.insert(schema.votes)
        .values(data)
        .onConflictDoUpdate({
          target: [schema.votes.pollId, schema.votes.voterId],
          set: {
            choice: data.choice,
          }
        })
        .returning({ id: schema.votes.id });
      return result[0].id;
    } catch (error) {
      console.error('Error in createVote:', error);
      throw error;
    }
  }

  async getVotes(pollId: string): Promise<Vote[]> {
    return this.db.select()
      .from(schema.votes)
      .where(eq(schema.votes.pollId, pollId))
      .orderBy(desc(schema.votes.createdAt));
  }

  async getVoteCounts(pollId: string): Promise<{ choice: string; count: number }[]> {
    const results = await this.db.execute(sql`
      SELECT choice, COUNT(*)::int as count
      FROM ${schema.votes}
      WHERE poll_id = ${pollId}
      GROUP BY choice
      ORDER BY count DESC
    `);
    return (results as unknown as any[]).map(row => ({
      choice: row.choice,
      count: row.count
    }));
  }

  async updatePollStatus(pollId: string, status: string): Promise<void> {
    await this.db.update(schema.polls)
      .set({ status })
      .where(eq(schema.polls.id, pollId));
  }

  // Sentiment methods (Phase 1)
  async createSentimentLog(data: InsertSentimentLog): Promise<string> {
    const result = await this.db.insert(schema.sentimentLogs)
      .values(data)
      .returning({ id: schema.sentimentLogs.id });
    return result[0].id;
  }

  async getSentimentLogs(leagueId: string, since?: Date): Promise<SentimentLog[]> {
    if (since) {
      return this.db.select()
        .from(schema.sentimentLogs)
        .where(and(
          eq(schema.sentimentLogs.leagueId, leagueId),
          sql`${schema.sentimentLogs.createdAt} >= ${since.toISOString()}`
        ))
        .orderBy(desc(schema.sentimentLogs.createdAt));
    }
    return this.db.select()
      .from(schema.sentimentLogs)
      .where(eq(schema.sentimentLogs.leagueId, leagueId))
      .orderBy(desc(schema.sentimentLogs.createdAt));
  }

  // Trade Insight methods (Phase 1)
  async createTradeInsight(data: InsertTradeInsight): Promise<string> {
    const result = await this.db.insert(schema.tradeInsights)
      .values(data)
      .returning({ id: schema.tradeInsights.id });
    return result[0].id;
  }

  async getTradeInsights(leagueId: string, limit: number = 10): Promise<TradeInsight[]> {
    return this.db.select()
      .from(schema.tradeInsights)
      .where(eq(schema.tradeInsights.leagueId, leagueId))
      .orderBy(desc(schema.tradeInsights.createdAt))
      .limit(limit);
  }

  // Phase 2 methods implementation
  async createModAction(data: InsertModAction): Promise<string> {
    const result = await this.db.insert(schema.modActions)
      .values(data)
      .returning({ id: schema.modActions.id });
    return result[0].id;
  }

  async createDispute(data: InsertDispute): Promise<string> {
    const result = await this.db.insert(schema.disputes)
      .values(data)
      .returning({ id: schema.disputes.id });
    return result[0].id;
  }

  async getDispute(id: string): Promise<Dispute | undefined> {
    const results = await this.db.select()
      .from(schema.disputes)
      .where(eq(schema.disputes.id, id));
    return results[0];
  }

  async getDisputesByLeague(leagueId: string): Promise<Dispute[]> {
    const results = await this.db.select()
      .from(schema.disputes)
      .where(eq(schema.disputes.leagueId, leagueId));
    return results;
  }

  async updateDispute(id: string, updates: Partial<Dispute>): Promise<void> {
    await this.db.update(schema.disputes)
      .set(updates)
      .where(eq(schema.disputes.id, id));
  }

  async createTradeEvaluation(data: InsertTradeEvaluation): Promise<string> {
    const result = await this.db.insert(schema.tradeEvaluations)
      .values(data)
      .returning({ id: schema.tradeEvaluations.id });
    return result[0].id;
  }

  async getTradeEvaluation(leagueId: string, tradeId: string): Promise<TradeEvaluation | undefined> {
    const results = await this.db.select()
      .from(schema.tradeEvaluations)
      .where(and(
        eq(schema.tradeEvaluations.leagueId, leagueId),
        eq(schema.tradeEvaluations.tradeId, tradeId)
      ))
      .orderBy(desc(schema.tradeEvaluations.createdAt))
      .limit(1);
    return results[0];
  }

  // Phase 3 methods implementation
  async createHighlight(highlight: InsertHighlight): Promise<string> {
    const result = await this.db.insert(schema.highlights)
      .values(highlight)
      .returning({ id: schema.highlights.id });
    return result[0].id;
  }

  async getHighlightsByLeagueWeek(leagueId: string, week: number): Promise<Highlight[]> {
    return this.db.select().from(schema.highlights)
      .where(and(
        eq(schema.highlights.leagueId, leagueId),
        eq(schema.highlights.week, week)
      ))
      .orderBy(desc(schema.highlights.createdAt));
  }

  async deleteHighlightsByLeagueWeek(leagueId: string, week: number): Promise<void> {
    await this.db.delete(schema.highlights)
      .where(and(
        eq(schema.highlights.leagueId, leagueId),
        eq(schema.highlights.week, week)
      ));
  }

  async createOrUpdateRivalry(rivalry: InsertRivalry): Promise<string> {
    const existing = await this.getRivalry(rivalry.leagueId, rivalry.teamA, rivalry.teamB);
    
    if (existing) {
      await this.db.update(schema.rivalries)
        .set(rivalry)
        .where(eq(schema.rivalries.id, existing.id));
      return existing.id;
    } else {
      const result = await this.db.insert(schema.rivalries)
        .values(rivalry)
        .returning({ id: schema.rivalries.id });
      return result[0].id;
    }
  }

  async getRivalry(leagueId: string, teamA: string, teamB: string): Promise<Rivalry | undefined> {
    const rivalries = await this.db.select().from(schema.rivalries)
      .where(and(
        eq(schema.rivalries.leagueId, leagueId),
        eq(schema.rivalries.teamA, teamA),
        eq(schema.rivalries.teamB, teamB)
      ));
    return rivalries[0];
  }

  async getRivalriesByLeague(leagueId: string): Promise<Rivalry[]> {
    return this.db.select().from(schema.rivalries)
      .where(eq(schema.rivalries.leagueId, leagueId))
      .orderBy(desc(sql`${schema.rivalries.aWins} + ${schema.rivalries.bWins}`));
  }

  async createContentQueueItem(item: InsertContentQueue): Promise<string> {
    const result = await this.db.insert(schema.contentQueue)
      .values(item)
      .returning({ id: schema.contentQueue.id });
    return result[0].id;
  }

  async getQueuedContent(now: Date): Promise<ContentQueue[]> {
    return this.db.select().from(schema.contentQueue)
      .where(and(
        eq(schema.contentQueue.status, "queued"),
        lte(schema.contentQueue.scheduledAt, now)
      ))
      .orderBy(schema.contentQueue.scheduledAt);
  }

  async getContentQueueByLeague(leagueId: string, status?: string): Promise<ContentQueue[]> {
    if (status) {
      return this.db.select().from(schema.contentQueue)
        .where(and(
          eq(schema.contentQueue.leagueId, leagueId),
          eq(schema.contentQueue.status, status as "queued" | "posted" | "skipped")
        ))
        .orderBy(desc(schema.contentQueue.createdAt));
    } else {
      return this.db.select().from(schema.contentQueue)
        .where(eq(schema.contentQueue.leagueId, leagueId))
        .orderBy(desc(schema.contentQueue.createdAt));
    }
  }

  async updateContentQueueStatus(id: string, status: string, postedMessageId?: string): Promise<void> {
    await this.db.update(schema.contentQueue)
      .set({ 
        status: status as "queued" | "posted" | "skipped",
        postedMessageId: postedMessageId || null
      })
      .where(eq(schema.contentQueue.id, id));
  }

  // Activation flow methods (Phase 4)
  async getUserAccount(userId: string): Promise<string | null> {
    const results = await this.db.select({ accountId: schema.userAccounts.accountId })
      .from(schema.userAccounts)
      .where(eq(schema.userAccounts.userId, userId))
      .limit(1);
    return results[0]?.accountId || null;
  }

  async linkUserAccount(userId: string, accountId: string, role: string): Promise<void> {
    await this.db.insert(schema.userAccounts)
      .values({ userId, accountId, role })
      .onConflictDoNothing();
  }

  async findDemoLeague(accountId: string): Promise<string | null> {
    const results = await this.db.select({ id: schema.leagues.id })
      .from(schema.leagues)
      .where(and(
        eq(schema.leagues.accountId, accountId),
        sql`(feature_flags->>'demo')::boolean = true`
      ))
      .limit(1);
    return results[0]?.id || null;
  }

  // Sleeper sync methods implementation
  async saveSleeperLink(params: { leagueId: string; sleeperLeagueId: string; season: string; username?: string }): Promise<void> {
    await this.db.insert(schema.sleeperIntegrations)
      .values({
        leagueId: params.leagueId,
        sleeperLeagueId: params.sleeperLeagueId,
        season: params.season,
        username: params.username || null,
      })
      .onConflictDoUpdate({
        target: schema.sleeperIntegrations.leagueId,
        set: {
          sleeperLeagueId: params.sleeperLeagueId,
          season: params.season,
          username: params.username || null,
        },
      });
  }

  async getSleeperIntegration(leagueId: string): Promise<{ sleeperLeagueId: string; season: string; sport: string } | null> {
    const results = await this.db.select()
      .from(schema.sleeperIntegrations)
      .where(eq(schema.sleeperIntegrations.leagueId, leagueId))
      .limit(1);
    return results[0] || null;
  }

  async saveSleeperSnapshot(params: { leagueId: string; payload: any }): Promise<void> {
    await this.db.insert(schema.sleeperSettingsSnapshots)
      .values({
        leagueId: params.leagueId,
        payload: params.payload,
      });
  }

  async getLeagueSettings(leagueId: string): Promise<any | null> {
    const results = await this.db.select()
      .from(schema.leagueSettings)
      .where(eq(schema.leagueSettings.leagueId, leagueId))
      .limit(1);
    return results[0] || null;
  }

  async saveLeagueSettings(params: { leagueId: string; scoring: any; roster: any; waivers: any; playoffs: any; trades: any; misc: any }): Promise<void> {
    await this.db.insert(schema.leagueSettings)
      .values({
        leagueId: params.leagueId,
        scoring: params.scoring,
        roster: params.roster,
        waivers: params.waivers,
        playoffs: params.playoffs,
        trades: params.trades,
        misc: params.misc,
      })
      .onConflictDoUpdate({
        target: schema.leagueSettings.leagueId,
        set: {
          scoring: params.scoring,
          roster: params.roster,
          waivers: params.waivers,
          playoffs: params.playoffs,
          trades: params.trades,
          misc: params.misc,
          updatedAt: new Date(),
        },
      });
  }

  async saveSettingsChangeEvent(params: { leagueId: string; source: string; path: string; oldValue: any; newValue: any }): Promise<void> {
    await this.db.insert(schema.settingsChangeEvents)
      .values({
        leagueId: params.leagueId,
        source: params.source,
        path: params.path,
        oldValue: params.oldValue,
        newValue: params.newValue,
      });
  }

  async getSettingsChangeEvents(leagueId: string, limit: number = 50): Promise<any[]> {
    return this.db.select()
      .from(schema.settingsChangeEvents)
      .where(eq(schema.settingsChangeEvents.leagueId, leagueId))
      .orderBy(desc(schema.settingsChangeEvents.detectedAt))
      .limit(limit);
  }

  async saveConstitutionTemplate(params: { leagueId: string; slug: string; templateMd: string }): Promise<void> {
    await this.db.insert(schema.constitutionTemplates)
      .values({
        leagueId: params.leagueId,
        slug: params.slug,
        templateMd: params.templateMd,
      })
      .onConflictDoUpdate({
        target: [schema.constitutionTemplates.leagueId, schema.constitutionTemplates.slug],
        set: {
          templateMd: params.templateMd,
        },
      });
  }

  async getConstitutionTemplates(leagueId: string): Promise<any[]> {
    return this.db.select()
      .from(schema.constitutionTemplates)
      .where(eq(schema.constitutionTemplates.leagueId, leagueId))
      .orderBy(schema.constitutionTemplates.slug);
  }

  async saveConstitutionRender(params: { leagueId: string; slug: string; contentMd: string }): Promise<void> {
    await this.db.insert(schema.constitutionRender)
      .values({
        leagueId: params.leagueId,
        slug: params.slug,
        contentMd: params.contentMd,
      })
      .onConflictDoUpdate({
        target: [schema.constitutionRender.leagueId, schema.constitutionRender.slug],
        set: {
          contentMd: params.contentMd,
          renderedAt: new Date(),
        },
      });
  }

  async getConstitutionRenders(leagueId: string): Promise<any[]> {
    return this.db.select()
      .from(schema.constitutionRender)
      .where(eq(schema.constitutionRender.leagueId, leagueId))
      .orderBy(schema.constitutionRender.slug);
  }

  async getLeagueSettingsOverrides(leagueId: string): Promise<any | null> {
    const results = await this.db.select()
      .from(schema.leagueSettingsOverrides)
      .where(eq(schema.leagueSettingsOverrides.leagueId, leagueId))
      .limit(1);
    return results[0] || null;
  }

  async saveLeagueSettingsOverrides(params: { leagueId: string; overrides: any; updatedBy?: string }): Promise<void> {
    await this.db.insert(schema.leagueSettingsOverrides)
      .values({
        leagueId: params.leagueId,
        overrides: params.overrides,
        updatedBy: params.updatedBy || null,
      })
      .onConflictDoUpdate({
        target: schema.leagueSettingsOverrides.leagueId,
        set: {
          overrides: params.overrides,
          updatedBy: params.updatedBy || null,
          updatedAt: new Date(),
        },
      });
  }

  // Migration methods implementation
  async runRawSQL(query: string): Promise<any> {
    return this.db.execute(sql.raw(query));
  }

  async ensurePgVectorExtension(): Promise<void> {
    await this.db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  }
}

// Keep the existing MemStorage for backward compatibility
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private accounts: Map<string, Account> = new Map();
  private leagues: Map<string, League> = new Map();
  private members: Map<string, Member> = new Map();
  private documents: Map<string, Document> = new Map();
  private rules: Map<string, Rule> = new Map();
  private facts: Map<string, Fact> = new Map();
  private deadlines: Map<string, Deadline> = new Map();
  private events: Map<string, Event> = new Map();
  private ownerMappings: Map<string, OwnerMapping> = new Map();
  private reminders: Map<string, Reminder> = new Map();
  private votes: Map<string, Vote> = new Map();
  private sentimentLogs: Map<string, SentimentLog> = new Map();
  private tradeInsights: Map<string, TradeInsight> = new Map();
  private modActions: Map<string, ModAction> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private tradeEvaluations: Map<string, TradeEvaluation> = new Map();
  private highlights: Map<string, Highlight> = new Map();
  private rivalries: Map<string, Rivalry> = new Map();
  private contentQueueItems: Map<string, ContentQueue> = new Map();

  // Helper to generate IDs
  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.generateId();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Stub implementations for all other methods
  async getAccount(id: string): Promise<Account | undefined> { return this.accounts.get(id); }
  async getAccountByEmail(email: string): Promise<Account | undefined> { 
    return Array.from(this.accounts.values()).find(acc => acc.email === email);
  }
  async getAccountByDiscordId(discordUserId: string): Promise<Account | undefined> {
    return Array.from(this.accounts.values()).find(acc => acc.discordUserId === discordUserId);
  }
  async createAccount(account: InsertAccount): Promise<string> {
    const id = this.generateId();
    const newAccount: Account = { 
      ...account, 
      id, 
      createdAt: new Date(),
      discordUserId: account.discordUserId ?? null,
      name: account.name ?? null,
      plan: account.plan ?? null
    };
    this.accounts.set(id, newAccount);
    return id;
  }
  async updateAccountDiscordId(accountId: string, discordUserId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (account) {
      account.discordUserId = discordUserId;
    }
  }

  // Stub all other methods with minimal implementations
  async getLeague(id: string): Promise<League | undefined> { return this.leagues.get(id); }
  async getAllLeagues(): Promise<League[]> {
    return Array.from(this.leagues.values());
  }
  async getLeaguesByAccount(accountId: string): Promise<League[]> { 
    return Array.from(this.leagues.values()).filter(l => l.accountId === accountId);
  }
  async getLeagueByGuildId(guildId: string): Promise<League | undefined> {
    return Array.from(this.leagues.values()).find(l => l.guildId === guildId);
  }
  async getLeaguesByGuildId(guildId: string): Promise<League[]> {
    return Array.from(this.leagues.values()).filter(l => l.guildId === guildId);
  }
  async getLeagueBySleeperLeagueId(sleeperLeagueId: string): Promise<League | undefined> {
    return Array.from(this.leagues.values()).find(l => l.sleeperLeagueId === sleeperLeagueId);
  }
  async createLeague(league: InsertLeague): Promise<string> {
    const id = this.generateId();
    const newLeague: League = { 
      ...league, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date(),
      platform: league.platform ?? "sleeper",
      sleeperLeagueId: league.sleeperLeagueId ?? null,
      guildId: league.guildId ?? null,
      channelId: league.channelId ?? null,
      timezone: league.timezone ?? null,
      tone: league.tone ?? null,
      digestFrequency: league.digestFrequency ?? null,
      featureFlags: league.featureFlags ?? { qa: true, deadlines: true, digest: true, trade_helper: false, autoMeme: false, reminders: { lineupLock: true, waiver: true, tradeDeadline: true } },
      modelPrefs: league.modelPrefs ?? { maxTokens: 1000, provider: "deepseek" },
      channels: league.channels ?? { digests: null, reminders: null, polls: null, highlights: null },
      personality: league.personality ?? { style: "neutral", customTemplate: null }
    };
    this.leagues.set(id, newLeague);
    return id;
  }
  async updateLeague(id: string, updates: Partial<League>): Promise<void> {
    const league = this.leagues.get(id);
    if (league) {
      Object.assign(league, updates, { updatedAt: new Date() });
    }
  }
  async deleteLeague(id: string): Promise<void> { this.leagues.delete(id); }

  async getMember(leagueId: string, discordUserId: string): Promise<Member | undefined> {
    return Array.from(this.members.values()).find(m => m.leagueId === leagueId && m.discordUserId === discordUserId);
  }
  async getLeagueMembers(leagueId: string): Promise<Member[]> {
    return Array.from(this.members.values()).filter(m => m.leagueId === leagueId);
  }
  async getMembersByLeague(leagueId: string): Promise<Member[]> {
    return Array.from(this.members.values()).filter(m => m.leagueId === leagueId);
  }
  async createMember(member: InsertMember): Promise<string> {
    const id = this.generateId();
    const newMember: Member = { 
      ...member, 
      id, 
      role: member.role ?? null,
      createdAt: new Date(),
      sleeperOwnerId: member.sleeperOwnerId ?? null,
      sleeperTeamName: member.sleeperTeamName ?? null,
      discordUsername: member.discordUsername ?? null
    };
    this.members.set(id, newMember);
    return id;
  }
  async updateMemberRole(leagueId: string, discordUserId: string, role: "COMMISH" | "MANAGER"): Promise<void> {
    const member = await this.getMember(leagueId, discordUserId);
    if (member) member.role = role;
  }
  async deleteMember(leagueId: string, discordUserId: string): Promise<void> {
    const member = await this.getMember(leagueId, discordUserId);
    if (member) this.members.delete(member.id);
  }

  // Continue with stub implementations for all other interface methods...
  async getDocument(id: string): Promise<Document | undefined> { return this.documents.get(id); }
  async getDocumentsByLeague(leagueId: string): Promise<Document[]> { 
    return Array.from(this.documents.values()).filter(d => d.leagueId === leagueId);
  }
  async getDocumentsWithMetadata(leagueId: string): Promise<Array<{
    id: string;
    title: string;
    version: string;
    contentType: string;
    chunksCount: number;
    lastIndexed: Date;
  }>> {
    const docs = Array.from(this.documents.values()).filter(d => d.leagueId === leagueId);
    return docs.map(doc => {
      const rules = Array.from(this.rules.values()).filter(r => r.documentId === doc.id);
      return {
        id: doc.id,
        title: (doc as any).title || 'League Constitution',
        version: doc.version,
        contentType: doc.type === 'ORIGINAL' ? 'text/plain' : 'text/plain',
        chunksCount: rules.length,
        lastIndexed: (doc as any).updatedAt || doc.createdAt || new Date(),
      };
    });
  }
  async createDocument(document: InsertDocument): Promise<string> {
    const id = this.generateId();
    const newDocument: Document = { 
      ...document, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      title: document.title || 'League Constitution',
      url: document.url ?? null,
      content: document.content ?? null
    };
    this.documents.set(id, newDocument);
    return id;
  }
  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    const document = this.documents.get(id);
    if (document) Object.assign(document, updates);
  }
  async deleteDocument(id: string): Promise<void> { this.documents.delete(id); }

  async getRule(id: string): Promise<Rule | undefined> { return this.rules.get(id); }
  async getRulesByLeague(leagueId: string): Promise<Rule[]> {
    return Array.from(this.rules.values()).filter(r => r.leagueId === leagueId);
  }
  async createRule(rule: InsertRule): Promise<string> {
    const id = this.generateId();
    const newRule: Rule = { 
      ...rule, 
      id, 
      createdAt: new Date(),
      citations: rule.citations ?? [],
      tags: rule.tags ?? []
    };
    this.rules.set(id, newRule);
    return id;
  }
  async updateRule(id: string, updates: Partial<Rule>): Promise<void> {
    const rule = this.rules.get(id);
    if (rule) Object.assign(rule, updates);
  }
  async clearLeagueRules(leagueId: string): Promise<void> {
    const ruleIds = Array.from(this.rules.entries())
      .filter(([_, rule]) => rule.leagueId === leagueId)
      .map(([id, _]) => id);
    ruleIds.forEach(id => this.rules.delete(id));
  }

  async getEmbeddingByContentHash(contentHash: string): Promise<{ id: string; embedding: number[] } | null> { return null; }
  async createEmbedding(ruleId: string, contentHash: string, vector: number[], provider?: string, model?: string): Promise<string> { return this.generateId(); }
  async searchSimilarEmbeddings(leagueId: string, queryVector: number[], limit: number, threshold: number): Promise<EmbeddingResult[]> {
    return [];
  }

  async getFact(leagueId: string, key: string): Promise<Fact | undefined> {
    return Array.from(this.facts.values()).find(f => f.leagueId === leagueId && f.key === key);
  }
  async getFactsByLeague(leagueId: string): Promise<Fact[]> {
    return Array.from(this.facts.values()).filter(f => f.leagueId === leagueId);
  }
  async createOrUpdateFact(fact: InsertFact): Promise<string> {
    const existing = await this.getFact(fact.leagueId, fact.key);
    if (existing) {
      Object.assign(existing, fact, { updatedAt: new Date() });
      return existing.id;
    } else {
      const id = this.generateId();
      const newFact: Fact = { ...fact, id, updatedAt: new Date() };
      this.facts.set(id, newFact);
      return id;
    }
  }
  async deleteFact(leagueId: string, key: string): Promise<void> {
    const fact = await this.getFact(leagueId, key);
    if (fact) this.facts.delete(fact.id);
  }

  async getDeadline(id: string): Promise<Deadline | undefined> { return this.deadlines.get(id); }
  async getUpcomingDeadlines(leagueId: string, limit?: number): Promise<Deadline[]> {
    return Array.from(this.deadlines.values())
      .filter(d => d.leagueId === leagueId && !d.completed && new Date(d.isoTime) > new Date())
      .sort((a, b) => new Date(a.isoTime).getTime() - new Date(b.isoTime).getTime())
      .slice(0, limit || 10);
  }
  async createDeadline(deadline: InsertDeadline): Promise<string> {
    const id = this.generateId();
    const newDeadline: Deadline = { 
      ...deadline, 
      id, 
      createdAt: new Date(),
      description: deadline.description ?? null,
      completed: deadline.completed ?? null
    };
    this.deadlines.set(id, newDeadline);
    return id;
  }
  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<void> {
    const deadline = this.deadlines.get(id);
    if (deadline) Object.assign(deadline, updates);
  }
  async markDeadlineCompleted(id: string): Promise<void> {
    const deadline = this.deadlines.get(id);
    if (deadline) deadline.completed = true;
  }
  async deleteDeadline(id: string): Promise<void> { this.deadlines.delete(id); }

  async createEvent(event: InsertEvent): Promise<string> {
    const id = this.generateId();
    const newEvent: Event = { 
      ...event, 
      id, 
      createdAt: new Date(),
      leagueId: event.leagueId ?? null,
      payload: event.payload ?? {},
      requestId: event.requestId ?? null,
      latency: event.latency ?? null
    };
    this.events.set(id, newEvent);
    return id;
  }
  async getRecentEvents(leagueId?: string, limit?: number): Promise<Event[]> {
    let events = Array.from(this.events.values());
    if (leagueId) {
      events = events.filter(e => e.leagueId === leagueId);
    }
    return events
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit || 50);
  }

  async createDiscordInteraction(interaction: any): Promise<string> { return this.generateId(); }
  async getInteractionStats(leagueId: string): Promise<any> {
    return {
      total_interactions: 0,
      avg_response_time: 0,
      total_tokens: 0,
      unique_users: 0,
    };
  }

  async getLeagueIndexStats(leagueId: string): Promise<{
    documentsCount: number;
    rulesCount: number;
    embeddingsCount: number;
    lastUpdated: Date | null;
  }> {
    return {
      documentsCount: 0,
      rulesCount: 0,
      embeddingsCount: 0,
      lastUpdated: null,
    };
  }

  // Pending setup methods (in-memory implementation)
  private pendingSetups = new Map<string, PendingSetup>();

  async getPendingSetup(sessionId: string): Promise<PendingSetup | undefined> {
    const setup = this.pendingSetups.get(sessionId);
    
    // Check expiry - return undefined if expired
    if (setup && setup.expiresAt && new Date() > setup.expiresAt) {
      this.pendingSetups.delete(sessionId); // Clean up expired session
      return undefined;
    }
    
    return setup;
  }

  async createPendingSetup(insertSetup: InsertPendingSetup): Promise<string> {
    const id = this.generateId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour TTL
    
    const newSetup: PendingSetup = {
      ...insertSetup,
      id,
      timezone: insertSetup.timezone || "America/New_York",
      webUserId: insertSetup.webUserId || null,
      sessionId: insertSetup.sessionId || null,
      selectedGuildId: insertSetup.selectedGuildId || null,
      selectedChannelId: insertSetup.selectedChannelId || null,
      sleeperUsername: insertSetup.sleeperUsername || null,
      sleeperSeason: insertSetup.sleeperSeason || null,
      selectedLeagueId: insertSetup.selectedLeagueId || null,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (insertSetup.sessionId) {
      this.pendingSetups.set(insertSetup.sessionId, newSetup);
    }
    return id;
  }

  async updatePendingSetup(sessionId: string, updates: Partial<PendingSetup>): Promise<void> {
    const existing = this.pendingSetups.get(sessionId);
    if (existing) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Refresh 24 hour TTL on updates
      // Exclude expiresAt from updates to prevent override
      const { expiresAt: _, ...safeUpdates } = updates;
      this.pendingSetups.set(sessionId, { ...existing, ...safeUpdates, updatedAt: new Date(), expiresAt });
    }
  }

  async deletePendingSetup(sessionId: string): Promise<void> {
    this.pendingSetups.delete(sessionId);
  }

  async cleanupExpiredSetups(): Promise<number> {
    const now = new Date();
    let count = 0;
    Array.from(this.pendingSetups.entries()).forEach(([sessionId, setup]) => {
      if (setup.expiresAt && now > setup.expiresAt) {
        this.pendingSetups.delete(sessionId);
        count++;
      }
    });
    return count;
  }

  // Owner mapping methods
  async getOwnerMappings(leagueId: string): Promise<OwnerMapping[]> {
    return Array.from(this.ownerMappings.values()).filter(m => m.leagueId === leagueId);
  }

  async getOwnerMapping(leagueId: string, sleeperOwnerId: string): Promise<OwnerMapping | undefined> {
    return Array.from(this.ownerMappings.values()).find(m => m.leagueId === leagueId && m.sleeperOwnerId === sleeperOwnerId);
  }

  async createOwnerMapping(mapping: InsertOwnerMapping): Promise<string> {
    const id = this.generateId();
    const newMapping: OwnerMapping = {
      ...mapping,
      id,
      sleeperTeamName: mapping.sleeperTeamName ?? null,
      discordUsername: mapping.discordUsername ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.ownerMappings.set(id, newMapping);
    return id;
  }

  async updateOwnerMapping(leagueId: string, sleeperOwnerId: string, updates: Partial<OwnerMapping>): Promise<void> {
    const existing = await this.getOwnerMapping(leagueId, sleeperOwnerId);
    if (existing) {
      Object.assign(existing, updates, { updatedAt: new Date() });
    }
  }

  async deleteOwnerMapping(leagueId: string, sleeperOwnerId: string): Promise<void> {
    const mapping = await this.getOwnerMapping(leagueId, sleeperOwnerId);
    if (mapping) {
      this.ownerMappings.delete(mapping.id);
    }
  }

  async upsertOwnerMapping(mapping: InsertOwnerMapping): Promise<string> {
    const existing = await this.getOwnerMapping(mapping.leagueId, mapping.sleeperOwnerId);
    if (existing) {
      await this.updateOwnerMapping(mapping.leagueId, mapping.sleeperOwnerId, mapping);
      return existing.id;
    } else {
      return await this.createOwnerMapping(mapping);
    }
  }

  // Poll methods implementation
  private polls = new Map<string, Poll>();

  async getPolls(leagueId: string): Promise<Poll[]> {
    return Array.from(this.polls.values())
      .filter(poll => poll.leagueId === leagueId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPoll(id: string): Promise<Poll | undefined> {
    return this.polls.get(id);
  }

  async createPoll(poll: InsertPoll): Promise<string> {
    const id = Math.random().toString(36).substring(7);
    const newPoll: Poll = {
      id,
      ...poll,
      status: poll.status ?? "open",
      anonymous: poll.anonymous ?? true,
      discordMessageId: null,
      expiresAt: poll.expiresAt || null,
      createdAt: new Date(),
    };
    this.polls.set(id, newPoll);
    return id;
  }

  async updatePoll(id: string, updates: Partial<Poll>): Promise<void> {
    const existing = this.polls.get(id);
    if (existing) {
      Object.assign(existing, updates);
    }
  }

  async deletePoll(id: string): Promise<void> {
    this.polls.delete(id);
  }

  // Member/Owner Mapping methods (Phase 1)
  async getMemberByDiscordId(leagueId: string, discordUserId: string): Promise<Member | undefined> {
    return this.getMember(leagueId, discordUserId);
  }

  async createOrUpdateMember(data: InsertMember): Promise<string> {
    const existing = await this.getMember(data.leagueId, data.discordUserId);
    if (existing) {
      Object.assign(existing, data);
      return existing.id;
    } else {
      return await this.createMember(data);
    }
  }

  async getMembers(leagueId: string): Promise<Member[]> {
    return Array.from(this.members.values())
      .filter(m => m.leagueId === leagueId)
      .sort((a, b) => {
        const nameA = a.sleeperTeamName || '';
        const nameB = b.sleeperTeamName || '';
        return nameA.localeCompare(nameB);
      });
  }

  async upsertMember(data: {
    leagueId: string;
    discordUserId: string;
    sleeperOwnerId?: string;
    sleeperTeamName?: string;
    discordUsername?: string;
    role?: 'COMMISH' | 'MANAGER';
  }): Promise<Member> {
    const existing = await this.getMember(data.leagueId, data.discordUserId);
    
    if (existing) {
      Object.assign(existing, {
        sleeperOwnerId: data.sleeperOwnerId,
        sleeperTeamName: data.sleeperTeamName,
        discordUsername: data.discordUsername,
        role: data.role || 'MANAGER',
      });
      return existing;
    } else {
      const id = this.generateId();
      const newMember: Member = {
        id,
        leagueId: data.leagueId,
        discordUserId: data.discordUserId,
        role: data.role || 'MANAGER',
        sleeperOwnerId: data.sleeperOwnerId || null,
        sleeperTeamName: data.sleeperTeamName || null,
        discordUsername: data.discordUsername || null,
        createdAt: new Date(),
      };
      this.members.set(id, newMember);
      return newMember;
    }
  }

  // Reminder methods (Phase 1)
  async getReminders(leagueId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values())
      .filter(r => r.leagueId === leagueId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createReminder(data: InsertReminder): Promise<string> {
    const id = this.generateId();
    const newReminder: Reminder = {
      id,
      ...data,
      message: data.message ?? null,
      channelId: data.channelId ?? null,
      timezone: data.timezone ?? "UTC",
      enabled: data.enabled ?? true,
      metadata: data.metadata ?? {},
      lastFired: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.reminders.set(id, newReminder);
    return id;
  }

  async updateReminder(id: string, data: Partial<InsertReminder>): Promise<void> {
    const existing = this.reminders.get(id);
    if (existing) {
      Object.assign(existing, data, { updatedAt: new Date() });
    }
  }

  async deleteReminder(id: string): Promise<void> {
    this.reminders.delete(id);
  }

  // Vote methods (Phase 1)
  async createVote(data: InsertVote): Promise<string> {
    const existing = Array.from(this.votes.values())
      .find(v => v.pollId === data.pollId && v.voterId === data.voterId);
    
    if (existing) {
      existing.choice = data.choice;
      return existing.id;
    }

    const id = this.generateId();
    const newVote: Vote = {
      id,
      ...data,
      createdAt: new Date()
    };
    this.votes.set(id, newVote);
    return id;
  }

  async getVotes(pollId: string): Promise<Vote[]> {
    return Array.from(this.votes.values())
      .filter(v => v.pollId === pollId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getVoteCounts(pollId: string): Promise<{ choice: string; count: number }[]> {
    const votes = await this.getVotes(pollId);
    const counts = new Map<string, number>();
    
    votes.forEach(vote => {
      const current = counts.get(vote.choice) || 0;
      counts.set(vote.choice, current + 1);
    });

    return Array.from(counts.entries())
      .map(([choice, count]) => ({ choice, count }))
      .sort((a, b) => b.count - a.count);
  }

  async updatePollStatus(pollId: string, status: string): Promise<void> {
    const poll = this.polls.get(pollId);
    if (poll) {
      poll.status = status;
    }
  }

  // Sentiment methods (Phase 1)
  async createSentimentLog(data: InsertSentimentLog): Promise<string> {
    const id = this.generateId();
    const newLog: SentimentLog = {
      id,
      ...data,
      summary: data.summary ?? null,
      toxicityScore: data.toxicityScore ?? null,
      sentimentScore: data.sentimentScore ?? null,
      createdAt: new Date()
    };
    this.sentimentLogs.set(id, newLog);
    return id;
  }

  async getSentimentLogs(leagueId: string, since?: Date): Promise<SentimentLog[]> {
    let logs = Array.from(this.sentimentLogs.values())
      .filter(log => log.leagueId === leagueId);
    
    if (since) {
      logs = logs.filter(log => log.createdAt && log.createdAt >= since);
    }

    return logs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Trade Insight methods (Phase 1)
  async createTradeInsight(data: InsertTradeInsight): Promise<string> {
    const id = this.generateId();
    const newInsight: TradeInsight = {
      id,
      ...data,
      fairness: data.fairness ?? null,
      rationale: data.rationale ?? null,
      projectionDelta: data.projectionDelta ?? null,
      recommendation: data.recommendation ?? null,
      createdAt: new Date()
    };
    this.tradeInsights.set(id, newInsight);
    return id;
  }

  async getTradeInsights(leagueId: string, limit: number = 10): Promise<TradeInsight[]> {
    return Array.from(this.tradeInsights.values())
      .filter(insight => insight.leagueId === leagueId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  // Phase 2 methods implementation
  async createModAction(data: InsertModAction): Promise<string> {
    const id = this.generateId();
    const newAction: ModAction = {
      id,
      ...data,
      targetChannelId: data.targetChannelId ?? null,
      targetMessageId: data.targetMessageId ?? null,
      reason: data.reason ?? null,
      createdAt: new Date()
    };
    this.modActions.set(id, newAction);
    return id;
  }

  async createDispute(data: InsertDispute): Promise<string> {
    const id = this.generateId();
    const newDispute: Dispute = {
      id,
      ...data,
      subjectId: data.subjectId ?? null,
      status: data.status ?? "open",
      details: data.details ?? null,
      resolution: data.resolution ?? null,
      resolvedAt: data.resolvedAt ?? null,
      createdAt: new Date()
    };
    this.disputes.set(id, newDispute);
    return id;
  }

  async getDispute(id: string): Promise<Dispute | undefined> {
    return this.disputes.get(id);
  }

  async getDisputesByLeague(leagueId: string): Promise<Dispute[]> {
    return Array.from(this.disputes.values()).filter(d => d.leagueId === leagueId);
  }

  async updateDispute(id: string, updates: Partial<Dispute>): Promise<void> {
    const existing = this.disputes.get(id);
    if (existing) {
      this.disputes.set(id, { ...existing, ...updates });
    }
  }

  async createTradeEvaluation(data: InsertTradeEvaluation): Promise<string> {
    const id = this.generateId();
    const newEvaluation: TradeEvaluation = {
      id,
      ...data,
      fairnessScore: data.fairnessScore ?? null,
      rationale: data.rationale ?? null,
      inputs: data.inputs ?? null,
      createdAt: new Date()
    };
    this.tradeEvaluations.set(id, newEvaluation);
    return id;
  }

  async getTradeEvaluation(leagueId: string, tradeId: string): Promise<TradeEvaluation | undefined> {
    const evaluations = Array.from(this.tradeEvaluations.values())
      .filter(e => e.leagueId === leagueId && e.tradeId === tradeId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return evaluations[0];
  }

  // Phase 3 methods implementation
  async createHighlight(highlight: InsertHighlight): Promise<string> {
    const id = this.generateId();
    const newHighlight: Highlight = {
      id,
      ...highlight,
      createdAt: new Date()
    };
    this.highlights.set(id, newHighlight);
    return id;
  }

  async getHighlightsByLeagueWeek(leagueId: string, week: number): Promise<Highlight[]> {
    return Array.from(this.highlights.values())
      .filter(h => h.leagueId === leagueId && h.week === week)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async deleteHighlightsByLeagueWeek(leagueId: string, week: number): Promise<void> {
    this.highlights.forEach((highlight, id) => {
      if (highlight.leagueId === leagueId && highlight.week === week) {
        this.highlights.delete(id);
      }
    });
  }

  async createOrUpdateRivalry(rivalry: InsertRivalry): Promise<string> {
    const existing = await this.getRivalry(rivalry.leagueId, rivalry.teamA, rivalry.teamB);
    
    if (existing) {
      Object.assign(existing, rivalry);
      return existing.id;
    } else {
      const id = this.generateId();
      const newRivalry: Rivalry = {
        id,
        ...rivalry,
        aWins: rivalry.aWins ?? 0,
        bWins: rivalry.bWins ?? 0,
        lastMeetingWeek: rivalry.lastMeetingWeek ?? null,
        meta: rivalry.meta ?? null
      };
      this.rivalries.set(id, newRivalry);
      return id;
    }
  }

  async getRivalry(leagueId: string, teamA: string, teamB: string): Promise<Rivalry | undefined> {
    return Array.from(this.rivalries.values())
      .find(r => r.leagueId === leagueId && r.teamA === teamA && r.teamB === teamB);
  }

  async getRivalriesByLeague(leagueId: string): Promise<Rivalry[]> {
    return Array.from(this.rivalries.values())
      .filter(r => r.leagueId === leagueId)
      .sort((a, b) => (b.aWins + b.bWins) - (a.aWins + a.bWins));
  }

  async createContentQueueItem(item: InsertContentQueue): Promise<string> {
    const id = this.generateId();
    const newItem: ContentQueue = {
      id,
      ...item,
      status: item.status ?? "queued",
      postedMessageId: item.postedMessageId ?? null,
      createdAt: new Date()
    };
    this.contentQueueItems.set(id, newItem);
    return id;
  }

  async getQueuedContent(now: Date): Promise<ContentQueue[]> {
    return Array.from(this.contentQueueItems.values())
      .filter(item => item.status === "queued" && item.scheduledAt <= now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async getContentQueueByLeague(leagueId: string, status?: string): Promise<ContentQueue[]> {
    let items = Array.from(this.contentQueueItems.values())
      .filter(item => item.leagueId === leagueId);
    
    if (status) {
      items = items.filter(item => item.status === status);
    }
    
    return items.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateContentQueueStatus(id: string, status: string, postedMessageId?: string): Promise<void> {
    const item = this.contentQueueItems.get(id);
    if (item) {
      item.status = status as "queued" | "posted" | "skipped";
      if (postedMessageId) {
        item.postedMessageId = postedMessageId;
      }
    }
  }

  // Activation flow methods (Phase 4) - in-memory stub implementations
  async getUserAccount(userId: string): Promise<string | null> {
    return null;
  }

  async linkUserAccount(userId: string, accountId: string, role: string): Promise<void> {
    console.log("MemStorage: linkUserAccount not implemented");
  }

  async findDemoLeague(accountId: string): Promise<string | null> {
    return Array.from(this.leagues.values())
      .find(l => l.accountId === accountId && (l.featureFlags as any)?.demo === true)?.id || null;
  }

  // Sleeper sync methods (stub implementations for in-memory storage)
  async saveSleeperLink(params: { leagueId: string; sleeperLeagueId: string; season: string; username?: string }): Promise<void> {
    console.log("MemStorage: saveSleeperLink not implemented");
  }

  async getSleeperIntegration(leagueId: string): Promise<{ sleeperLeagueId: string; season: string; sport: string } | null> {
    return null;
  }

  async saveSleeperSnapshot(params: { leagueId: string; payload: any }): Promise<void> {
    console.log("MemStorage: saveSleeperSnapshot not implemented");
  }

  async getLeagueSettings(leagueId: string): Promise<any | null> {
    return null;
  }

  async saveLeagueSettings(params: { leagueId: string; scoring: any; roster: any; waivers: any; playoffs: any; trades: any; misc: any }): Promise<void> {
    console.log("MemStorage: saveLeagueSettings not implemented");
  }

  async saveSettingsChangeEvent(params: { leagueId: string; source: string; path: string; oldValue: any; newValue: any }): Promise<void> {
    console.log("MemStorage: saveSettingsChangeEvent not implemented");
  }

  async getSettingsChangeEvents(leagueId: string, limit: number = 50): Promise<any[]> {
    return [];
  }

  async saveConstitutionTemplate(params: { leagueId: string; slug: string; templateMd: string }): Promise<void> {
    console.log("MemStorage: saveConstitutionTemplate not implemented");
  }

  async getConstitutionTemplates(leagueId: string): Promise<any[]> {
    return [];
  }

  async saveConstitutionRender(params: { leagueId: string; slug: string; contentMd: string }): Promise<void> {
    console.log("MemStorage: saveConstitutionRender not implemented");
  }

  async getConstitutionRenders(leagueId: string): Promise<any[]> {
    return [];
  }

  async getLeagueSettingsOverrides(leagueId: string): Promise<any | null> {
    return null;
  }

  async saveLeagueSettingsOverrides(params: { leagueId: string; overrides: any; updatedBy?: string }): Promise<void> {
    console.log("MemStorage: saveLeagueSettingsOverrides not implemented");
  }

  // Migration methods implementation (no-op for in-memory storage)
  async runRawSQL(query: string): Promise<any> {
    console.log("MemStorage: Ignoring SQL query:", query);
    return { rowCount: 0 };
  }

  async ensurePgVectorExtension(): Promise<void> {
    console.log("MemStorage: pgvector extension not needed for in-memory storage");
  }
}

// Initialize storage lazily after environment validation
let _storage: IStorage | undefined;

export function getStorage(): IStorage {
  if (!_storage) {
    const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    _storage = databaseUrl ? new DatabaseStorage() : new MemStorage();
  }
  return _storage;
}

// Create a proxy to delay initialization until first access
export const storage = new Proxy({} as IStorage, {
  get(target, prop) {
    const actualStorage = getStorage();
    const value = (actualStorage as any)[prop];
    return typeof value === 'function' ? value.bind(actualStorage) : value;
  }
});
