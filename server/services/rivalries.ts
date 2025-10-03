import { storage } from "../storage";
import { SleeperService } from "./sleeper";
import type { Rivalry, InsertRivalry } from "@shared/schema";

interface RivalryCard {
  teamA: string;
  teamB: string;
  aWins: number;
  bWins: number;
  lastMeetingWeek: number | null;
  totalGames: number;
}

export class RivalriesService {
  private sleeper: SleeperService;

  constructor() {
    this.sleeper = new SleeperService();
  }

  async updateHeadToHead({ leagueId, week }: { leagueId: string; week: number }): Promise<void> {
    try {
      const league = await storage.getLeague(leagueId);
      if (!league || !league.sleeperLeagueId) {
        throw new Error("League not found or missing Sleeper league ID");
      }

      const matchups = await this.sleeper.getMatchups(league.sleeperLeagueId, week);
      const rosters = await this.sleeper.getRosters(league.sleeperLeagueId);

      const matchupMap = new Map<number, typeof matchups>();
      matchups.forEach((m) => {
        if (!matchupMap.has(m.matchup_id)) {
          matchupMap.set(m.matchup_id, []);
        }
        matchupMap.get(m.matchup_id)?.push(m);
      });

      for (const [matchupId, teams] of Array.from(matchupMap.entries())) {
        if (teams.length !== 2) continue;

        const [team1, team2] = teams;
        const roster1 = rosters.find((r) => r.roster_id === team1.roster_id);
        const roster2 = rosters.find((r) => r.roster_id === team2.roster_id);

        if (!roster1 || !roster2) continue;

        const teamAId = roster1.owner_id;
        const teamBId = roster2.owner_id;
        const teamAWon = team1.points > team2.points;

        const [canonTeamA, canonTeamB] = [teamAId, teamBId].sort();
        
        const canonAWon = (teamAWon && canonTeamA === teamAId) || (!teamAWon && canonTeamA === teamBId);

        const existing = await storage.getRivalry(leagueId, canonTeamA, canonTeamB);

        if (existing) {
          await storage.createOrUpdateRivalry({
            leagueId,
            teamA: canonTeamA,
            teamB: canonTeamB,
            aWins: canonAWon ? existing.aWins + 1 : existing.aWins,
            bWins: canonAWon ? existing.bWins : existing.bWins + 1,
            lastMeetingWeek: week,
            meta: existing.meta as any,
          });
        } else {
          await storage.createOrUpdateRivalry({
            leagueId,
            teamA: canonTeamA,
            teamB: canonTeamB,
            aWins: canonAWon ? 1 : 0,
            bWins: canonAWon ? 0 : 1,
            lastMeetingWeek: week,
            meta: null,
          });
        }
      }
    } catch (error) {
      console.error("Error updating head-to-head rivalries:", error);
      throw error;
    }
  }

  async getRivalryCard({ leagueId, teamA, teamB }: { leagueId: string; teamA: string; teamB: string }): Promise<RivalryCard | null> {
    try {
      const [canonTeamA, canonTeamB] = [teamA, teamB].sort();
      
      const rivalry = await storage.getRivalry(leagueId, canonTeamA, canonTeamB);

      if (!rivalry) {
        return null;
      }

      const swapped = canonTeamA !== teamA;

      return {
        teamA: swapped ? rivalry.teamB : rivalry.teamA,
        teamB: swapped ? rivalry.teamA : rivalry.teamB,
        aWins: swapped ? rivalry.bWins : rivalry.aWins,
        bWins: swapped ? rivalry.aWins : rivalry.bWins,
        lastMeetingWeek: rivalry.lastMeetingWeek,
        totalGames: rivalry.aWins + rivalry.bWins,
      };
    } catch (error) {
      console.error("Error fetching rivalry card:", error);
      throw error;
    }
  }
}
