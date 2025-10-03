import { IStorage } from "../storage";
import { InsertModAction } from "@shared/schema";
import { RAGService } from "./rag";

interface FreezeThreadParams {
  leagueId: string;
  channelId: string;
  minutes: number;
  reason?: string;
}

interface ClarifyRuleParams {
  leagueId: string;
  channelId: string;
  ruleQuery: string;
}

export class ModerationService {
  private ragService: RAGService;

  constructor(private storage: IStorage) {
    this.ragService = new RAGService(storage);
  }

  async freezeThread(params: FreezeThreadParams): Promise<string> {
    try {
      const { leagueId, channelId, minutes, reason } = params;

      const modAction: InsertModAction = {
        leagueId,
        actor: "system",
        action: "freeze_thread",
        targetChannelId: channelId,
        targetMessageId: null,
        reason: reason || `Thread frozen for ${minutes} minutes`,
      };

      const actionId = await this.storage.createModAction(modAction);

      console.log(`Thread ${channelId} frozen for ${minutes} minutes (action: ${actionId})`);

      return actionId;
    } catch (error) {
      console.error("Failed to freeze thread:", error);
      throw error;
    }
  }

  async clarifyRule(params: ClarifyRuleParams): Promise<string> {
    try {
      const { leagueId, channelId, ruleQuery } = params;

      const searchResults = await this.ragService.searchSimilarRules(
        leagueId,
        ruleQuery,
        3,
        0.5
      );

      const modAction: InsertModAction = {
        leagueId,
        actor: "system",
        action: "clarify_rule",
        targetChannelId: channelId,
        targetMessageId: null,
        reason: `Rule clarification requested: "${ruleQuery}"`,
      };

      const actionId = await this.storage.createModAction(modAction);

      const mockMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log(`Rule clarification for "${ruleQuery}" - Found ${searchResults.length} results (action: ${actionId})`);

      return mockMessageId;
    } catch (error) {
      console.error("Failed to clarify rule:", error);
      throw error;
    }
  }
}
