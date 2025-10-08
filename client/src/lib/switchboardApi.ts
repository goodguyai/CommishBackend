import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from './queryClient';

// Types
export interface FeatureFlags {
  onboarding: boolean;
  reactions: boolean;
  announcements: boolean;
  weeklyRecaps: boolean;
  ruleQA: boolean;
  moderation: boolean;
}

export interface FeaturesResponse {
  ok: boolean;
  features: FeatureFlags;
}

export interface ScheduledJob {
  id: string;
  leagueId: string;
  name: string;
  kind: string;
  schedule: string;
  channelId: string;
  channelName?: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface JobsResponse {
  ok: boolean;
  jobs: ScheduledJob[];
}

export interface JobHistoryRun {
  id: string;
  jobId: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  startedAt: string;
  finishedAt?: string;
  detail?: {
    messageId?: string;
    error?: string;
  };
}

export interface JobHistoryResponse {
  ok: boolean;
  history: JobHistoryRun[];
}

export interface RunJobNowResponse {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface ChannelPermission {
  installed: boolean;
  channel_read: boolean;
  channel_write: boolean;
  embed_links: boolean;
  add_reactions: boolean;
  mention_everyone: boolean;
}

export interface VerifyChannelResponse {
  ok: boolean;
  permissions: ChannelPermission;
  guildId?: string;
  channelId?: string;
}

export interface ReactionsStatsResponse {
  ok: boolean;
  count: number;
  hours: number;
}

// Hooks

export function useFeatures(leagueId: string | null) {
  return useQuery<FeaturesResponse>({
    queryKey: ['/api/v3/features', leagueId],
    queryFn: async () => {
      const response = await fetch(`/api/v3/features?league_id=${leagueId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch features');
      }
      return response.json();
    },
    enabled: !!leagueId,
  });
}

export function useUpdateFeatures() {
  return useMutation({
    mutationFn: async ({ leagueId, features }: { leagueId: string; features: Partial<FeatureFlags> }) => {
      const response = await apiRequest('POST', '/api/v3/features', {
        league_id: leagueId,
        ...features,
      });
      return response.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v3/features', leagueId] 
      });
    },
  });
}

export function useJobs(leagueId: string | null) {
  return useQuery<JobsResponse>({
    queryKey: ['/api/v3/jobs', leagueId],
    queryFn: async () => {
      const response = await fetch(`/api/v3/jobs?league_id=${leagueId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled jobs');
      }
      return response.json();
    },
    enabled: !!leagueId,
  });
}

export function useJobHistory(leagueId: string | null, jobKind: string | null) {
  return useQuery<JobHistoryResponse>({
    queryKey: ['/api/v3/jobs/history', leagueId, jobKind],
    queryFn: async () => {
      const response = await fetch(
        `/api/v3/jobs/history?league_id=${leagueId}&kind=${jobKind}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch job history');
      }
      return response.json();
    },
    enabled: !!leagueId && !!jobKind,
  });
}

export function useRunJobNow() {
  return useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const response = await apiRequest('POST', '/api/v3/jobs/run-now', {
        job_id: jobId,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v3/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v3/jobs/history'] });
    },
  });
}

export function useVerifyChannel(guildId: string | null, channelId: string | null) {
  return useQuery<VerifyChannelResponse>({
    queryKey: ['/api/doctor/discord/permissions', guildId, channelId],
    queryFn: async () => {
      const response = await fetch(
        `/api/doctor/discord/permissions?guild_id=${guildId}&channel_id=${channelId}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to verify channel permissions');
      }
      return response.json();
    },
    enabled: !!guildId && !!channelId,
  });
}

export function useReactionsStats(leagueId: string | null, hours: number = 24) {
  return useQuery<ReactionsStatsResponse>({
    queryKey: ['/api/v3/reactions/stats', leagueId, hours],
    queryFn: async () => {
      const response = await fetch(
        `/api/v3/reactions/stats?league_id=${leagueId}&hours=${hours}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch reactions stats');
      }
      return response.json();
    },
    enabled: !!leagueId,
  });
}
