import type { SleeperLeague } from './sleeperClient';

export interface NormalizedSettings {
  scoring: Record<string, number>;
  roster: {
    positions: string[];
    taxi: boolean;
    ir_slots: number;
    max_keep: number | null;
  };
  waivers: {
    type: 'FAAB' | 'Rolling' | 'None';
    budget?: number;
    run_day?: number;
    clear_days?: number;
    tiebreaker?: string;
  };
  playoffs: {
    teams: number;
    start_week: number;
    bye_weeks?: number;
  };
  trades: {
    deadline_week?: number | null;
    veto?: 'None' | 'League' | 'Commissioner';
    review_period_hours?: number;
  };
  misc: {
    divisions?: number;
    schedule_weeks?: number;
    draft_type?: string;
    keeper_count?: number;
  };
}

export function mapSleeperLeagueToSettings(sleeperLeague: SleeperLeague): NormalizedSettings {
  const s = sleeperLeague.settings || {};
  const scoringSettings = sleeperLeague.scoring_settings || {};

  // Map scoring settings - extract all available scoring rules
  const scoring: Record<string, number> = {
    pass_td: scoringSettings.pass_td ?? 4,
    pass_yd: scoringSettings.pass_yd ?? 0.04,
    pass_2pt: scoringSettings.pass_2pt ?? 2,
    pass_int: scoringSettings.pass_int ?? -1,
    rush_yd: scoringSettings.rush_yd ?? 0.1,
    rush_td: scoringSettings.rush_td ?? 6,
    rush_2pt: scoringSettings.rush_2pt ?? 2,
    rec: scoringSettings.rec ?? 0, // PPR setting
    rec_yd: scoringSettings.rec_yd ?? 0.1,
    rec_td: scoringSettings.rec_td ?? 6,
    rec_2pt: scoringSettings.rec_2pt ?? 2,
    fum_lost: scoringSettings.fum_lost ?? -2,
    // Bonus points
    bonus_rec_te: scoringSettings.bonus_rec_te ?? 0,
    bonus_rush_yd_100: scoringSettings.bonus_rush_yd_100 ?? 0,
    bonus_rush_yd_200: scoringSettings.bonus_rush_yd_200 ?? 0,
    bonus_rec_yd_100: scoringSettings.bonus_rec_yd_100 ?? 0,
    bonus_rec_yd_200: scoringSettings.bonus_rec_yd_200 ?? 0,
    bonus_pass_yd_300: scoringSettings.bonus_pass_yd_300 ?? 0,
    bonus_pass_yd_400: scoringSettings.bonus_pass_yd_400 ?? 0,
  };

  // Map roster settings
  const roster = {
    positions: sleeperLeague.roster_positions ?? [],
    taxi: Boolean(s.taxi_slots && s.taxi_slots > 0),
    ir_slots: s.reserve_slots ?? 0,
    max_keep: s.keeper_count ?? null,
  };

  // Map waiver settings
  const waivers = {
    type: (s.waiver_type === 1 ? 'FAAB' : (s.waiver_type === 2 ? 'Rolling' : 'None')) as 'FAAB' | 'Rolling' | 'None',
    budget: s.waiver_budget ?? undefined,
    run_day: s.waiver_day_of_week ?? undefined,
    clear_days: s.waiver_clear_days ?? undefined,
    tiebreaker: s.waiver_bid_min ?? undefined,
  };

  // Map playoff settings
  const playoffs = {
    teams: s.playoff_teams ?? 6,
    start_week: s.playoff_week_start ?? 15,
    bye_weeks: s.playoff_round_type ?? undefined,
  };

  // Map trade settings
  const trades = {
    deadline_week: s.trade_deadline ?? null,
    veto: (s.veto_votes_needed && s.veto_votes_needed > 0 ? 'League' : 'None') as 'None' | 'League' | 'Commissioner',
    review_period_hours: s.trade_review_days ? s.trade_review_days * 24 : undefined,
  };

  // Map misc settings
  const misc = {
    divisions: s.divisions ?? 0,
    schedule_weeks: s.playoff_week_start ? s.playoff_week_start - 1 : 14,
    draft_type: s.type ?? 'snake',
    keeper_count: s.keeper_count ?? 0,
  };

  return { scoring, roster, waivers, playoffs, trades, misc };
}
