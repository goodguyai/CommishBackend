import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  useFeatures, 
  useUpdateFeatures, 
  useJobs, 
  useJobHistory,
  useRunJobNow,
  useVerifyChannel,
  useReactionsStats,
  type FeatureFlags,
  type ScheduledJob,
  type JobHistoryRun
} from '@/lib/switchboardApi';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog } from '@/components/ui/Dialog';
import { Settings, Zap, Brain, Shield, Clock, Calendar, Play, History, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface FeatureToggleProps {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isPending: boolean;
}

function FeatureToggle({ name, label, description, enabled, onToggle, isPending }: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
      <div className="flex-1 pr-4">
        <Label htmlFor={name} className="text-base font-medium text-text-primary cursor-pointer">
          {label}
        </Label>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      </div>
      <Switch
        id={name}
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={isPending}
        data-testid={`switch-${name}`}
      />
    </div>
  );
}

interface JobHistoryDrawerProps {
  job: ScheduledJob;
  leagueId: string;
}

function JobHistoryDrawer({ job, leagueId }: JobHistoryDrawerProps) {
  const { data: historyData, isLoading } = useJobHistory(leagueId, job.kind);
  const history = historyData?.history || [];

  const formatDuration = (startedAt: string, finishedAt?: string) => {
    if (!finishedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const durationMs = end - start;
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-view-history-${job.id}`}>
          <History className="h-4 w-4 mr-1" />
          View History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Job History: {job.name}</SheetTitle>
          <SheetDescription>
            Last 20 runs for {job.kind}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No history available yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-sm">
                      {new Date(run.startedAt).toLocaleString()}
                      <div className="text-xs text-text-muted">
                        {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          run.status === 'SUCCESS' ? 'success' : 
                          run.status === 'FAILED' ? 'error' : 
                          'default'
                        }
                        data-testid={`badge-run-status-${run.id}`}
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {run.detail?.messageId && (
                        <code className="text-xs bg-surface-subtle px-2 py-1 rounded">
                          ID: {run.detail.messageId}
                        </code>
                      )}
                      {run.detail?.error && (
                        <div className="text-red-600 text-xs">
                          {run.detail.error}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface VerifyChannelDialogProps {
  job: ScheduledJob;
  guildId: string;
}

function VerifyChannelDialog({ job, guildId }: VerifyChannelDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: verifyData, isLoading } = useVerifyChannel(
    isOpen ? guildId : null, 
    isOpen ? job.channelId : null
  );

  const permissions = verifyData?.permissions;

  const permissionsList = [
    { key: 'installed', label: 'Bot Installed' },
    { key: 'channel_read', label: 'Read Messages' },
    { key: 'channel_write', label: 'Send Messages' },
    { key: 'embed_links', label: 'Embed Links' },
    { key: 'add_reactions', label: 'Add Reactions' },
    { key: 'mention_everyone', label: 'Mention Everyone' },
  ];

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        data-testid={`button-verify-channel-${job.id}`}
      >
        <CheckCircle2 className="h-4 w-4 mr-1" />
        Verify
      </Button>
      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        title="Channel Permissions"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Verifying permissions for {job.channelName || job.channelId}
          </p>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : permissions ? (
            <div className="space-y-3">
              {permissionsList.map((perm) => {
                const hasPermission = permissions[perm.key as keyof typeof permissions];
                return (
                  <div key={perm.key} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <span className="text-sm font-medium">{perm.label}</span>
                    {hasPermission ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                );
              })}
              {Object.values(permissions).some(val => !val) && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    ⚠️ Missing permissions detected
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Please ensure the bot has all required permissions in this channel.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-text-secondary">
              Failed to fetch permissions. Please try again.
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}

interface JobRowProps {
  job: ScheduledJob;
  leagueId: string;
  guildId: string;
  onRunNow: (jobId: string) => void;
  isRunning: boolean;
}

function JobRow({ job, leagueId, guildId, onRunNow, isRunning }: JobRowProps) {
  const { data: historyData } = useJobHistory(leagueId, job.kind);
  const latestRun = historyData?.history?.[0];

  return (
    <TableRow data-testid={`row-job-${job.id}`}>
      <TableCell className="font-medium">{job.kind}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-muted" />
          {job.channelName || job.channelId}
        </div>
      </TableCell>
      <TableCell className="text-text-secondary text-sm">
        {job.nextRun ? new Date(job.nextRun).toLocaleString() : '-'}
      </TableCell>
      <TableCell>
        <Badge 
          variant={job.enabled ? 'success' : 'default'}
          data-testid={`text-job-status-${job.id}`}
        >
          {job.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </TableCell>
      <TableCell>
        {latestRun ? (
          <Badge 
            variant={
              latestRun.status === 'SUCCESS' ? 'success' : 
              latestRun.status === 'FAILED' ? 'error' : 
              'default'
            }
          >
            {latestRun.status}
          </Badge>
        ) : (
          <span className="text-text-muted text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRunNow(job.id)}
            disabled={isRunning}
            data-testid={`button-run-now-${job.id}`}
          >
            <Play className="h-4 w-4 mr-1" />
            {isRunning ? 'Running...' : 'Run Now'}
          </Button>
          <JobHistoryDrawer job={job} leagueId={leagueId} />
          <VerifyChannelDialog job={job} guildId={guildId} />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function Switchboard() {
  const { selectedLeagueId } = useAppStore();
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  // Queries and mutations
  const { data: featuresData, isLoading: featuresLoading } = useFeatures(selectedLeagueId);
  const { data: jobsData, isLoading: jobsLoading } = useJobs(selectedLeagueId);
  const { data: reactionsStatsData } = useReactionsStats(selectedLeagueId);
  const updateFeaturesMutation = useUpdateFeatures();
  const runJobNowMutation = useRunJobNow();

  const features = featuresData?.features || {
    onboarding: true,
    reactions: false,
    announcements: false,
    weeklyRecaps: true,
    ruleQA: true,
    moderation: false,
  };

  const jobs = jobsData?.jobs || [];
  const reactionsCount = reactionsStatsData?.count || 0;

  const handleFeatureToggle = async (featureName: keyof FeatureFlags, enabled: boolean) => {
    if (!selectedLeagueId) return;

    try {
      await updateFeaturesMutation.mutateAsync({
        leagueId: selectedLeagueId,
        features: { [featureName]: enabled },
      });
      toast.success('Feature updated', {
        description: `${featureName} has been ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      toast.error('Update failed', {
        description: error?.message || 'Failed to update feature',
      });
    }
  };

  const handleRunNow = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      const result = await runJobNowMutation.mutateAsync({ jobId });
      if (result.ok) {
        toast.success('Job executed successfully', {
          description: result.messageId ? `Message ID: ${result.messageId}` : 'Job completed',
        });
      } else {
        toast.error('Job execution failed', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error: any) {
      toast.error('Job execution failed', {
        description: error?.message || 'Failed to run job',
      });
    } finally {
      setRunningJobId(null);
    }
  };

  if (featuresLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Switchboard</h1>
        <p className="text-text-secondary mt-1">Control feature toggles and scheduled jobs</p>
      </div>

      {/* Reactions Stats Card */}
      {reactionsCount > 0 && (
        <Card className="bg-gradient-to-r from-brand-teal/10 to-brand-coral/10 border-brand-teal/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-brand-teal" />
              <div>
                <p className="text-2xl font-bold text-text-primary">{reactionsCount}</p>
                <p className="text-sm text-text-secondary">Reactions in last 24 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Toggles */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Engagement Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-teal" />
              Engagement
            </CardTitle>
            <CardDescription>User interaction and onboarding features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <FeatureToggle
              name="onboarding"
              label="Onboarding"
              description="Welcome messages for new members"
              enabled={features.onboarding}
              onToggle={(enabled) => handleFeatureToggle('onboarding', enabled)}
              isPending={updateFeaturesMutation.isPending}
            />
            <FeatureToggle
              name="reactions"
              label="Reactions"
              description="AI-powered message reactions"
              enabled={features.reactions}
              onToggle={(enabled) => handleFeatureToggle('reactions', enabled)}
              isPending={updateFeaturesMutation.isPending}
            />
            <FeatureToggle
              name="announcements"
              label="Announcements"
              description="Automated league announcements"
              enabled={features.announcements}
              onToggle={(enabled) => handleFeatureToggle('announcements', enabled)}
              isPending={updateFeaturesMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* AI Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-brand-teal" />
              AI Features
            </CardTitle>
            <CardDescription>AI-powered insights and assistance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <FeatureToggle
              name="weeklyRecaps"
              label="Weekly Recaps"
              description="AI-generated weekly summaries"
              enabled={features.weeklyRecaps}
              onToggle={(enabled) => handleFeatureToggle('weeklyRecaps', enabled)}
              isPending={updateFeaturesMutation.isPending}
            />
            <FeatureToggle
              name="ruleQA"
              label="Rule Q&A"
              description="Answer questions about league rules"
              enabled={features.ruleQA}
              onToggle={(enabled) => handleFeatureToggle('ruleQA', enabled)}
              isPending={updateFeaturesMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Moderation Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-teal" />
              Moderation
            </CardTitle>
            <CardDescription>Content moderation and safety</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <FeatureToggle
              name="moderation"
              label="Auto-Moderation"
              description="Automated content moderation"
              enabled={features.moderation}
              onToggle={(enabled) => handleFeatureToggle('moderation', enabled)}
              isPending={updateFeaturesMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Automations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-teal" />
            Automations
          </CardTitle>
          <CardDescription>
            Scheduled jobs and automated tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No scheduled jobs configured yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Last Result</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <JobRow 
                      key={job.id} 
                      job={job} 
                      leagueId={selectedLeagueId || ''} 
                      guildId={job.leagueId}
                      onRunNow={handleRunNow}
                      isRunning={runningJobId === job.id}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
