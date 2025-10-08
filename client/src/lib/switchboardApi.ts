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
