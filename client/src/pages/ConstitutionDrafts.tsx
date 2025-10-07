import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { api } from '@/lib/apiApp';
import { queryClient } from '@/lib/queryClient';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface ConstitutionChange {
  label: string;
  before: any;
  after: any;
  path: string;
}

interface ConstitutionDraft {
  id: string;
  source: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
  createdAt: string;
  changes: ConstitutionChange[];
}

export function ConstitutionDrafts() {
  const { selectedLeagueId } = useAppStore();
  const { data: drafts = [], isLoading } = useQuery<ConstitutionDraft[]>({
    queryKey: ['/api/v2/constitution/drafts', selectedLeagueId],
    queryFn: async () => {
      return await api(`/api/v2/constitution/drafts/${selectedLeagueId}`);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return await api(`/api/v2/constitution/drafts/${draftId}/apply`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/constitution/drafts', selectedLeagueId] });
      toast.success('Draft applied', {
        description: 'Constitution has been updated with the proposed changes',
      });
    },
    onError: (error) => {
      toast.error('Failed to apply draft', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return await api(`/api/v2/constitution/drafts/${draftId}/reject`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/constitution/drafts', selectedLeagueId] });
      toast.success('Draft rejected', {
        description: 'The proposed changes have been rejected',
      });
    },
    onError: (error) => {
      toast.error('Failed to reject draft', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const getStatusIcon = (status: ConstitutionDraft['status']) => {
    switch (status) {
      case 'APPLIED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Constitution Drafts</h1>
          <p className="text-gray-400">Loading sync proposals...</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="h-5 w-48 bg-gray-700 animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-700 animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-gray-700 animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Constitution Drafts</h1>
        <p className="text-gray-400">Manage Sleeper→Constitution sync proposals</p>
      </div>

      {drafts.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-8">
            <p className="text-center text-gray-400" data-testid="text-no-drafts">
              No constitution drafts found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <Card key={draft.id} className="bg-gray-800 border-gray-700" data-testid={`card-draft-${draft.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(draft.status)}
                    <div>
                      <CardTitle className="text-base text-gray-100">
                        {draft.source}
                      </CardTitle>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      draft.status === 'PENDING'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : draft.status === 'APPLIED'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                    data-testid={`status-${draft.id}`}
                  >
                    {draft.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Proposed Changes:</h4>
                  <div className="space-y-2">
                    {draft.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-900 p-3 rounded-lg border border-gray-700"
                        data-testid={`change-${draft.id}-${idx}`}
                      >
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400 block mb-1">Label</span>
                            <span className="text-gray-100">{change.label}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-1">Before</span>
                            <span className="text-gray-100">{formatValue(change.before)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-1">After</span>
                            <span className="text-gray-100">{formatValue(change.after)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-1">Path</span>
                            <span className="text-gray-100 text-xs font-mono">{change.path}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {draft.status === 'PENDING' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => applyMutation.mutate(draft.id)}
                        disabled={applyMutation.isPending || rejectMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid={`button-apply-${draft.id}`}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => rejectMutation.mutate(draft.id)}
                        disabled={applyMutation.isPending || rejectMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        data-testid={`button-reject-${draft.id}`}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
