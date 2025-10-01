export interface SleeperLeague {
  league_id: string;
  name: string;
  status: string;
  sport: string;
  season: string;
  season_type: string;
  total_rosters: number;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  settings: {
    max_keepers?: number;
    draft_rounds?: number;
    trade_deadline?: number;
    playoff_week_start?: number;
  };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_against: number;
  };
  metadata?: {
    team_name?: string;
    [key: string]: any;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players_points: Record<string, number>;
}

export class SleeperService {
  private readonly baseUrl = "https://api.sleeper.app/v1";
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(endpoint: string): string {
    return `sleeper_${endpoint}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.cacheTtl,
    });
  }

  private async makeRequest<T>(endpoint: string, retries = 3): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint);
    const cached = this.getFromCache<T>(cacheKey);
    
    if (cached) {
      return cached;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        
        if (!response.ok) {
          throw new Error(`Sleeper API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this.setCache(cacheKey, data);
        return data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Sleeper API request failed");
  }

  async getLeague(leagueId: string): Promise<SleeperLeague> {
    return this.makeRequest<SleeperLeague>(`/league/${leagueId}`);
  }

  async getRosters(leagueId: string): Promise<SleeperRoster[]> {
    return this.makeRequest<SleeperRoster[]>(`/league/${leagueId}/rosters`);
  }

  async getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    return this.makeRequest<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`);
  }

  async getCurrentWeek(): Promise<number> {
    const nflState = await this.makeRequest<{ week: number }>('/state/nfl');
    return nflState.week;
  }

  async getPlayoffs(leagueId: string): Promise<any> {
    return this.makeRequest(`/league/${leagueId}/winners_bracket`);
  }

  async getTradingBlock(leagueId: string): Promise<any> {
    return this.makeRequest(`/league/${leagueId}/traded_picks`);
  }

  async syncLeagueData(leagueId: string): Promise<{
    league: SleeperLeague;
    rosters: SleeperRoster[];
    currentWeek: number;
    matchups?: SleeperMatchup[];
  }> {
    const startTime = Date.now();

    try {
      const [league, rosters, currentWeek] = await Promise.all([
        this.getLeague(leagueId),
        this.getRosters(leagueId),
        this.getCurrentWeek(),
      ]);

      let matchups: SleeperMatchup[] | undefined;
      
      // Only fetch current week matchups if season is active
      if (league.status === "in_season") {
        try {
          matchups = await this.getMatchups(leagueId, currentWeek);
        } catch (error) {
          console.warn(`Failed to fetch matchups for week ${currentWeek}:`, error);
        }
      }

      const latency = Date.now() - startTime;
      
      return {
        league,
        rosters,
        currentWeek,
        matchups,
      };
    } catch (error) {
      console.error(`Failed to sync Sleeper data for league ${leagueId}:`, error);
      throw error;
    }
  }

  // Clear cache for a specific league
  clearLeagueCache(leagueId: string): void {
    const keys = Array.from(this.cache.keys()).filter(key => 
      key.includes(leagueId)
    );
    
    keys.forEach(key => this.cache.delete(key));
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
  }

  // User discovery methods for setup wizard
  async getUser(username: string): Promise<{ user_id: string; username: string; display_name: string } | null> {
    try {
      return await this.makeRequest<{ user_id: string; username: string; display_name: string }>(`/user/${username}`);
    } catch (error) {
      console.error(`Error fetching user ${username}:`, error);
      return null;
    }
  }

  async getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
    try {
      return await this.makeRequest<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
    } catch (error) {
      console.error(`Error fetching leagues for user ${userId}:`, error);
      return [];
    }
  }
}

export const sleeperService = new SleeperService();
