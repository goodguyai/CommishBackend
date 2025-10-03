import { IStorage } from "../storage";
import { InsertTradeEvaluation } from "@shared/schema";

interface EvaluateTradeParams {
  leagueId: string;
  tradeId: string;
  proposal: {
    team1: {
      gives: string[];
      receives: string[];
    };
    team2: {
      gives: string[];
      receives: string[];
    };
  };
}

interface EvaluateTradeResult {
  score: number;
  rationale: string;
  inputs: any;
}

export class TradeFairnessService {
  constructor(private storage: IStorage) {}

  async evaluateTrade(params: EvaluateTradeParams): Promise<EvaluateTradeResult> {
    try {
      const { leagueId, tradeId, proposal } = params;

      const team1Players = proposal.team1.gives.length;
      const team2Players = proposal.team2.gives.length;
      const team1Receives = proposal.team1.receives.length;
      const team2Receives = proposal.team2.receives.length;

      const playerCountDiff = Math.abs(team1Players - team2Players);
      let fairnessScore = 100;

      if (playerCountDiff === 0) {
        fairnessScore = 85;
      } else if (playerCountDiff === 1) {
        fairnessScore = 70;
      } else if (playerCountDiff === 2) {
        fairnessScore = 55;
      } else {
        fairnessScore = 40;
      }

      if (team1Players > 0 && team2Players > 0) {
        fairnessScore += 10;
      }

      fairnessScore = Math.min(100, Math.max(0, fairnessScore));

      let rationale = `Trade involves ${team1Players} player(s) from Team 1 and ${team2Players} player(s) from Team 2. `;
      
      if (fairnessScore >= 80) {
        rationale += "This trade appears balanced in terms of player count.";
      } else if (fairnessScore >= 60) {
        rationale += "This trade shows some imbalance but could be reasonable depending on player values.";
      } else {
        rationale += "This trade shows significant imbalance and may warrant closer review.";
      }

      const inputs = {
        team1: {
          playersGiven: team1Players,
          playersReceived: team1Receives,
        },
        team2: {
          playersGiven: team2Players,
          playersReceived: team2Receives,
        },
        playerCountDifference: playerCountDiff,
      };

      const evaluation: InsertTradeEvaluation = {
        leagueId,
        tradeId,
        fairnessScore: fairnessScore.toFixed(2),
        rationale,
        inputs,
      };

      await this.storage.createTradeEvaluation(evaluation);

      return {
        score: fairnessScore,
        rationale,
        inputs,
      };
    } catch (error) {
      console.error("Failed to evaluate trade:", error);
      throw error;
    }
  }
}
