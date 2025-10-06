import { sleeperClient, SleeperClient } from './sleeperClient';
import { mapSleeperLeagueToSettings, type NormalizedSettings } from './sleeperMapping';
import { storage } from '../storage';
import type { SleeperLeague } from './sleeperClient';
import { createConstitutionPipeline } from './constitutionPipeline';

export interface LinkSleeperLeagueParams {
  leagueId: string;
  username: string;
  season: string;
}

export interface SaveSleeperLinkParams {
  leagueId: string;
  sleeperLeagueId: string;
  season: string;
  username?: string;
}

export interface SleeperLeagueChoice {
  id: string;
  name: string;
  season: string;
  sport: string;
  status: string;
}

export async function linkSleeperLeague(
  { username, season }: LinkSleeperLeagueParams
): Promise<SleeperLeagueChoice[]> {
  const client = sleeperClient;

  const userRes = await client.userByUsername(username);
  if (userRes.status !== 200 || !userRes.data?.user_id) {
    throw new Error('SLEEPER_USER_NOT_FOUND');
  }

  const leaguesRes = await client.leaguesByUser(userRes.data.user_id, season);
  if (leaguesRes.status !== 200 || !Array.isArray(leaguesRes.data)) {
    throw new Error('SLEEPER_LEAGUES_NOT_FOUND');
  }

  return leaguesRes.data.map((l: SleeperLeague) => ({
    id: l.league_id,
    name: l.name,
    season: l.season,
    sport: l.sport,
    status: l.status,
  }));
}

export async function saveSleeperLink(params: SaveSleeperLinkParams): Promise<void> {
  await storage.saveSleeperLink(params);
}

function computeSettingsDiff(
  oldSettings: NormalizedSettings | null,
  newSettings: NormalizedSettings
): Array<{ path: string; oldValue: any; newValue: any }> {
  if (!oldSettings) {
    return [];
  }

  const diffs: Array<{ path: string; oldValue: any; newValue: any }> = [];

  const categories = ['scoring', 'roster', 'waivers', 'playoffs', 'trades', 'misc'] as const;

  for (const category of categories) {
    const oldCategory = oldSettings[category];
    const newCategory = newSettings[category];

    if (!oldCategory || !newCategory) continue;

    for (const key in newCategory) {
      const oldValue = (oldCategory as any)[key];
      const newValue = (newCategory as any)[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diffs.push({
          path: `${category}.${key}`,
          oldValue,
          newValue,
        });
      }
    }
  }

  return diffs;
}

export async function runSleeperSync(leagueId: string): Promise<NormalizedSettings> {
  const link = await storage.getSleeperIntegration(leagueId);
  if (!link) {
    throw new Error('SLEEPER_NOT_LINKED');
  }

  const client = sleeperClient;
  const leagueRes = await client.league(link.sleeperLeagueId);

  if (leagueRes.status !== 200 || !leagueRes.data) {
    throw new Error('SLEEPER_LEAGUE_FETCH_FAILED');
  }

  // Persist snapshot for audit trail
  await storage.saveSleeperSnapshot({
    leagueId,
    payload: leagueRes.data,
  });

  // Get existing settings for diff
  const existingSettings = await storage.getLeagueSettings(leagueId);

  // Map to normalized format
  const normalized = mapSleeperLeagueToSettings(leagueRes.data);

  // Compute diffs
  const diffs = computeSettingsDiff(existingSettings, normalized);

  // Save normalized settings
  await storage.saveLeagueSettings({
    leagueId,
    scoring: normalized.scoring,
    roster: normalized.roster,
    waivers: normalized.waivers,
    playoffs: normalized.playoffs,
    trades: normalized.trades,
    misc: normalized.misc,
  });

  // Save change events
  for (const diff of diffs) {
    await storage.saveSettingsChangeEvent({
      leagueId,
      source: 'sleeper',
      path: diff.path,
      oldValue: diff.oldValue,
      newValue: diff.newValue,
    });
  }

  console.log(`[SleeperSync] Synced league ${leagueId}: ${diffs.length} changes detected`);

  // Trigger constitution rendering pipeline if settings changed
  if (diffs.length > 0) {
    try {
      console.log(`[SleeperSync] Triggering constitution pipeline due to settings changes`);
      const pipeline = createConstitutionPipeline(storage);
      const pipelineResult = await pipeline.renderAndIndexConstitution(leagueId);
      console.log(`[SleeperSync] Constitution pipeline result: ${pipelineResult.summary}`);
    } catch (error) {
      console.error(`[SleeperSync] Constitution pipeline failed:`, error);
    }
  }

  return normalized;
}
