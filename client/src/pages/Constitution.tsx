import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  useConstitutionDrafts, 
  useConstitutionSync, 
  useApplyDraft, 
  useRejectDraft,
  type ConstitutionDraft 
} from '@/lib/constitutionApi';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Check, X, ChevronDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function Constitution() {
  const { selectedLeagueId } = useAppStore();
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());

  // Queries and mutations
  const { data: draftsData, isLoading: draftsLoading } = useConstitutionDrafts(selectedLeagueId);
  const syncMutation = useConstitutionSync();
  const applyMutation = useApplyDraft();
  const rejectMutation = useRejectDraft();

  const drafts = draftsData?.drafts || [];
  const pendingDrafts = drafts.filter(d => d.status === 'PENDING');
  const historyDrafts = drafts.filter(d => d.status === 'APPLIED' || d.status === 'REJECTED');

  const handleSync = async () => {
    if (!selectedLeagueId) return;
    
    try {
      await syncMutation.mutateAsync(selectedLeagueId);
      toast.success('Synced from Sleeper', {
        description: 'Constitution has been synced successfully',
      });
    } catch (error: any) {
      toast.error('Sync failed', {
        description: error?.message || 'Failed to sync constitution',
      });
    }
  };

  const handleApply = async (draftId: string) => {
    if (!selectedLeagueId) return;
    
    try {
      await applyMutation.mutateAsync({ draftId, leagueId: selectedLeagueId });
      toast.success('Draft applied', {
        description: 'Constitution changes have been applied',
      });
    } catch (error: any) {
      toast.error('Apply failed', {
        description: error?.message || 'Failed to apply draft',
      });
    }
  };

  const handleReject = async (draftId: string) => {
    if (!selectedLeagueId) return;
    
    try {
      await rejectMutation.mutateAsync({ draftId, leagueId: selectedLeagueId });
      toast.success('Draft rejected', {
        description: 'Constitution changes have been rejected',
      });
    } catch (error: any) {
      toast.error('Reject failed', {
        description: error?.message || 'Failed to reject draft',
      });
    }
  };

  const toggleExpanded = (draftId: string) => {
    const newExpanded = new Set(expandedDrafts);
    if (newExpanded.has(draftId)) {
      newExpanded.delete(draftId);
    } else {
      newExpanded.add(draftId);
    }
    setExpandedDrafts(newExpanded);
  };

  const formatSource = (source: string) => {
    switch (source) {
      case 'sleeper_sync':
        return 'Sleeper Sync';
      case 'manual':
        return 'Manual';
      case 'ai_suggestion':
        return 'AI Suggestion';
      default:
        return source;
    }
  };

  if (draftsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Constitution</h1>
          <p className="text-text-secondary mt-1">Manage league constitution and rule changes</p>
        </div>
        <Button 
          onClick={handleSync}
          disabled={syncMutation.isPending}
          data-testid="button-sync-constitution"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync from Sleeper
        </Button>
      </div>

      {/* Pending Drafts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-teal" />
            Pending Drafts
            {pendingDrafts.length > 0 && (
              <Badge variant="default" className="ml-2" data-testid="badge-pending-count">
                {pendingDrafts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDrafts.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No pending drafts. Click "Sync from Sleeper" to check for changes.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDrafts.map((draft) => (
                  <TableRow key={draft.id} data-testid={`draft-pending-${draft.id}`}>
                    <TableCell>
                      {format(new Date(draft.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{formatSource(draft.source)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleExpanded(draft.id)}
                            data-testid={`button-expand-${draft.id}`}
                          >
                            {draft.diff.length} change{draft.diff.length !== 1 ? 's' : ''}
                            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${expandedDrafts.has(draft.id) ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2 bg-surface-subtle rounded-md p-3">
                            {draft.diff.map((change, idx) => (
                              <div key={idx} className="text-sm" data-testid={`diff-${draft.id}-${idx}`}>
                                <div className="font-medium text-text-primary mb-1">{change.key}</div>
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <div className="text-text-muted text-xs mb-1">Old:</div>
                                    <div className="bg-red-500/10 text-red-300 p-2 rounded">
                                      {typeof change.old === 'object' ? JSON.stringify(change.old, null, 2) : String(change.old)}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-text-muted text-xs mb-1">New:</div>
                                    <div className="bg-green-500/10 text-green-300 p-2 rounded">
                                      {typeof change.new === 'object' ? JSON.stringify(change.new, null, 2) : String(change.new)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApply(draft.id)}
                          disabled={applyMutation.isPending}
                          className="bg-accent-green hover:bg-accent-green/90"
                          data-testid={`button-apply-${draft.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(draft.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${draft.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyDrafts.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No draft history yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Decided Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyDrafts.map((draft) => (
                  <TableRow key={draft.id} data-testid={`draft-history-${draft.id}`}>
                    <TableCell>
                      {format(new Date(draft.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{formatSource(draft.source)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleExpanded(draft.id)}
                            data-testid={`button-expand-history-${draft.id}`}
                          >
                            {draft.diff.length} change{draft.diff.length !== 1 ? 's' : ''}
                            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${expandedDrafts.has(draft.id) ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2 bg-surface-subtle rounded-md p-3">
                            {draft.diff.map((change, idx) => (
                              <div key={idx} className="text-sm">
                                <div className="font-medium text-text-primary mb-1">{change.key}</div>
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <div className="text-text-muted text-xs mb-1">Old:</div>
                                    <div className="bg-red-500/10 text-red-300 p-2 rounded">
                                      {typeof change.old === 'object' ? JSON.stringify(change.old, null, 2) : String(change.old)}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-text-muted text-xs mb-1">New:</div>
                                    <div className="bg-green-500/10 text-green-300 p-2 rounded">
                                      {typeof change.new === 'object' ? JSON.stringify(change.new, null, 2) : String(change.new)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                    <TableCell>
                      {draft.decidedAt ? format(new Date(draft.decidedAt), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={draft.status === 'APPLIED' ? 'success' : 'error'}
                        data-testid={`badge-status-${draft.id}`}
                      >
                        {draft.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
