const SLEEPER_BASE = 'https://api.sleeper.app';

export interface SleeperResponse<T> {
  status: number;
  data?: T;
  etag?: string;
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  status: string;
  total_rosters: number;
  settings: Record<string, any>;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  previous_league_id?: string;
  draft_id?: string;
  avatar?: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  starters: string[];
  players: string[];
  reserve?: string[];
  taxi?: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    waiver_position?: number;
    waiver_budget_used?: number;
    total_moves?: number;
    fpts?: number;
    fpts_against?: number;
    fpts_decimal?: number;
    fpts_against_decimal?: number;
  };
}

export class SleeperClient {
  constructor(private fetchImpl: typeof fetch = fetch) {}

  private async get<T>(path: string, etag?: string): Promise<SleeperResponse<T>> {
    try {
      const headers: HeadersInit = {};
      if (etag) {
        headers['If-None-Match'] = etag;
      }

      const res = await this.fetchImpl(`${SLEEPER_BASE}${path}`, {
        headers,
      });

      if (res.status === 304) {
        return { status: 304 };
      }

      if (!res.ok) {
        console.error(`Sleeper API error: ${res.status} ${res.statusText} for ${path}`);
        return { status: res.status };
      }

      const data = await res.json();
      const responseEtag = res.headers.get('ETag') ?? undefined;

      return { 
        status: res.status, 
        data, 
        etag: responseEtag 
      };
    } catch (error) {
      console.error(`Sleeper API request failed for ${path}:`, error);
      return { status: 500 };
    }
  }

  async userByUsername(username: string): Promise<SleeperResponse<SleeperUser>> {
    return this.get<SleeperUser>(`/v1/user/${encodeURIComponent(username)}`);
  }

  async leaguesByUser(userId: string, season: string, sport: string = 'nfl'): Promise<SleeperResponse<SleeperLeague[]>> {
    return this.get<SleeperLeague[]>(`/v1/user/${userId}/leagues/${sport}/${season}`);
  }

  async league(leagueId: string): Promise<SleeperResponse<SleeperLeague>> {
    return this.get<SleeperLeague>(`/v1/league/${leagueId}`);
  }

  async rosters(leagueId: string): Promise<SleeperResponse<SleeperRoster[]>> {
    return this.get<SleeperRoster[]>(`/v1/league/${leagueId}/rosters`);
  }

  async matchups(leagueId: string, week: number): Promise<SleeperResponse<any[]>> {
    return this.get<any[]>(`/v1/league/${leagueId}/matchups/${week}`);
  }

  async transactions(leagueId: string, week: number): Promise<SleeperResponse<any[]>> {
    return this.get<any[]>(`/v1/league/${leagueId}/transactions/${week}`);
  }
}

export const sleeperClient = new SleeperClient();
