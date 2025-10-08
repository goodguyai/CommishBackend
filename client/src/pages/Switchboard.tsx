import { useAppStore } from '@/store/useAppStore';
import { useFeatures, useUpdateFeatures, useJobs, type FeatureFlags } from '@/lib/switchboardApi';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Settings, Zap, Brain, Shield, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

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

export function Switchboard() {
  const { selectedLeagueId } = useAppStore();

  // Queries and mutations
  const { data: featuresData, isLoading: featuresLoading } = useFeatures(selectedLeagueId);
  const { data: jobsData, isLoading: jobsLoading } = useJobs(selectedLeagueId);
  const updateFeaturesMutation = useUpdateFeatures();

  const features = featuresData?.features || {
    onboarding: true,
    reactions: false,
    announcements: false,
    weeklyRecaps: true,
    ruleQA: true,
    moderation: false,
  };

  const jobs = jobsData?.jobs || [];

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

      {/* Scheduled Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-teal" />
            Scheduled Jobs
          </CardTitle>
          <CardDescription>
            Automated tasks and recurring jobs (Read-only for now - Job editing coming in Phase 4)
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} data-testid={`job-${job.id}`}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-surface-subtle px-2 py-1 rounded">
                        {job.schedule}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-text-muted" />
                        {job.channelName || job.channelId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={job.enabled ? 'success' : 'default'}
                        data-testid={`badge-job-status-${job.id}`}
                      >
                        {job.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {job.nextRun ? new Date(job.nextRun).toLocaleString() : '-'}
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
