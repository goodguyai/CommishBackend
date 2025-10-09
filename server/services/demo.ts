import type { IStorage } from "../storage";

// Demo mode detection helpers
export const isDemo = () => String(process.env.DEMO_MODE || "").toLowerCase() === "true";
export const isDemoId = (id: string) => /^lg_demo_/.test(id);

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
