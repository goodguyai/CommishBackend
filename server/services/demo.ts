import type { IStorage } from "../storage";

export class DemoService {
  constructor(private store: IStorage) {}

  async ensureDemoLeague(accountId: string): Promise<{ leagueId: string }> {
    const existing = await this.store.findDemoLeague?.(accountId);
    if (existing) return { leagueId: existing };
    
    const leagueId = await this.store.createLeague?.({
      accountId,
      guildId: `demo-${accountId}`,
      channelId: null,
      sleeperLeagueId: null,
      featureFlags: { demo: true },
      name: "Demo League",
      platform: "sleeper",
      timezone: "America/New_York"
    });
    
    return { leagueId: leagueId || "demo-league-id" };
  }
}
