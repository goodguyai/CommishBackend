import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { 
  Scale, 
  Shield,
  Lock,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAppStore } from '@/store/useAppStore';

interface Dispute {
  id: string;
  leagueId: string;
  kind: 'trade' | 'rule' | 'behavior';
  subjectId?: string;
  openedBy: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  details?: any;
  resolution?: any;
  createdAt: string;
  resolvedAt?: string;
}

interface TradeEvaluation {
  fairness: number;
  rationale: string;
  timestamp: string;
}

export function ModerationPage() {
  const { selectedLeagueId } = useAppStore();

  // Disputes State
  const [disputeStatusFilter, setDisputeStatusFilter] = useState<string>('open');
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');
  const [disputeNewStatus, setDisputeNewStatus] = useState<string>('');

  // Trade Fairness State
  const [tradeId, setTradeId] = useState('');
  const [tradeEvaluation, setTradeEvaluation] = useState<TradeEvaluation | null>(null);
  const [isEvaluatingTrade, setIsEvaluatingTrade] = useState(false);

  // Moderation Tools State
  const [freezeChannelId, setFreezeChannelId] = useState('');
  const [freezeMinutes, setFreezeMinutes] = useState<number>(60);
  const [freezeReason, setFreezeReason] = useState('');
  const [clarifyChannelId, setClarifyChannelId] = useState('');
  const [clarifyQuestion, setClarifyQuestion] = useState('');

  // Disputes Query
  const { data: disputesData, isLoading: disputesLoading } = useQuery<{ disputes: Dispute[] }>({
    queryKey: ['/api/v2/disputes', selectedLeagueId, disputeStatusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/v2/disputes?leagueId=${selectedLeagueId}&status=${disputeStatusFilter}`);
      if (!res.ok) throw new Error('Failed to fetch disputes');
      return res.json();
    },
    enabled: !!selectedLeagueId,
  });

  // Update Dispute Mutation
  const updateDisputeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/v2/disputes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/disputes', selectedLeagueId, disputeStatusFilter] });
      toast.success('Dispute updated', {
        description: 'Dispute status has been updated',
      });
      setIsDisputeDialogOpen(false);
      setSelectedDispute(null);
      setDisputeResolutionNotes('');
    },
    onError: (error: any) => {
      toast.error('Failed to update dispute', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Freeze Thread Mutation
  const freezeThreadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/v2/mod/freeze', data);
      return response.json();
    },
    onSuccess: () => {
      toast.success('Thread frozen', {
        description: `Thread will be frozen for ${freezeMinutes} minutes`,
      });
      setFreezeChannelId('');
      setFreezeMinutes(60);
      setFreezeReason('');
    },
    onError: (error: any) => {
      toast.error('Failed to freeze thread', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Clarify Rule Mutation
  const clarifyRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/v2/mod/clarify-rule', data);
      return response.json();
    },
    onSuccess: () => {
      toast.success('Rule clarification sent', {
        description: 'AI response has been posted to the channel',
      });
      setClarifyChannelId('');
      setClarifyQuestion('');
    },
    onError: (error: any) => {
      toast.error('Failed to clarify rule', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  const handleResolveDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDisputeNewStatus('resolved');
    setDisputeResolutionNotes('');
    setIsDisputeDialogOpen(true);
  };

  const handleSaveDisputeResolution = () => {
    if (!selectedDispute || !disputeNewStatus) return;

    updateDisputeMutation.mutate({
      id: selectedDispute.id,
      data: {
        status: disputeNewStatus,
        resolution: { notes: disputeResolutionNotes },
      },
    });
  };

  const handleFreezeThread = () => {
    if (!freezeChannelId) {
      toast.error('Channel ID required');
      return;
    }

    freezeThreadMutation.mutate({
      leagueId: selectedLeagueId,
      channelId: freezeChannelId,
      durationMinutes: freezeMinutes,
      reason: freezeReason,
    });
  };

  const handleClarifyRule = () => {
    if (!clarifyChannelId || !clarifyQuestion) {
      toast.error('Missing fields', {
        description: 'Please provide both channel ID and question',
      });
      return;
    }

    clarifyRuleMutation.mutate({
      leagueId: selectedLeagueId,
      channelId: clarifyChannelId,
      question: clarifyQuestion,
    });
  };

  const handleEvaluateTrade = async () => {
    if (!tradeId) {
      toast.error('Trade ID required');
      return;
    }

    setIsEvaluatingTrade(true);
    try {
      const response = await apiRequest('POST', '/api/v2/mod/evaluate-trade', {
        leagueId: selectedLeagueId,
        tradeId,
      });
      const data = await response.json();
      setTradeEvaluation(data);
      toast.success('Trade evaluated');
    } catch (error: any) {
      toast.error('Failed to evaluate trade', {
        description: error?.message || 'An error occurred',
      });
    } finally {
      setIsEvaluatingTrade(false);
    }
  };

  if (disputesLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary" data-testid="moderation-title">
            Moderation & Disputes
          </h1>
          <p className="text-text-secondary mt-1">
            Manage league disputes and moderation tools
          </p>
        </div>
      </div>

      <Tabs defaultValue="disputes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="disputes" data-testid="tab-disputes">
            <Scale className="h-4 w-4 mr-2" />
            Disputes
          </TabsTrigger>
          <TabsTrigger value="moderation" data-testid="tab-moderation">
            <Shield className="h-4 w-4 mr-2" />
            Moderation Tools
          </TabsTrigger>
          <TabsTrigger value="trade-fairness" data-testid="tab-trade-fairness">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Trade Fairness
          </TabsTrigger>
        </TabsList>

        {/* Disputes Tab */}
        <TabsContent value="disputes">
          <Card className="bg-surface-card border-border-default shadow-depth1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-text-primary">
                  <Scale className="h-5 w-5 text-brand-teal" />
                  League Disputes
                </CardTitle>
                <Select value={disputeStatusFilter} onValueChange={setDisputeStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-dispute-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {disputesData?.disputes && disputesData.disputes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Opened By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputesData.disputes.map((dispute) => (
                      <TableRow key={dispute.id} data-testid={`dispute-row-${dispute.id}`}>
                        <TableCell>
                          <Badge variant="secondary">{dispute.kind}</Badge>
                        </TableCell>
                        <TableCell>{dispute.openedBy}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              dispute.status === 'open' ? 'destructive' :
                              dispute.status === 'resolved' ? 'default' :
                              'secondary'
                            }
                          >
                            {dispute.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-text-muted">
                          {new Date(dispute.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolveDispute(dispute)}
                            data-testid={`button-resolve-${dispute.id}`}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-text-secondary">No {disputeStatusFilter} disputes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Tools Tab */}
        <TabsContent value="moderation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Freeze Thread Card */}
            <Card className="bg-surface-card border-border-default shadow-depth1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-text-primary">
                  <Lock className="h-5 w-5 text-brand-teal" />
                  Freeze Thread
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="freeze-channel">Channel ID</Label>
                  <Input
                    id="freeze-channel"
                    value={freezeChannelId}
                    onChange={(e) => setFreezeChannelId(e.target.value)}
                    placeholder="Enter Discord channel ID"
                    data-testid="input-freeze-channel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freeze-minutes">Duration (minutes)</Label>
                  <Input
                    id="freeze-minutes"
                    type="number"
                    value={freezeMinutes}
                    onChange={(e) => setFreezeMinutes(Number(e.target.value))}
                    data-testid="input-freeze-duration"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freeze-reason">Reason (optional)</Label>
                  <Textarea
                    id="freeze-reason"
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Why are you freezing this thread?"
                    data-testid="textarea-freeze-reason"
                  />
                </div>

                <Button onClick={handleFreezeThread} className="w-full" data-testid="button-freeze-thread">
                  <Lock className="h-4 w-4 mr-2" />
                  Freeze Thread
                </Button>
              </CardContent>
            </Card>

            {/* Clarify Rule Card */}
            <Card className="bg-surface-card border-border-default shadow-depth1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-text-primary">
                  <MessageCircle className="h-5 w-5 text-brand-teal" />
                  AI Rule Clarification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clarify-channel">Channel ID</Label>
                  <Input
                    id="clarify-channel"
                    value={clarifyChannelId}
                    onChange={(e) => setClarifyChannelId(e.target.value)}
                    placeholder="Enter Discord channel ID"
                    data-testid="input-clarify-channel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clarify-question">Question</Label>
                  <Textarea
                    id="clarify-question"
                    value={clarifyQuestion}
                    onChange={(e) => setClarifyQuestion(e.target.value)}
                    placeholder="What rule needs clarification?"
                    data-testid="textarea-clarify-question"
                  />
                </div>

                <Button onClick={handleClarifyRule} className="w-full" data-testid="button-clarify-rule">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send AI Clarification
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trade Fairness Tab */}
        <TabsContent value="trade-fairness">
          <Card className="bg-surface-card border-border-default shadow-depth1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-text-primary">
                <AlertTriangle className="h-5 w-5 text-brand-teal" />
                Trade Fairness Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trade-id">Trade ID (from Sleeper)</Label>
                <Input
                  id="trade-id"
                  value={tradeId}
                  onChange={(e) => setTradeId(e.target.value)}
                  placeholder="Enter Sleeper trade ID"
                  data-testid="input-trade-id"
                />
              </div>

              <Button
                onClick={handleEvaluateTrade}
                disabled={isEvaluatingTrade}
                className="w-full"
                data-testid="button-evaluate-trade"
              >
                {isEvaluatingTrade ? 'Evaluating...' : 'Evaluate Trade'}
              </Button>

              {tradeEvaluation && (
                <div className="mt-4 p-4 bg-surface-elevated rounded-lg border border-border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Fairness Score</span>
                    <Badge variant={tradeEvaluation.fairness >= 0.7 ? 'default' : 'destructive'}>
                      {Math.round(tradeEvaluation.fairness * 100)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{tradeEvaluation.rationale}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dispute Resolution Dialog */}
      <Dialog open={isDisputeDialogOpen} onOpenChange={setIsDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dispute-status">New Status</Label>
              <Select value={disputeNewStatus} onValueChange={setDisputeNewStatus}>
                <SelectTrigger id="dispute-status" data-testid="select-dispute-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution-notes">Resolution Notes</Label>
              <Textarea
                id="resolution-notes"
                value={disputeResolutionNotes}
                onChange={(e) => setDisputeResolutionNotes(e.target.value)}
                placeholder="Enter resolution details..."
                data-testid="textarea-resolution-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDisputeDialogOpen(false)} data-testid="button-cancel-dispute">
              Cancel
            </Button>
            <Button onClick={handleSaveDisputeResolution} data-testid="button-save-dispute">
              Save Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
