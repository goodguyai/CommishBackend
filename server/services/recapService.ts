import { storage } from "../storage";
import { sleeperService } from "./sleeper";
import type { SleeperMatchup, SleeperRoster } from "./sleeper";

interface RecapResult {
  text: string;
  week: number;
}

export class RecapService {
  async generateWeeklyRecap(leagueId: string, week?: number): Promise<RecapResult> {
    const league = await storage.getLeague(leagueId);
    if (!league) {
      throw new Error(`League ${leagueId} not found`);
    }

    if (!league.sleeperLeagueId) {
      throw new Error(`League ${leagueId} has no Sleeper league ID configured`);
    }

    const currentWeek = await sleeperService.getCurrentWeek();
    const weekToUse = week ?? Math.max(1, currentWeek - 1);

    if (week === undefined) {
      console.log(`[RecapService] Current week: ${currentWeek}, using last completed week: ${weekToUse}`);
    }

    const [matchups, rosters] = await Promise.all([
      sleeperService.getMatchups(league.sleeperLeagueId, weekToUse),
      sleeperService.getRosters(league.sleeperLeagueId),
    ]);

    if (!matchups || matchups.length === 0) {
      console.error(`[RecapService] No matchup data for league ${leagueId} week ${weekToUse}`);
      throw new Error("Week not completed");
    }

    const members = await storage.getLeagueMembers(leagueId);

    const rosterMap = new Map<number, SleeperRoster>();
    rosters.forEach(r => rosterMap.set(r.roster_id, r));

    const getTeamName = (rosterId: number): string => {
      const roster = rosterMap.get(rosterId);
      if (!roster) return `Team ${rosterId}`;

      const member = members.find(m => m.sleeperOwnerId === roster.owner_id);
      if (member?.sleeperTeamName) return member.sleeperTeamName;
      if (roster.metadata?.team_name) return roster.metadata.team_name;
      return `Team ${rosterId}`;
    };

    type TopScorer = { team: string; score: number };
    type ClosestMatchup = { team1: string; team2: string; diff: number };
    type BiggestBlowout = { winner: string; loser: string; diff: number };
    
    let topScorer: TopScorer | null = null;
    let closestMatchup: ClosestMatchup | null = null;
    let biggestBlowout: BiggestBlowout | null = null;

    const matchupGroups = new Map<number, SleeperMatchup[]>();
    matchups.forEach(m => {
      if (!matchupGroups.has(m.matchup_id)) {
        matchupGroups.set(m.matchup_id, []);
      }
      matchupGroups.get(m.matchup_id)!.push(m);

      if (!topScorer || m.points > topScorer.score) {
        topScorer = {
          team: getTeamName(m.roster_id),
          score: m.points
        };
      }
    });

    for (const [matchupId, teams] of Array.from(matchupGroups.entries())) {
      if (teams.length === 2) {
        const team1 = teams[0];
        const team2 = teams[1];
        const score1 = team1.points || 0;
        const score2 = team2.points || 0;
        const diff = Math.abs(score1 - score2);

        if (!closestMatchup || diff < closestMatchup.diff) {
          closestMatchup = {
            team1: getTeamName(team1.roster_id),
            team2: getTeamName(team2.roster_id),
            diff
          };
        }

        if (!biggestBlowout || diff > biggestBlowout.diff) {
          const winner = score1 > score2 ? team1 : team2;
          const loser = score1 > score2 ? team2 : team1;
          biggestBlowout = {
            winner: getTeamName(winner.roster_id),
            loser: getTeamName(loser.roster_id),
            diff
          };
        }
      }
    }

    const lines = [`📊 Week ${weekToUse} Recap\n`];

    if (topScorer !== null) {
      const scorer = topScorer as TopScorer;
      lines.push(`🏆 Top Scorer: ${scorer.team} (${scorer.score.toFixed(1)} pts)`);
    }

    if (closestMatchup !== null) {
      const { team1, team2, diff } = closestMatchup;
      lines.push(`⚔️ Closest Matchup: ${team1} vs ${team2} (${diff.toFixed(1)} pts)`);
    }

    if (biggestBlowout !== null) {
      const { winner, loser, diff } = biggestBlowout;
      lines.push(`💥 Biggest Blowout: ${winner} demolished ${loser} (${diff.toFixed(1)} pts)`);
    }

    return {
      text: lines.join('\n'),
      week: weekToUse
    };
  }
}

export const recapService = new RecapService();
