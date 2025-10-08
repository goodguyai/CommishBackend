import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from './queryClient';

// Types
export interface ConstitutionDraft {
  id: string;
  leagueId: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
  source: 'sleeper_sync' | 'manual' | 'ai_suggestion';
  diff: Array<{
    key: string;
    old: any;
    new: any;
  }>;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface ConstitutionDraftsResponse {
  drafts: ConstitutionDraft[];
}

export interface SyncResponse {
  ok: boolean;
  draft?: ConstitutionDraft;
  message: string;
}

// Hooks

export function useConstitutionDrafts(leagueId: string | null) {
  return useQuery<ConstitutionDraftsResponse>({
    queryKey: ['/api/v3/constitution/drafts', leagueId],
    queryFn: async () => {
      const response = await fetch(`/api/v3/constitution/drafts?league_id=${leagueId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch constitution drafts');
      }
      return response.json();
    },
    enabled: !!leagueId,
  });
}

export function useConstitutionSync() {
  return useMutation({
    mutationFn: async (leagueId: string) => {
      const response = await apiRequest('POST', '/api/v3/constitution/sync', {
        league_id: leagueId,
      });
      return response.json();
    },
    onSuccess: (_, leagueId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v3/constitution/drafts', leagueId] 
      });
    },
  });
}

export function useApplyDraft() {
  return useMutation({
    mutationFn: async ({ draftId, leagueId }: { draftId: string; leagueId: string }) => {
      const response = await apiRequest('POST', '/api/v3/constitution/apply', {
        draft_id: draftId,
        league_id: leagueId,
      });
      return response.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v3/constitution/drafts', leagueId] 
      });
    },
  });
}

export function useRejectDraft() {
  return useMutation({
    mutationFn: async ({ draftId, leagueId }: { draftId: string; leagueId: string }) => {
      const response = await apiRequest('POST', '/api/v3/constitution/reject', {
        draft_id: draftId,
        league_id: leagueId,
      });
      return response.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v3/constitution/drafts', leagueId] 
      });
    },
  });
}
