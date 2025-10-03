import { storage } from "../storage";
import { SleeperService } from "./sleeper";
import type { Highlight, InsertHighlight } from "@shared/schema";

interface HighlightSummary {
  total: number;
  types: {
    comeback: number;
    blowout: number;
    bench_tragedy: number;
    top_scorer: number;
  };
}

export class HighlightsService {
  private sleeper: SleeperService;

  constructor() {
    this.sleeper = new SleeperService();
  }

  async computeWeekHighlights({ leagueId, week }: { leagueId: string; week: number }): Promise<HighlightSummary> {
    try {
      const league = await storage.getLeague(leagueId);
      if (!league || !league.sleeperLeagueId) {
        throw new Error("League not found or missing Sleeper league ID");
      }

      const matchups = await this.sleeper.getMatchups(league.sleeperLeagueId, week);
      const rosters = await this.sleeper.getRosters(league.sleeperLeagueId);

      const highlights: InsertHighlight[] = [];

      const matchupMap = new Map<number, typeof matchups>();
      matchups.forEach((m) => {
        if (!matchupMap.has(m.matchup_id)) {
          matchupMap.set(m.matchup_id, []);
        }
        matchupMap.get(m.matchup_id)?.push(m);
      });

      let topScore = 0;
      let topScorer: typeof matchups[0] | null = null;

      for (const [matchupId, teams] of Array.from(matchupMap.entries())) {
        if (teams.length !== 2) continue;

        const [team1, team2] = teams;
        const diff = Math.abs(team1.points - team2.points);

        if (diff > 30) {
          const winner = team1.points > team2.points ? team1 : team2;
          const loser = team1.points > team2.points ? team2 : team1;
          highlights.push({
            leagueId,
            week,
            kind: "blowout",
            payload: {
              winnerRosterId: winner.roster_id,
              loserRosterId: loser.roster_id,
              scoreDiff: diff,
              winnerPoints: winner.points,
              loserPoints: loser.points,
            },
          });
        }

        if (team1.points > topScore) {
          topScore = team1.points;
          topScorer = team1;
        }
        if (team2.points > topScore) {
          topScore = team2.points;
          topScorer = team2;
        }
      }

      if (topScorer) {
        highlights.push({
          leagueId,
          week,
          kind: "top_scorer",
          payload: {
            rosterId: topScorer.roster_id,
            points: topScorer.points,
          },
        });
      }

      for (const matchup of matchups) {
        const roster = rosters.find((r) => r.roster_id === matchup.roster_id);
        if (!roster) continue;

        const startingPoints = matchup.points;
        const benchPlayers = roster.players.filter(
          (p) => !roster.starters.includes(p)
        );
        let benchPoints = 0;

        benchPlayers.forEach((playerId) => {
          const pts = matchup.players_points[playerId] || 0;
          benchPoints += pts;
        });

        if (benchPoints > startingPoints) {
          highlights.push({
            leagueId,
            week,
            kind: "bench_tragedy",
            payload: {
              rosterId: matchup.roster_id,
              benchPoints,
              startingPoints,
            },
          });
        }
      }

      await storage.deleteHighlightsByLeagueWeek(leagueId, week);

      for (const highlight of highlights) {
        await storage.createHighlight(highlight);
      }

      const summary: HighlightSummary = {
        total: highlights.length,
        types: {
          comeback: highlights.filter((h) => h.kind === "comeback").length,
          blowout: highlights.filter((h) => h.kind === "blowout").length,
          bench_tragedy: highlights.filter((h) => h.kind === "bench_tragedy")
            .length,
          top_scorer: highlights.filter((h) => h.kind === "top_scorer").length,
        },
      };

      return summary;
    } catch (error) {
      console.error("Error computing week highlights:", error);
      throw error;
    }
  }
}
