import { SleeperService, SleeperLeague, SleeperRoster, SleeperMatchup } from './sleeper';
import { League } from '../../shared/schema';

export interface DigestSection {
  title: string;
  content: string;
}

export interface DigestContent {
  leagueId: string;
  leagueName: string;
  timestamp: string;
  sections: DigestSection[];
  error?: string;
}

export async function generateDigestContent(
  league: League, 
  sleeperData: {
    league: SleeperLeague;
    rosters: SleeperRoster[];
    currentWeek: number;
    matchups?: SleeperMatchup[];
  }
): Promise<DigestContent> {
  const sections: DigestSection[] = [];

  try {
    // Create roster ID to metadata mapping for team names
    const rosterMap = new Map(
      sleeperData.rosters.map(r => [
        r.roster_id, 
        {
          owner: r.owner_id,
          metadata: r.metadata || {},
          settings: r.settings
        }
      ])
    );

    // League Standings Section - sorted by wins
    if (sleeperData.rosters && sleeperData.rosters.length > 0) {
      const sortedRosters = [...sleeperData.rosters]
        .sort((a, b) => {
          const winsA = a.settings?.wins || 0;
          const winsB = b.settings?.wins || 0;
          if (winsA !== winsB) return winsB - winsA; // Sort by wins descending
          
          // Tie-breaker: points for
          const ptsA = a.settings?.fpts || 0;
          const ptsB = b.settings?.fpts || 0;
          return ptsB - ptsA;
        });

      const standingsText = sortedRosters
        .slice(0, 8) // Show top 8 teams
        .map((roster, index) => {
          const wins = roster.settings?.wins || 0;
          const losses = roster.settings?.losses || 0;
          const points = roster.settings?.fpts ? Math.round(roster.settings.fpts * 10) / 10 : 0;
          const teamName = roster.metadata?.team_name || `Team ${roster.roster_id}`;
          return `${index + 1}. ${teamName}: ${wins}-${losses} (${points} pts)`;
        })
        .join('\n');
      
      sections.push({
        title: "📊 Current Standings",
        content: standingsText,
      });
    }

    // Weekly Matchups Section - with team names and scores
    if (sleeperData.matchups && sleeperData.matchups.length > 0) {
      // Group matchups by matchup_id to pair teams
      const matchupGroups = new Map<number, SleeperMatchup[]>();
      sleeperData.matchups.forEach(m => {
        if (!matchupGroups.has(m.matchup_id)) {
          matchupGroups.set(m.matchup_id, []);
        }
        matchupGroups.get(m.matchup_id)!.push(m);
      });

      const matchupTexts: string[] = [];
      let count = 0;
      for (const [matchupId, teams] of Array.from(matchupGroups.entries())) {
        if (count >= 5) break; // Show max 5 matchups
        
        if (teams.length === 2) {
          const [team1, team2] = teams.sort((a: SleeperMatchup, b: SleeperMatchup) => (b.points || 0) - (a.points || 0));
          const team1Info = rosterMap.get(team1.roster_id);
          const team2Info = rosterMap.get(team2.roster_id);
          
          const team1Name = team1Info?.metadata?.team_name || `Team ${team1.roster_id}`;
          const team2Name = team2Info?.metadata?.team_name || `Team ${team2.roster_id}`;
          
          const team1Points = team1.points ? Math.round(team1.points * 10) / 10 : 0;
          const team2Points = team2.points ? Math.round(team2.points * 10) / 10 : 0;
          
          matchupTexts.push(`**${team1Name}** ${team1Points} - ${team2Points} **${team2Name}**`);
          count++;
        }
      }
      
      sections.push({
        title: `🏈 Week ${sleeperData.currentWeek} Matchups`,
        content: matchupTexts.length > 0 ? matchupTexts.join('\n') : "No matchup data available for this week.",
      });
    }

    // League Info Section
    sections.push({
      title: "ℹ️ League Info",
      content: `**League:** ${sleeperData.league.name || league.name}\n**Teams:** ${sleeperData.rosters.length}\n**Week:** ${sleeperData.currentWeek}`,
    });

  } catch (error) {
    console.warn("Error generating digest sections:", error);
    sections.push({
      title: "Digest Generation",
      content: "Unable to process some league data. Please check your league configuration.",
    });
  }

  return {
    leagueId: league.id,
    leagueName: league.name,
    timestamp: new Date().toISOString(),
    sections: sections.length > 0 ? sections : [{
      title: "League Update",
      content: "No current data available. Check back later for updates.",
    }],
  };
}