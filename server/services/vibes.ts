import { IStorage } from "../storage";
import { InsertSentimentLog } from "@shared/schema";

interface ScoreMessageParams {
  leagueId: string;
  channelId: string;
  messageId: string;
  authorId: string;
  text: string;
}

interface ScoreMessageResult {
  toxicity: number;
  sentiment: number;
  summary: string;
}

export class VibesService {
  private readonly toxicKeywords = [
    "fuck", "shit", "damn", "hell", "stupid", "idiot", "loser", "trash",
    "garbage", "suck", "awful", "terrible", "hate", "dumb", "worthless"
  ];

  private readonly positiveWords = [
    "good", "great", "awesome", "excellent", "love", "amazing", "best",
    "fantastic", "wonderful", "nice", "happy", "brilliant", "perfect",
    "win", "winning", "champion", "smart", "clever", "talented"
  ];

  private readonly negativeWords = [
    "bad", "terrible", "awful", "worst", "horrible", "disgusting",
    "disappointing", "poor", "weak", "failure", "lose", "losing",
    "sad", "angry", "frustrated", "annoyed", "upset"
  ];

  constructor(private storage: IStorage) {}

  async scoreMessage(params: ScoreMessageParams): Promise<ScoreMessageResult> {
    try {
      const { leagueId, channelId, messageId, authorId, text } = params;

      const lowerText = text.toLowerCase();
      const words = lowerText.split(/\s+/);

      const toxicityScore = this.calculateToxicity(lowerText);
      const sentimentScore = this.calculateSentiment(words);
      const summary = this.createSummary(text);

      const sentimentLog: InsertSentimentLog = {
        leagueId,
        channelId,
        messageId,
        authorId,
        summary,
        toxicityScore: toxicityScore.toFixed(3),
        sentimentScore: sentimentScore.toFixed(3),
      };

      await this.storage.createSentimentLog(sentimentLog);

      return {
        toxicity: toxicityScore,
        sentiment: sentimentScore,
        summary,
      };
    } catch (error) {
      console.error("Failed to score message:", error);
      throw error;
    }
  }

  private calculateToxicity(text: string): number {
    let toxicCount = 0;
    
    for (const keyword of this.toxicKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = text.match(regex);
      toxicCount += matches ? matches.length : 0;
    }

    const toxicityRaw = Math.min(toxicCount * 0.3, 1.0);
    return Math.round(toxicityRaw * 1000) / 1000;
  }

  private calculateSentiment(words: string[]): number {
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (this.positiveWords.includes(word)) {
        positiveCount++;
      }
      if (this.negativeWords.includes(word)) {
        negativeCount++;
      }
    }

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return 0;
    }

    const sentimentRaw = (positiveCount - negativeCount) / totalSentimentWords;
    return Math.max(-1, Math.min(1, Math.round(sentimentRaw * 1000) / 1000));
  }

  private createSummary(text: string): string {
    const maxLength = 200;
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + "...";
  }
}
