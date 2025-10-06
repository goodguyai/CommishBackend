import { storage } from '../storage';
import type { SleeperRoster, SleeperMatchup, SleeperTransaction } from '@shared/schema';

interface MatchupPair {
  team1: { rosterId: string; teamName: string; score: number };
  team2: { rosterId: string; teamName: string; score: number };
  margin: number;
}

export class ReportsService {
  /**
   * Generate a weekly recap report with top performances and luck analysis
   */
  async generateWeeklyRecap(leagueId: string, week: number): Promise<string> {
    try {
      console.log(`[Reports] Generating weekly recap for league ${leagueId}, week ${week}`);
      
      const [matchups, rosters] = await Promise.all([
        storage.getSleeperMatchups(leagueId, week),
        storage.getSleeperRosters(leagueId)
      ]);

      if (!matchups || matchups.length === 0) {
        return `# 📊 Week ${week} Recap\n\n_No matchup data available for this week._`;
      }

      if (!rosters || rosters.length === 0) {
        return `# 📊 Week ${week} Recap\n\n_No roster data available._`;
      }

      // Build roster map for team names
      const rosterMap = new Map(
        rosters.map(r => [
          r.sleeperRosterId,
          {
            teamName: r.metadata?.team_name || `Team ${r.sleeperRosterId}`,
            ownerId: r.ownerId
          }
        ])
      );

      // Parse matchups and create pairs
      const matchupPairs: MatchupPair[] = [];
      const allScores: number[] = [];
      const matchupGroups = new Map<string, SleeperMatchup[]>();

      matchups.forEach(m => {
        const rawMatchup = (m.raw || {}) as any;
        const matchupId = rawMatchup.matchup_id || m.matchupId;
        const rosterId = rawMatchup.roster_id || m.rosterIdHome || m.rosterIdAway;
        const points = parseFloat(rawMatchup.points || m.scoreHome || m.scoreAway || '0');
        
        if (!matchupGroups.has(matchupId)) {
          matchupGroups.set(matchupId, []);
        }
        matchupGroups.get(matchupId)!.push(m);
        allScores.push(points);
      });

      // Create matchup pairs
      matchupGroups.forEach((teams, matchupId) => {
        if (teams.length === 2) {
          const team1Raw = (teams[0].raw || {}) as any;
          const team2Raw = (teams[1].raw || {}) as any;
          
          // Use ONLY roster_id from Sleeper's raw data - don't fall back to incorrect fields
          const team1RosterId = team1Raw.roster_id;
          const team2RosterId = team2Raw.roster_id;
          
          // Skip if we don't have valid roster IDs
          if (!team1RosterId || !team2RosterId || team1RosterId === team2RosterId) {
            console.warn(`[Reports] Skipping invalid matchup pair: ${team1RosterId} vs ${team2RosterId}`);
            return;
          }
          
          const team1Score = parseFloat(team1Raw.points || '0');
          const team2Score = parseFloat(team2Raw.points || '0');
          
          const team1Info = rosterMap.get(team1RosterId) || { teamName: `Team ${team1RosterId}`, ownerId: null };
          const team2Info = rosterMap.get(team2RosterId) || { teamName: `Team ${team2RosterId}`, ownerId: null };

          matchupPairs.push({
            team1: { rosterId: team1RosterId, teamName: team1Info.teamName, score: team1Score },
            team2: { rosterId: team2RosterId, teamName: team2Info.teamName, score: team2Score },
            margin: Math.abs(team1Score - team2Score)
          });
        }
      });

      // Calculate stats
      const topScore = Math.max(...allScores);
      const medianScore = this.calculateMedian(allScores);
      
      // Find top scorer
      const topScorer = matchupPairs.flatMap(p => [
        { team: p.team1.teamName, score: p.team1.score },
        { team: p.team2.teamName, score: p.team2.score }
      ]).reduce((max, curr) => curr.score > max.score ? curr : max, { team: '', score: 0 });

      // Find narrowest win
      const narrowestWin = matchupPairs.reduce((min, curr) => 
        curr.margin < min.margin ? curr : min,
        { margin: Infinity, team1: { teamName: '', score: 0 }, team2: { teamName: '', score: 0 } }
      );

      // Calculate luck index (teams that won/lost vs median)
      const luckAnalysis = matchupPairs.map(p => {
        const winner = p.team1.score > p.team2.score ? p.team1 : p.team2;
        const loser = p.team1.score > p.team2.score ? p.team2 : p.team1;
        
        const winnerLuck = winner.score < medianScore ? '🍀 Lucky win' : '💪 Earned win';
        const loserLuck = loser.score > medianScore ? '😢 Unlucky loss' : '📉 Deserved loss';
        
        return { winner, loser, winnerLuck, loserLuck };
      }).slice(0, 3); // Top 3 luck stories

      // Generate standings
      const standings = [...rosters]
        .sort((a, b) => {
          const winsA = a.metadata?.settings?.wins || 0;
          const winsB = b.metadata?.settings?.wins || 0;
          if (winsA !== winsB) return winsB - winsA;
          const ptsA = a.metadata?.settings?.fpts || 0;
          const ptsB = b.metadata?.settings?.fpts || 0;
          return ptsB - ptsA;
        })
        .slice(0, 8)
        .map((r, i) => {
          const wins = r.metadata?.settings?.wins || 0;
          const losses = r.metadata?.settings?.losses || 0;
          const pts = Math.round((r.metadata?.settings?.fpts || 0) * 10) / 10;
          const teamName = r.metadata?.team_name || `Team ${r.sleeperRosterId}`;
          return `${i + 1}. **${teamName}**: ${wins}-${losses} (${pts} pts)`;
        })
        .join('\n');

      // Build report
      let report = `# 📊 Week ${week} Recap\n\n`;
      report += `## 🏆 Top Performances\n`;
      report += `**Highest Score:** ${topScorer.team} with **${topScorer.score.toFixed(1)} pts**\n\n`;
      report += `**Narrowest Win:** ${narrowestWin.team1.teamName} ${narrowestWin.team1.score.toFixed(1)} - ${narrowestWin.team2.score.toFixed(1)} ${narrowestWin.team2.teamName} _(margin: ${narrowestWin.margin.toFixed(1)})_\n\n`;
      
      report += `## 🎲 Luck Index\n`;
      report += `_Median score this week: ${medianScore.toFixed(1)} pts_\n\n`;
      luckAnalysis.forEach(l => {
        report += `• ${l.winner.teamName} (${l.winner.score.toFixed(1)}) ${l.winnerLuck}\n`;
      });
      
      report += `\n## 📈 Current Standings\n`;
      report += standings;

      return report;
    } catch (error) {
      console.error('[Reports] Error generating weekly recap:', error);
      return `# 📊 Week ${week} Recap\n\n_Error generating report. Please try again later._`;
    }
  }

  /**
   * Generate a waivers report showing FAAB spending patterns
   */
  async generateWaiversReport(leagueId: string, week: number): Promise<string> {
    try {
      console.log(`[Reports] Generating waivers report for league ${leagueId}, week ${week}`);
      
      const transactions = await storage.getSleeperTransactions(leagueId, { week, type: 'waiver' });
      const rosters = await storage.getSleeperRosters(leagueId);

      if (!transactions || transactions.length === 0) {
        return `# 💰 Week ${week} Waivers Report\n\n_No waiver activity this week._`;
      }

      if (!rosters || rosters.length === 0) {
        return `# 💰 Week ${week} Waivers Report\n\n_No roster data available. Cannot generate report._`;
      }

      // Build roster map
      const rosterMap = new Map(
        rosters.map(r => [
          r.ownerId || r.sleeperRosterId,
          r.metadata?.team_name || `Team ${r.sleeperRosterId}`
        ])
      );

      // Assume $100 FAAB budget (standard)
      const BUDGET = 100;
      
      // Sort by FAAB spent (descending)
      const sortedWaivers = transactions
        .map(tx => {
          const rawTx = (tx.raw || {}) as any;
          const faabSpent = tx.faabSpent || 0;
          const adds = tx.adds || [];
          const drops = tx.drops || [];
          const parties = tx.parties || [];
          const ownerId = parties[0] || rawTx.roster_ids?.[0];
          const teamName = rosterMap.get(ownerId) || `Team ${ownerId}`;
          
          // Determine annotation
          let annotation = '';
          const pctOfBudget = (faabSpent / BUDGET) * 100;
          if (pctOfBudget < 10) {
            annotation = '🎯 Bargain';
          } else if (pctOfBudget > 25) {
            annotation = '💸 Big Spend';
          }

          return {
            teamName,
            faabSpent,
            adds,
            drops,
            annotation,
            pctOfBudget
          };
        })
        .sort((a, b) => b.faabSpent - a.faabSpent);

      // Build report
      let report = `# 💰 Week ${week} Waivers Report\n\n`;
      
      if (sortedWaivers.length === 0) {
        report += `_No waiver claims processed this week._\n`;
      } else {
        report += `## Waiver Claims (Sorted by FAAB)\n\n`;
        sortedWaivers.forEach(w => {
          const addedPlayers = w.adds.map((a: any) => a.player_id || a).join(', ') || 'Unknown';
          const droppedPlayers = w.drops.map((d: any) => d.player_id || d).join(', ') || 'None';
          
          report += `**${w.teamName}** - $${w.faabSpent} FAAB ${w.annotation}\n`;
          report += `  • Added: ${addedPlayers}\n`;
          report += `  • Dropped: ${droppedPlayers}\n\n`;
        });

        // Summary stats
        const totalSpent = sortedWaivers.reduce((sum, w) => sum + w.faabSpent, 0);
        const avgSpent = totalSpent / sortedWaivers.length;
        const bigSpends = sortedWaivers.filter(w => w.pctOfBudget > 25).length;
        const bargains = sortedWaivers.filter(w => w.pctOfBudget < 10).length;

        report += `## 📊 Summary\n`;
        report += `• Total claims: ${sortedWaivers.length}\n`;
        report += `• Total FAAB spent: $${totalSpent}\n`;
        report += `• Average spent: $${avgSpent.toFixed(1)}\n`;
        report += `• Big spends (>25%): ${bigSpends}\n`;
        report += `• Bargains (<10%): ${bargains}\n`;
      }

      return report;
    } catch (error) {
      console.error('[Reports] Error generating waivers report:', error);
      return `# 💰 Week ${week} Waivers Report\n\n_Error generating report. Please try again later._`;
    }
  }

  /**
   * Generate a trades digest with fairness assessment
   */
  async generateTradesDigest(leagueId: string, week?: number): Promise<string> {
    try {
      console.log(`[Reports] Generating trades digest for league ${leagueId}`, week ? `week ${week}` : 'all weeks');
      
      const transactions = await storage.getSleeperTransactions(leagueId, week ? { week, type: 'trade' } : { type: 'trade' });
      const rosters = await storage.getSleeperRosters(leagueId);

      if (!transactions || transactions.length === 0) {
        return `# 🤝 Trades Digest${week ? ` - Week ${week}` : ''}\n\n_No trades processed${week ? ' this week' : ''}._`;
      }

      if (!rosters || rosters.length === 0) {
        return `# 🤝 Trades Digest${week ? ` - Week ${week}` : ''}\n\n_No roster data available. Cannot generate report._`;
      }

      // Build roster map
      const rosterMap = new Map(
        rosters.map(r => [
          r.ownerId || r.sleeperRosterId,
          r.metadata?.team_name || `Team ${r.sleeperRosterId}`
        ])
      );

      // Build report
      let report = `# 🤝 Trades Digest${week ? ` - Week ${week}` : ''}\n\n`;
      report += `## Trade Activity\n\n`;

      transactions.forEach((tx, idx) => {
        const rawTx = (tx.raw || {}) as any;
        const parties = tx.parties || rawTx.roster_ids || [];
        
        // Sleeper stores adds/drops as maps keyed by roster ID
        const addsMap = rawTx.adds || {};
        const dropsMap = rawTx.drops || {};

        // Get team names
        const team1 = rosterMap.get(parties[0]) || `Team ${parties[0]}`;
        const team2 = rosterMap.get(parties[1]) || `Team ${parties[1]}`;

        // Parse traded players - raw.adds[rosterId] returns array of player IDs
        const team1Gets = (addsMap[parties[0]] || []).join(', ') || 'None';
        const team2Gets = (addsMap[parties[1]] || []).join(', ') || 'None';

        // Simple fairness heuristic: balanced if similar number of players
        const team1Count = (addsMap[parties[0]] || []).length;
        const team2Count = (addsMap[parties[1]] || []).length;
        const fairness = Math.abs(team1Count - team2Count) <= 1 ? '⚖️ Balanced' : '🤔 One-sided?';

        report += `### Trade ${idx + 1} ${fairness}\n`;
        report += `**${team1}** ↔️ **${team2}**\n\n`;
        report += `• ${team1} receives: ${team1Gets}\n`;
        report += `• ${team2} receives: ${team2Gets}\n\n`;
      });

      report += `## 📊 Summary\n`;
      report += `• Total trades: ${transactions.length}\n`;
      
      const balanced = transactions.filter(tx => {
        const rawTx = (tx.raw || {}) as any;
        const parties = tx.parties || rawTx.roster_ids || [];
        const addsMap = rawTx.adds || {};
        const team1Count = (addsMap[parties[0]] || []).length;
        const team2Count = (addsMap[parties[1]] || []).length;
        return Math.abs(team1Count - team2Count) <= 1;
      }).length;

      report += `• Balanced trades: ${balanced}\n`;
      report += `• Potentially one-sided: ${transactions.length - balanced}\n`;

      return report;
    } catch (error) {
      console.error('[Reports] Error generating trades digest:', error);
      return `# 🤝 Trades Digest\n\n_Error generating report. Please try again later._`;
    }
  }

  /**
   * Generate a standings report with playoff implications
   */
  async generateStandingsReport(leagueId: string, season: string): Promise<string> {
    try {
      console.log(`[Reports] Generating standings report for league ${leagueId}, season ${season}`);
      
      const rosters = await storage.getSleeperRosters(leagueId);

      if (!rosters || rosters.length === 0) {
        return `# 🏆 ${season} Standings\n\n_No roster data available._`;
      }

      // Sort by wins, then by points for
      const sortedRosters = [...rosters].sort((a, b) => {
        const winsA = a.metadata?.settings?.wins || 0;
        const winsB = b.metadata?.settings?.wins || 0;
        if (winsA !== winsB) return winsB - winsA;
        
        const ptsA = a.metadata?.settings?.fpts || 0;
        const ptsB = b.metadata?.settings?.fpts || 0;
        return ptsB - ptsA;
      });

      // Calculate win streaks (simplified - based on recent record)
      const standings = sortedRosters.map((r, idx) => {
        const wins = r.metadata?.settings?.wins || 0;
        const losses = r.metadata?.settings?.losses || 0;
        const ptsFor = Math.round((r.metadata?.settings?.fpts || 0) * 10) / 10;
        const ptsAgainst = Math.round((r.metadata?.settings?.fpts_against || 0) * 10) / 10;
        const teamName = r.metadata?.team_name || `Team ${r.sleeperRosterId}`;

        // Playoff odds (top 6 = In, 7-8 = Bubble, rest = Out)
        let playoffStatus = '';
        if (idx < 6) {
          playoffStatus = '🟢 In';
        } else if (idx < 8) {
          playoffStatus = '🟡 Bubble';
        } else {
          playoffStatus = '🔴 Out';
        }

        // Win streak detection (simplified)
        let streak = '';
        if (wins >= 3 && losses === 0) {
          streak = '🔥 Hot';
        } else if (losses >= 3 && wins === 0) {
          streak = '❄️ Cold';
        }

        return {
          rank: idx + 1,
          teamName,
          wins,
          losses,
          ptsFor,
          ptsAgainst,
          playoffStatus,
          streak
        };
      });

      // Build report
      let report = `# 🏆 ${season} Standings\n\n`;
      report += `## Rankings\n\n`;
      report += `| Rank | Team | W-L | PF | PA | Playoff | \n`;
      report += `|------|------|-----|----|----|---------||\n`;
      
      standings.forEach(s => {
        const streakBadge = s.streak ? ` ${s.streak}` : '';
        report += `| ${s.rank} | ${s.teamName}${streakBadge} | ${s.wins}-${s.losses} | ${s.ptsFor} | ${s.ptsAgainst} | ${s.playoffStatus} |\n`;
      });

      report += `\n## 🎯 Playoff Picture\n`;
      const inPlayoffs = standings.filter(s => s.playoffStatus === '🟢 In');
      const onBubble = standings.filter(s => s.playoffStatus === '🟡 Bubble');
      
      report += `• **Clinched (Top 6):** ${inPlayoffs.map(s => s.teamName).join(', ')}\n`;
      if (onBubble.length > 0) {
        report += `• **On the Bubble:** ${onBubble.map(s => s.teamName).join(', ')}\n`;
      }

      // Hot/Cold teams
      const hotTeams = standings.filter(s => s.streak === '🔥 Hot');
      const coldTeams = standings.filter(s => s.streak === '❄️ Cold');
      
      if (hotTeams.length > 0) {
        report += `• **Hot Teams:** ${hotTeams.map(s => s.teamName).join(', ')}\n`;
      }
      if (coldTeams.length > 0) {
        report += `• **Cold Teams:** ${coldTeams.map(s => s.teamName).join(', ')}\n`;
      }

      return report;
    } catch (error) {
      console.error('[Reports] Error generating standings report:', error);
      return `# 🏆 ${season} Standings\n\n_Error generating report. Please try again later._`;
    }
  }

  /**
   * Helper to calculate median
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

// Export singleton instance
export const reportsService = new ReportsService();
