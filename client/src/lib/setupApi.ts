import { apiRequest } from './queryClient';

// Types
export interface SetupState {
  account: {
    ready: boolean;
    email: string;
    supabaseUserId: string;
  };
  discord: {
    ready: boolean;
    guildId: string | null;
    channelId: string | null;
  };
  sleeper: {
    ready: boolean;
    leagueId: string | null;
  };
  assignments: {
    ready: boolean;
    count: number;
  };
  nextStep: 'account' | 'connections' | 'assignments';
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  permissions: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status: string;
}

export interface SleeperTeam {
  ownerId: string;
  teamName: string;
  rosterId: number;
}

export interface DiscordMember {
  id: string;
  username: string;
}

export interface Assignment {
  sleeperOwnerId: string;
  discordUserId: string;
  sleeperTeamName?: string;
  discordUsername?: string;
}

export interface AssignmentSuggestion {
  sleeperOwnerId: string;
  sleeperTeamName: string;
  discordUserId: string;
  discordUsername: string;
  confidence: number;
}

// Setup State Management
export async function getSetupState(): Promise<SetupState> {
  const response = await fetch('/api/v2/setup/state', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch setup state');
  }
  
  const { data } = await response.json();
  return data;
}

export async function advanceSetup(step: 'account' | 'connections' | 'assignments'): Promise<void> {
  await apiRequest('/api/v2/setup/advance', {
    method: 'POST',
    body: { step },
  });
}

// Discord Setup
export async function getDiscordGuilds(): Promise<DiscordGuild[]> {
  const response = await fetch('/api/v2/discord/guilds', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch Discord guilds');
  }
  
  const { data } = await response.json();
  return data.guilds;
}

export async function getDiscordChannels(guildId: string): Promise<DiscordChannel[]> {
  const response = await fetch(`/api/v2/discord/channels?guild_id=${guildId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch Discord channels');
  }
  
  const { data } = await response.json();
  return data.channels;
}

export async function selectDiscord(guildId: string, channelId: string): Promise<{ leagueId: string }> {
  const response = await apiRequest('/api/v2/discord/select', {
    method: 'POST',
    body: { guildId, channelId },
  });
  
  return response.data;
}

export async function verifyDiscord(guildId: string, channelId: string): Promise<{ capabilities: any }> {
  const response = await fetch(`/api/v2/discord/verify?guild_id=${guildId}&channel_id=${channelId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Discord verification failed');
  }
  
  const { data } = await response.json();
  return data;
}

// Sleeper Setup
export async function lookupSleeperUser(username: string): Promise<SleeperUser> {
  const response = await fetch(`/api/v2/sleeper/lookup?username=${encodeURIComponent(username)}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Sleeper user not found');
  }
  
  const { data } = await response.json();
  return data.user;
}

export async function getSleeperLeagues(userId: string): Promise<SleeperLeague[]> {
  const response = await fetch(`/api/v2/sleeper/leagues?user_id=${userId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch Sleeper leagues');
  }
  
  const { data } = await response.json();
  return data.leagues;
}

export async function selectSleeperLeague(leagueId: string, username: string): Promise<{ snapshot: any; leagueId: string }> {
  const response = await apiRequest('/api/v2/sleeper/select', {
    method: 'POST',
    body: { leagueId, username },
  });
  
  return response.data;
}

export async function verifySleeper(leagueId: string): Promise<{ valid: boolean; details: any }> {
  const response = await fetch(`/api/v2/sleeper/verify?league_id=${leagueId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Sleeper verification failed');
  }
  
  const { data } = await response.json();
  return data;
}

// Assignments
export async function getAssignmentsBootstrap(leagueId: string, guildId: string): Promise<{
  sleeperTeams: SleeperTeam[];
  discordMembers: DiscordMember[];
  suggestions: AssignmentSuggestion[];
}> {
  const response = await fetch(`/api/v2/assignments/bootstrap?league_id=${leagueId}&guild_id=${guildId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch assignment data');
  }
  
  const { data } = await response.json();
  return data;
}

export async function commitAssignments(assignments: Assignment[]): Promise<{ committed: number }> {
  const response = await apiRequest('/api/v2/assignments/commit', {
    method: 'POST',
    body: { assignments },
  });
  
  return response.data;
}
