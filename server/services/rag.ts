import OpenAI from "openai";
import { IStorage } from "../storage";
import { InsertRule, InsertDocument } from "@shared/schema";
import { generateContentHash } from "../lib/crypto";

export interface EmbeddingResult {
  ruleId: string;
  similarity: number;
  rule: {
    text: string;
    ruleKey: string;
    citations: any[];
    sectionId: string;
    version?: string;
    documentId?: string;
  };
  passages?: string[]; // Extracted relevant passages from the rule text
  sourceDoc?: string; // Phase 6: Source document title
  sourceVersion?: string; // Phase 6: Source document version
  confidence?: number; // Phase 6: Search confidence (0-1)
}

export class RAGService {
  private embeddingClient: OpenAI;
  private readonly embeddingModel: string;
  private readonly embeddingDimensions: number;

  constructor(private storage: IStorage) {
    // Use OpenAI for embeddings with proper env vars
    this.embeddingClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "default_key",
    });
    this.embeddingModel = process.env.EMBED_MODEL || "text-embedding-3-small";
    this.embeddingDimensions = parseInt(process.env.EMBED_DIM || "1536");
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.embeddingClient.embeddings.create({
        model: this.embeddingModel,
        input: text.trim(),
        dimensions: this.embeddingDimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      
      // Graceful degradation: return zero vector for failed embeddings
      console.warn("Using zero vector fallback for embedding generation failure");
      return new Array(this.embeddingDimensions).fill(0);
    }
  }

  async indexDocument(
    leagueId: string,
    content: string,
    version: string,
    type: "ORIGINAL" | "NORMALIZED" = "NORMALIZED",
    title?: string
  ): Promise<{ documentId: string; rulesIndexed: number }> {
    try {
      // Store the document
      const document: InsertDocument = {
        leagueId,
        type,
        content,
        version,
      };

      const documentId = await this.storage.createDocument(document);

      // Parse the document into rules (simplified YAML/JSON parsing)
      const rules = this.parseConstitution(content, documentId, leagueId, version);
      
      let indexedCount = 0;
      
      for (const rule of rules) {
        try {
          // Create rule record
          const ruleId = await this.storage.createRule(rule);
          
          // Generate content hash scoped to model for caching
          const contentHash = generateContentHash(rule.text, this.embeddingModel, this.embeddingDimensions);
          
          // Check if embedding already exists (cache lookup)
          const existingEmbedding = await this.storage.getEmbeddingByContentHash(contentHash);
          
          let embedding: number[];
          if (existingEmbedding) {
            // Use cached embedding vector, avoid API call
            console.log(`Using cached embedding for rule ${rule.ruleKey}`);
            embedding = existingEmbedding.embedding;
            
            // Still need to create embedding row for this rule to enable search
            await this.storage.createEmbedding(ruleId, contentHash, embedding, "openai", this.embeddingModel);
          } else {
            // Generate new embedding
            embedding = await this.generateEmbedding(rule.text);
            
            // Only store if embedding generation succeeded (not zero vector)
            if (!embedding.every(val => val === 0)) {
              await this.storage.createEmbedding(ruleId, contentHash, embedding, "openai", this.embeddingModel);
            } else {
              console.warn(`Skipping embedding storage for rule ${rule.ruleKey} due to API failure`);
              continue; // Skip indexing this rule
            }
          }
          
          indexedCount++;
        } catch (error) {
          console.error(`Failed to index rule ${rule.ruleKey}:`, error);
          // Continue with next rule instead of failing entire indexing
        }
      }

      console.log(`Indexed ${indexedCount} rules from document ${documentId}`);
      
      return { documentId, rulesIndexed: indexedCount };
    } catch (error) {
      console.error("Document indexing failed:", error);
      throw error;
    }
  }

  private parseConstitution(
    content: string,
    documentId: string,
    leagueId: string,
    version: string
  ): InsertRule[] {
    const rules: InsertRule[] = [];
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      
      if (parsed.rules && Array.isArray(parsed.rules)) {
        parsed.rules.forEach((rule: any, index: number) => {
          rules.push({
            leagueId,
            documentId,
            version,
            sectionId: rule.section || `section_${Math.floor(index / 10)}`,
            ruleKey: rule.key || `rule_${index}`,
            text: rule.text || rule.description || JSON.stringify(rule),
            citations: rule.citations || [],
            tags: rule.tags || [],
          });
        });
      }
    } catch (jsonError) {
      // Fallback: treat as plain text and create sections
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 10);
      
      paragraphs.forEach((paragraph, index) => {
        const lines = paragraph.trim().split('\n');
        const title = lines[0];
        const text = lines.slice(1).join(' ').trim() || title;
        
        rules.push({
          leagueId,
          documentId,
          version,
          sectionId: `section_${Math.floor(index / 5)}`,
          ruleKey: title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50),
          text,
          citations: [],
          tags: [],
        });
      });
    }

    return rules;
  }

  /**
   * Extract relevant passages from rule text based on query terms.
   * Returns sentences containing query terms with surrounding context.
   */
  private extractPassages(text: string, query: string, maxPassages: number = 2): string[] {
    // Normalize query to individual terms (keep 2+ char terms for abbreviations like QB, IR, TE)
    const queryTerms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length >= 2); // Keep 2-char terms (QB, IR, etc.)
    
    if (queryTerms.length === 0) {
      // No meaningful terms, return beginning of text
      return [text.substring(0, 200) + (text.length > 200 ? '...' : '')];
    }

    // Better sentence splitting that preserves punctuation and handles lists
    // Split on sentence boundaries but keep the punctuation
    const sentencePattern = /([^.!?]+[.!?]+)/g;
    let sentences: string[] = [];
    let match;
    
    while ((match = sentencePattern.exec(text)) !== null) {
      const sentence = match[1].trim();
      if (sentence.length > 0) {
        sentences.push(sentence);
      }
    }
    
    // Handle remaining text (no ending punctuation)
    const lastIndex = text.lastIndexOf(sentences[sentences.length - 1] || '');
    if (lastIndex >= 0) {
      const remainder = text.substring(lastIndex + (sentences[sentences.length - 1]?.length || 0)).trim();
      if (remainder.length > 0) {
        sentences.push(remainder);
      }
    }
    
    // If no sentences found, treat entire text as one sentence
    if (sentences.length === 0) {
      sentences = [text];
    }
    
    // Score each sentence based on query term matches
    const scoredSentences = sentences.map((sentence, index) => {
      const lowerSentence = sentence.toLowerCase();
      let score = 0;
      
      // Count matching query terms
      for (const term of queryTerms) {
        if (lowerSentence.includes(term)) {
          score += 2; // Base score for term match
          // Bonus for multiple occurrences
          const occurrences = (lowerSentence.match(new RegExp(term, 'g')) || []).length;
          score += (occurrences - 1) * 0.5;
        }
      }
      
      return { sentence: sentence.trim(), index, score };
    }).filter(s => s.score > 0); // Only keep sentences with matches

    // Sort by score descending
    scoredSentences.sort((a, b) => b.score - a.score);

    // Extract top passages with context
    const passages: string[] = [];
    const usedIndices = new Set<number>();

    for (const scored of scoredSentences.slice(0, maxPassages * 2)) { // Check more candidates
      if (usedIndices.has(scored.index)) continue;
      
      // Include surrounding context (1 sentence before and after if available)
      const contextStart = Math.max(0, scored.index - 1);
      const contextEnd = Math.min(sentences.length - 1, scored.index + 1);
      
      const passageSentences = [];
      for (let i = contextStart; i <= contextEnd; i++) {
        if (!usedIndices.has(i)) {
          passageSentences.push(sentences[i].trim());
          usedIndices.add(i);
        }
      }
      
      let passage = passageSentences.join(' '); // Use space instead of '. ' to preserve original punctuation
      if (passage.length > 300) {
        passage = passage.substring(0, 297) + '...';
      }
      
      passages.push(passage);
      
      if (passages.length >= maxPassages) break;
    }

    // If no passages found (shouldn't happen but handle gracefully)
    if (passages.length === 0) {
      return [text.substring(0, 200) + (text.length > 200 ? '...' : '')];
    }

    return passages;
  }

  async searchSimilarRules(
    leagueId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7,
    includePassages: boolean = true
  ): Promise<EmbeddingResult[]> {
    try {
      // Generate embedding for the query with graceful fallback
      const queryEmbedding = await this.generateEmbedding(query);
      
      // If embedding generation failed (returned zero vector), return empty results
      if (queryEmbedding.every(val => val === 0)) {
        console.warn("Query embedding failed, returning empty results");
        return [];
      }
      
      // Search for similar embeddings using pgvector
      const results = await this.storage.searchSimilarEmbeddings(
        leagueId,
        queryEmbedding,
        limit,
        threshold
      );

      // Enhance results with passage extraction
      if (includePassages) {
        for (const result of results) {
          result.passages = this.extractPassages(result.rule.text, query);
        }
      }

      return results;
    } catch (error) {
      console.error("RAG search failed:", error);
      // Graceful degradation: return empty results instead of throwing
      console.warn("RAG search failed, returning empty results");
      return [];
    }
  }

  async reindexLeague(leagueId: string): Promise<{ rulesIndexed: number; embeddingsGenerated: number }> {
    try {
      // Get all documents for the league
      const documents = await this.storage.getDocumentsByLeague(leagueId);
      
      // Clear existing rules and embeddings
      await this.storage.clearLeagueRules(leagueId);
      
      let totalRules = 0;
      let totalEmbeddings = 0;
      
      for (const document of documents) {
        if (document.content) {
          const result = await this.indexDocument(
            leagueId,
            document.content,
            document.version,
            document.type as "ORIGINAL" | "NORMALIZED"
          );
          
          totalRules += result.rulesIndexed;
          totalEmbeddings += result.rulesIndexed; // 1:1 mapping
        }
      }

      return {
        rulesIndexed: totalRules,
        embeddingsGenerated: totalEmbeddings,
      };
    } catch (error) {
      console.error("League reindexing failed:", error);
      throw error;
    }
  }

  async getIndexStats(leagueId: string): Promise<{
    documentsCount: number;
    rulesCount: number;
    embeddingsCount: number;
    lastUpdated: Date | null;
  }> {
    try {
      return await this.storage.getLeagueIndexStats(leagueId);
    } catch (error) {
      console.error("Failed to get index stats:", error);
      return {
        documentsCount: 0,
        rulesCount: 0,
        embeddingsCount: 0,
        lastUpdated: null,
      };
    }
  }
}
