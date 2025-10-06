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

export interface RosterData {
  sleeperRosterId: string;
  ownerId: string | null;
  players: any[];
  bench: any[];
  ir: any[];
  metadata: any;
}

export interface TransactionData {
  txId: string;
  type: string;
  status: string | null;
  faabSpent: number | null;
  adds: any[];
  drops: any[];
  parties: any[];
  processedAt: Date | null;
  raw: any;
}

export interface MatchupData {
  matchupId: string;
  rosterIdHome: string | null;
  rosterIdAway: string | null;
  scoreHome: string | null;
  scoreAway: string | null;
  status: string | null;
  raw: any;
}

export class SleeperClient {
  private etagCache = new Map<string, string>();

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

  async rosters(leagueId: string, etag?: string): Promise<SleeperResponse<SleeperRoster[]>> {
    return this.get<SleeperRoster[]>(`/v1/league/${leagueId}/rosters`, etag);
  }

  async matchups(leagueId: string, week: number, etag?: string): Promise<SleeperResponse<any[]>> {
    return this.get<any[]>(`/v1/league/${leagueId}/matchups/${week}`, etag);
  }

  async transactions(leagueId: string, week: number, etag?: string): Promise<SleeperResponse<any[]>> {
    return this.get<any[]>(`/v1/league/${leagueId}/transactions/${week}`, etag);
  }

  async fetchRosters(leagueId: string): Promise<RosterData[] | null> {
    const cacheKey = `rosters:${leagueId}`;
    const cachedEtag = this.etagCache.get(cacheKey);

    console.log(`[SleeperClient] Fetching rosters for league ${leagueId}${cachedEtag ? ' with ETag' : ''}`);

    const response = await this.rosters(leagueId, cachedEtag);

    if (response.status === 304) {
      console.log(`[SleeperClient] Rosters not modified (304) for league ${leagueId}`);
      return null;
    }

    if (response.status !== 200 || !response.data) {
      console.error(`[SleeperClient] Failed to fetch rosters: ${response.status}`);
      throw new Error(`Failed to fetch rosters: ${response.status}`);
    }

    if (response.etag) {
      this.etagCache.set(cacheKey, response.etag);
    }

    const normalized: RosterData[] = response.data.map((roster: SleeperRoster) => ({
      sleeperRosterId: String(roster.roster_id),
      ownerId: roster.owner_id || null,
      players: roster.players || [],
      bench: roster.reserve || [],
      ir: roster.taxi || [],
      metadata: {
        wins: roster.settings.wins,
        losses: roster.settings.losses,
        ties: roster.settings.ties,
        waiver_position: roster.settings.waiver_position,
        waiver_budget_used: roster.settings.waiver_budget_used,
        total_moves: roster.settings.total_moves,
        fpts: roster.settings.fpts,
        fpts_against: roster.settings.fpts_against,
        starters: roster.starters
      }
    }));

    console.log(`[SleeperClient] Successfully fetched ${normalized.length} rosters for league ${leagueId}`);
    return normalized;
  }

  async fetchTransactions(leagueId: string, week?: number): Promise<TransactionData[] | null> {
    if (!week) {
      console.log(`[SleeperClient] Week not provided for transactions, skipping fetch`);
      return [];
    }

    const cacheKey = `transactions:${leagueId}:${week}`;
    const cachedEtag = this.etagCache.get(cacheKey);

    console.log(`[SleeperClient] Fetching transactions for league ${leagueId} week ${week}${cachedEtag ? ' with ETag' : ''}`);

    const response = await this.transactions(leagueId, week, cachedEtag);

    if (response.status === 304) {
      console.log(`[SleeperClient] Transactions not modified (304) for league ${leagueId} week ${week}`);
      return null;
    }

    if (response.status !== 200 || !response.data) {
      console.error(`[SleeperClient] Failed to fetch transactions: ${response.status}`);
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }

    if (response.etag) {
      this.etagCache.set(cacheKey, response.etag);
    }

    const normalized: TransactionData[] = response.data.map((tx: any) => ({
      txId: tx.transaction_id,
      type: tx.type,
      status: tx.status || null,
      faabSpent: tx.settings?.waiver_bid || null,
      adds: Object.entries(tx.adds || {}).map(([playerId, rosterId]) => ({ playerId, rosterId })),
      drops: Object.entries(tx.drops || {}).map(([playerId, rosterId]) => ({ playerId, rosterId })),
      parties: tx.roster_ids || [],
      processedAt: tx.status_updated ? new Date(tx.status_updated * 1000) : null,
      raw: tx
    }));

    console.log(`[SleeperClient] Successfully fetched ${normalized.length} transactions for league ${leagueId} week ${week}`);
    return normalized;
  }

  async fetchMatchups(leagueId: string, week: number): Promise<MatchupData[] | null> {
    const cacheKey = `matchups:${leagueId}:${week}`;
    const cachedEtag = this.etagCache.get(cacheKey);

    console.log(`[SleeperClient] Fetching matchups for league ${leagueId} week ${week}${cachedEtag ? ' with ETag' : ''}`);

    const response = await this.matchups(leagueId, week, cachedEtag);

    if (response.status === 304) {
      console.log(`[SleeperClient] Matchups not modified (304) for league ${leagueId} week ${week}`);
      return null;
    }

    if (response.status !== 200 || !response.data) {
      console.error(`[SleeperClient] Failed to fetch matchups: ${response.status}`);
      throw new Error(`Failed to fetch matchups: ${response.status}`);
    }

    if (response.etag) {
      this.etagCache.set(cacheKey, response.etag);
    }

    const matchupMap = new Map<number, any[]>();
    response.data.forEach((entry: any) => {
      const matchupId = entry.matchup_id;
      if (!matchupMap.has(matchupId)) {
        matchupMap.set(matchupId, []);
      }
      matchupMap.get(matchupId)!.push(entry);
    });

    const normalized: MatchupData[] = [];
    matchupMap.forEach((entries, matchupId) => {
      if (entries.length === 2) {
        normalized.push({
          matchupId: String(matchupId),
          rosterIdHome: String(entries[0].roster_id),
          rosterIdAway: String(entries[1].roster_id),
          scoreHome: entries[0].points ? String(entries[0].points) : null,
          scoreAway: entries[1].points ? String(entries[1].points) : null,
          status: entries[0].points && entries[1].points ? 'final' : 'in_progress',
          raw: { home: entries[0], away: entries[1] }
        });
      } else if (entries.length === 1) {
        normalized.push({
          matchupId: String(matchupId),
          rosterIdHome: String(entries[0].roster_id),
          rosterIdAway: null,
          scoreHome: entries[0].points ? String(entries[0].points) : null,
          scoreAway: null,
          status: 'bye',
          raw: { home: entries[0] }
        });
      }
    });

    console.log(`[SleeperClient] Successfully fetched ${normalized.length} matchups for league ${leagueId} week ${week}`);
    return normalized;
  }
}

export const sleeperClient = new SleeperClient();
