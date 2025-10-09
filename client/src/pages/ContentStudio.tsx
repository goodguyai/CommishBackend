import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Label } from '@/components/ui/label';
import { 
  Zap, 
  Trophy,
  Swords,
  Calendar,
  RefreshCw,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAppStore } from '@/store/useAppStore';

interface Highlight {
  id: string;
  leagueId: string;
  week: number;
  kind: 'comeback' | 'blowout' | 'bench_tragedy' | 'top_scorer';
  payload: any;
  createdAt: string;
}

interface Rivalry {
  id: string;
  leagueId: string;
  teamA: string;
  teamB: string;
  aWins: number;
  bWins: number;
  lastMeetingWeek: number | null;
  meta: any;
}

interface ContentQueueItem {
  id: string;
  leagueId: string;
  channelId: string;
  scheduledAt: string;
  template: 'digest' | 'highlight' | 'meme' | 'rivalry';
  status: 'queued' | 'posted' | 'skipped';
  payload: any;
  postedMessageId: string | null;
  createdAt: string;
}

export function ContentStudioPage() {
  const { selectedLeagueId } = useAppStore();

  // Highlights State
  const [highlightsWeek, setHighlightsWeek] = useState<number>(1);

  // Content Queue State
  const [contentQueueStatusFilter, setContentQueueStatusFilter] = useState<string>('all');

  // Highlights Query
  const { data: highlightsData, isLoading: highlightsLoading, refetch: refetchHighlights } = useQuery<{ highlights: Highlight[] }>({
    queryKey: ['/api/v2/highlights', selectedLeagueId, highlightsWeek],
    queryFn: async () => {
      const res = await fetch(`/api/v2/highlights?leagueId=${selectedLeagueId}&week=${highlightsWeek}`);
      if (!res.ok) throw new Error('Failed to fetch highlights');
      return res.json();
    },
    enabled: !!selectedLeagueId && highlightsWeek > 0,
  });

  // Compute Highlights Mutation
  const computeHighlightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v2/highlights/compute', {
        leagueId: selectedLeagueId,
        week: highlightsWeek,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/highlights', selectedLeagueId, highlightsWeek] });
      refetchHighlights();
      toast.success('Highlights computed', {
        description: `Highlights for week ${highlightsWeek} have been generated`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to compute highlights', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Rivalries Query
  const { data: rivalriesData, isLoading: rivalriesLoading } = useQuery<{ rivalries: Rivalry[] }>({
    queryKey: ['/api/v2/rivalries', selectedLeagueId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/rivalries?leagueId=${selectedLeagueId}`);
      if (!res.ok) throw new Error('Failed to fetch rivalries');
      return res.json();
    },
    enabled: !!selectedLeagueId,
  });

  // Update Rivalries Mutation
  const updateRivalriesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v2/rivalries/update', {
        leagueId: selectedLeagueId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/rivalries', selectedLeagueId] });
      toast.success('Rivalries updated', {
        description: 'Rivalry records have been refreshed',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update rivalries', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Content Queue Query
  const { data: contentQueueData, isLoading: contentQueueLoading } = useQuery<{ queue: ContentQueueItem[] }>({
    queryKey: ['/api/v2/content/queue', selectedLeagueId, contentQueueStatusFilter],
    queryFn: async () => {
      const statusParam = contentQueueStatusFilter !== 'all' ? `&status=${contentQueueStatusFilter}` : '';
      const res = await fetch(`/api/v2/content/queue?leagueId=${selectedLeagueId}${statusParam}`);
      if (!res.ok) throw new Error('Failed to fetch content queue');
      return res.json();
    },
    enabled: !!selectedLeagueId,
  });

  // Re-enqueue Content Mutation
  const reenqueueContentMutation = useMutation({
    mutationFn: async (item: ContentQueueItem) => {
      const response = await apiRequest('POST', '/api/v2/content/enqueue', {
        leagueId: item.leagueId,
        channelId: item.channelId,
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        template: item.template,
        payload: item.payload,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/content/queue', selectedLeagueId, contentQueueStatusFilter] });
      toast.success('Content re-enqueued', {
        description: 'Content has been added back to the queue',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to re-enqueue content', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  const isLoading = highlightsLoading || rivalriesLoading || contentQueueLoading;

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-text-primary" data-testid="content-studio-title">
            Content Studio
          </h1>
          <p className="text-text-secondary mt-1">
            Manage highlights, rivalries, and content queue
          </p>
        </div>
      </div>

      <Tabs defaultValue="highlights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="highlights" data-testid="tab-highlights">
            <Trophy className="h-4 w-4 mr-2" />
            Highlights
          </TabsTrigger>
          <TabsTrigger value="rivalries" data-testid="tab-rivalries">
            <Swords className="h-4 w-4 mr-2" />
            Rivalries
          </TabsTrigger>
          <TabsTrigger value="queue" data-testid="tab-queue">
            <Calendar className="h-4 w-4 mr-2" />
            Content Queue
          </TabsTrigger>
        </TabsList>

        {/* Highlights Tab */}
        <TabsContent value="highlights">
          <Card className="bg-surface-card border-border-default shadow-depth1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-text-primary">
                  <Trophy className="h-5 w-5 text-brand-teal" />
                  Weekly Highlights
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="week-select">Week:</Label>
                  <Input
                    id="week-select"
                    type="number"
                    value={highlightsWeek}
                    onChange={(e) => setHighlightsWeek(Number(e.target.value))}
                    className="w-20"
                    min={1}
                    max={18}
                    data-testid="input-highlights-week"
                  />
                  <Button
                    onClick={() => computeHighlightsMutation.mutate()}
                    disabled={computeHighlightsMutation.isPending}
                    data-testid="button-compute-highlights"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {computeHighlightsMutation.isPending ? 'Computing...' : 'Compute'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {highlightsData?.highlights && highlightsData.highlights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {highlightsData.highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="p-4 bg-surface-elevated rounded-lg border border-border-default"
                      data-testid={`highlight-${highlight.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">{highlight.kind}</Badge>
                        <span className="text-xs text-text-muted">Week {highlight.week}</span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {JSON.stringify(highlight.payload)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary">No highlights for week {highlightsWeek}</p>
                  <Button
                    onClick={() => computeHighlightsMutation.mutate()}
                    className="mt-4"
                    data-testid="button-compute-first-highlights"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Compute Highlights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rivalries Tab */}
        <TabsContent value="rivalries">
          <Card className="bg-surface-card border-border-default shadow-depth1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-text-primary">
                  <Swords className="h-5 w-5 text-brand-teal" />
                  League Rivalries
                </CardTitle>
                <Button onClick={() => updateRivalriesMutation.mutate()} data-testid="button-update-rivalries">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Rivalries
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rivalriesData?.rivalries && rivalriesData.rivalries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team A</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Team B</TableHead>
                      <TableHead>Last Meeting</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rivalriesData.rivalries.map((rivalry) => (
                      <TableRow key={rivalry.id} data-testid={`rivalry-row-${rivalry.id}`}>
                        <TableCell className="font-medium">{rivalry.teamA}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {rivalry.aWins} - {rivalry.bWins}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{rivalry.teamB}</TableCell>
                        <TableCell className="text-sm text-text-muted">
                          {rivalry.lastMeetingWeek ? `Week ${rivalry.lastMeetingWeek}` : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Swords className="h-12 w-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary">No rivalries tracked yet</p>
                  <Button
                    onClick={() => updateRivalriesMutation.mutate()}
                    className="mt-4"
                    data-testid="button-create-rivalries"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Create Rivalries
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Queue Tab */}
        <TabsContent value="queue">
          <Card className="bg-surface-card border-border-default shadow-depth1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-text-primary">
                  <Calendar className="h-5 w-5 text-brand-teal" />
                  Content Queue
                </CardTitle>
                <Select value={contentQueueStatusFilter} onValueChange={setContentQueueStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-queue-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {contentQueueData?.queue && contentQueueData.queue.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contentQueueData.queue.map((item) => (
                      <TableRow key={item.id} data-testid={`queue-row-${item.id}`}>
                        <TableCell>
                          <Badge variant="secondary">{item.template}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.channelId}</TableCell>
                        <TableCell className="text-sm text-text-muted">
                          {new Date(item.scheduledAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              item.status === 'posted' ? 'default' :
                              item.status === 'queued' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {item.status === 'posted' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {item.status === 'queued' && <Clock className="h-3 w-3 mr-1" />}
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status === 'skipped' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reenqueueContentMutation.mutate(item)}
                              data-testid={`button-reenqueue-${item.id}`}
                            >
                              Re-enqueue
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary">No content in queue</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
