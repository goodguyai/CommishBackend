import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, sql, cosineDistance } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User, InsertUser, Account, InsertAccount, League, InsertLeague,
  Member, InsertMember, Document, InsertDocument, Rule, InsertRule,
  Fact, InsertFact, Deadline, InsertDeadline, Event, InsertEvent,
  DiscordInteraction
} from "@shared/schema";
import { EmbeddingResult } from "./services/rag";

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
  getLeaguesByAccount(accountId: string): Promise<League[]>;
  getLeagueByGuildId(guildId: string): Promise<League | undefined>;
  getLeagueBySleeperLeagueId(sleeperLeagueId: string): Promise<League | undefined>;
  createLeague(league: InsertLeague): Promise<string>;
  updateLeague(id: string, updates: Partial<League>): Promise<void>;
  deleteLeague(id: string): Promise<void>;

  // Member methods
  getMember(leagueId: string, discordUserId: string): Promise<Member | undefined>;
  getLeagueMembers(leagueId: string): Promise<Member[]>;
  createMember(member: InsertMember): Promise<string>;
  updateMemberRole(leagueId: string, discordUserId: string, role: "COMMISH" | "MANAGER"): Promise<void>;
  deleteMember(leagueId: string, discordUserId: string): Promise<void>;

  // Document methods
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByLeague(leagueId: string): Promise<Document[]>;
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

  // Migration methods
  runRawSQL(query: string): Promise<any>;
  ensurePgVectorExtension(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    const connection = neon(databaseUrl);
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

  async getLeaguesByAccount(accountId: string): Promise<League[]> {
    return this.db.select().from(schema.leagues).where(eq(schema.leagues.accountId, accountId));
  }

  async getLeagueByGuildId(guildId: string): Promise<League | undefined> {
    const leagues = await this.db.select().from(schema.leagues).where(eq(schema.leagues.guildId, guildId));
    return leagues[0];
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
        r.section_id
      FROM ${schema.embeddings} e
      JOIN ${schema.rules} r ON e.rule_id = r.id
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
      },
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
      discordUserId: account.discordUserId ?? null
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
  async getLeaguesByAccount(accountId: string): Promise<League[]> { 
    return Array.from(this.leagues.values()).filter(l => l.accountId === accountId);
  }
  async getLeagueByGuildId(guildId: string): Promise<League | undefined> {
    return Array.from(this.leagues.values()).find(l => l.guildId === guildId);
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
      featureFlags: league.featureFlags ?? { qa: true, deadlines: true, digest: true, trade_helper: false },
      modelPrefs: league.modelPrefs ?? { maxTokens: 1000, provider: "deepseek" }
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
  async createMember(member: InsertMember): Promise<string> {
    const id = this.generateId();
    const newMember: Member = { ...member, id, createdAt: new Date() };
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
  async createDocument(document: InsertDocument): Promise<string> {
    const id = this.generateId();
    const newDocument: Document = { 
      ...document, 
      id, 
      createdAt: new Date(),
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

  // Migration methods implementation (no-op for in-memory storage)
  async runRawSQL(query: string): Promise<any> {
    console.log("MemStorage: Ignoring SQL query:", query);
    return { rowCount: 0 };
  }

  async ensurePgVectorExtension(): Promise<void> {
    console.log("MemStorage: pgvector extension not needed for in-memory storage");
  }
}

// Use DatabaseStorage if DATABASE_URL is available, otherwise MemStorage
export const storage = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
