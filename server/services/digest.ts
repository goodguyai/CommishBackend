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
    matchups: SleeperMatchup[];
  }
): Promise<DigestContent> {
  const sections: DigestSection[] = [];

  try {
    // Weekly Matchups Section
    if (sleeperData.matchups && sleeperData.matchups.length > 0) {
      const matchupText = sleeperData.matchups
        .slice(0, 5) // Show top 5 matchups
        .map((matchup, index) => 
          `Matchup ${index + 1}: ${matchup.points ? Math.round(matchup.points * 100) / 100 : 0} points`
        )
        .join('\n');
      
      sections.push({
        title: `Week ${sleeperData.currentWeek} Matchups`,
        content: matchupText || "No matchup data available for this week.",
      });
    }

    // League Info Section
    sections.push({
      title: "League Overview",
      content: `League: ${sleeperData.league.name || league.name}\nTotal Teams: ${sleeperData.rosters.length}\nCurrent Week: ${sleeperData.currentWeek}`,
    });

    // Roster Summary Section
    if (sleeperData.rosters && sleeperData.rosters.length > 0) {
      const rosterSummary = sleeperData.rosters
        .slice(0, 3) // Show top 3 teams
        .map((roster, index) => 
          `Team ${index + 1}: ${roster.settings?.wins || 0}-${roster.settings?.losses || 0} record`
        )
        .join('\n');
      
      sections.push({
        title: "Top Performers",
        content: rosterSummary,
      });
    }

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