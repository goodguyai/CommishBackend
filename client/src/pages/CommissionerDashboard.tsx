import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Settings, 
  Activity,
  Calendar,
  Database,
  Clock,
  TrendingUp,
  Users,
  Trophy
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface SleeperStatus {
  ok: boolean;
  integration: {
    leagueId: string;
    sleeperLeagueId: string;
    season: string;
    sport: string;
    username?: string;
  };
  lastSync: string | null;
  health: 'healthy' | 'stale' | 'outdated';
  etag?: string;
}

interface ReportData {
  ok: boolean;
  markdown: string;
}

interface ConstitutionRenderResult {
  ok: boolean;
  sections: number;
  indexed: number;
  errors?: any[];
  summary?: string;
}

interface ConstitutionSection {
  id: string;
  leagueId: string;
  slug: string;
  contentMd: string;
  renderedAt: string;
}

interface LeagueSettings {
  ok: boolean;
  base: any;
  overrides: any;
  merged: any;
}

export function CommissionerDashboard() {
  // Get leagueId from localStorage
  const [leagueId, setLeagueId] = useState<string>(() => {
    return localStorage.getItem('selectedLeagueId') || '';
  });

  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [currentSeason, setCurrentSeason] = useState<string>(new Date().getFullYear().toString());

  // Fetch leagues to get the first one if not set
  const { data: leaguesData } = useQuery<{ leagues: any[] }>({
    queryKey: ['/api/demo/leagues'],
    enabled: !leagueId,
  });

  // Set leagueId from first league if available
  useEffect(() => {
    if (!leagueId && leaguesData?.leagues && leaguesData.leagues.length > 0) {
      const firstLeagueId = leaguesData.leagues[0].id;
      setLeagueId(firstLeagueId);
      localStorage.setItem('selectedLeagueId', firstLeagueId);
    }
  }, [leaguesData, leagueId]);

  // ==================== Sleeper Integration Section ====================
  
  const { 
    data: sleeperStatus, 
    isLoading: sleeperStatusLoading,
    error: sleeperStatusError,
    refetch: refetchSleeperStatus
  } = useQuery<SleeperStatus>({
    queryKey: ['/api/v2/sleeper', leagueId, 'status'],
    enabled: !!leagueId,
  });

  const syncSleeperMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/v2/sleeper/${leagueId}/sync`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/sleeper', leagueId, 'status'] });
      refetchSleeperStatus();
      toast.success('Sleeper sync completed', {
        description: 'League data has been updated',
      });
    },
    onError: (error: any) => {
      toast.error('Sync failed', {
        description: error?.message || 'Failed to sync Sleeper data',
      });
    },
  });

  // ==================== Reports Overview Section ====================

  const { 
    data: weeklyRecap, 
    isLoading: weeklyRecapLoading 
  } = useQuery<ReportData>({
    queryKey: ['/api/v2/reports', leagueId, 'weekly', currentWeek.toString()],
    enabled: !!leagueId && currentWeek > 0,
  });

  const { 
    data: waiversReport, 
    isLoading: waiversReportLoading 
  } = useQuery<ReportData>({
    queryKey: ['/api/v2/reports', leagueId, 'waivers', currentWeek.toString()],
    enabled: !!leagueId && currentWeek > 0,
  });

  const { 
    data: tradesDigest, 
    isLoading: tradesDigestLoading 
  } = useQuery<ReportData>({
    queryKey: ['/api/v2/reports', leagueId, 'trades'],
    enabled: !!leagueId,
  });

  const { 
    data: standingsReport, 
    isLoading: standingsReportLoading 
  } = useQuery<ReportData>({
    queryKey: ['/api/v2/reports', leagueId, 'standings', currentSeason],
    enabled: !!leagueId && !!currentSeason,
  });

  // ==================== Constitution Status Section ====================

  const { 
    data: constitutionSections, 
    isLoading: constitutionLoading,
    refetch: refetchConstitution
  } = useQuery<{ ok: boolean; sections: ConstitutionSection[] }>({
    queryKey: ['/api/v2/constitution', leagueId, 'sections'],
    enabled: !!leagueId,
  });

  const renderConstitutionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/v2/constitution/${leagueId}/render`, undefined);
      return response.json() as Promise<ConstitutionRenderResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/constitution', leagueId, 'sections'] });
      refetchConstitution();
      toast.success('Constitution rendered', {
        description: `${data.sections} sections rendered, ${data.indexed} indexed`,
      });
    },
    onError: (error: any) => {
      toast.error('Render failed', {
        description: error?.message || 'Failed to render constitution',
      });
    },
  });

  // ==================== League Settings Overview Section ====================

  const { 
    data: leagueSettings, 
    isLoading: settingsLoading 
  } = useQuery<LeagueSettings>({
    queryKey: ['/api/v2/settings', leagueId],
    enabled: !!leagueId,
  });

  // ==================== Helper Functions ====================

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge data-testid="badge-health-healthy" className="bg-green-600 text-white">Healthy</Badge>;
      case 'stale':
        return <Badge data-testid="badge-health-stale" className="bg-yellow-600 text-white">Stale</Badge>;
      case 'outdated':
        return <Badge data-testid="badge-health-outdated" className="bg-red-600 text-white">Outdated</Badge>;
      default:
        return <Badge data-testid="badge-health-unknown" className="bg-gray-600 text-white">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getMarkdownPreview = (markdown: string, maxLines: number = 3) => {
    const lines = markdown.split('\n').filter(line => line.trim());
    return lines.slice(0, maxLines).join('\n');
  };

  const hasOverrides = (settings: LeagueSettings | undefined) => {
    if (!settings?.overrides) return false;
    return Object.keys(settings.overrides).length > 0;
  };

  if (!leagueId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="font-semibold">No league selected</p>
            <p className="text-sm text-muted-foreground">Please select a league to view the commissioner dashboard.</p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white" data-testid="heading-commissioner-dashboard">
            Commissioner Control Center
          </h1>
          <p className="text-text-secondary dark:text-gray-400 mt-1">
            Manage your league integrations, reports, and settings
          </p>
        </div>
      </div>

      {/* Sleeper Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sleeper Integration
          </CardTitle>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Monitor and sync your Sleeper league data</p>
        </CardHeader>
        <CardContent>
          {sleeperStatusLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" data-testid="skeleton-sleeper-status" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : sleeperStatusError ? (
            <Alert variant="destructive" data-testid="alert-sleeper-error">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-semibold">Error loading Sleeper status</p>
                <p className="text-sm">{(sleeperStatusError as Error).message}</p>
              </div>
            </Alert>
          ) : sleeperStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary dark:text-gray-400">Last Sync</p>
                  <p className="font-medium text-text-primary dark:text-white" data-testid="text-last-sync">
                    {formatTimestamp(sleeperStatus.lastSync)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary dark:text-gray-400">Sync Health</p>
                  <div data-testid="badge-sync-health">
                    {getHealthBadge(sleeperStatus.health)}
                  </div>
                </div>
                {sleeperStatus.etag && (
                  <div className="space-y-1">
                    <p className="text-sm text-text-secondary dark:text-gray-400">ETag Cache</p>
                    <p className="font-mono text-xs text-text-primary dark:text-white truncate" data-testid="text-etag">
                      {sleeperStatus.etag.substring(0, 16)}...
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pt-2">
                <Button
                  onClick={() => syncSleeperMutation.mutate()}
                  disabled={syncSleeperMutation.isPending}
                  data-testid="button-sync-sleeper"
                >
                  {syncSleeperMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Season: {sleeperStatus.integration.season} • Sport: {sleeperStatus.integration.sport.toUpperCase()}
                </p>
              </div>
            </div>
          ) : (
            <Alert data-testid="alert-sleeper-not-linked">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-semibold">Sleeper not linked</p>
                <p className="text-sm">Connect your Sleeper league to enable sync features.</p>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Reports Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports Overview
          </CardTitle>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Latest reports and analytics for your league</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Recap */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Weekly Recap
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyRecapLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" data-testid="skeleton-weekly-recap" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                ) : weeklyRecap?.markdown ? (
                  <div className="space-y-3">
                    <pre className="text-xs text-text-secondary dark:text-gray-400 whitespace-pre-wrap line-clamp-3" data-testid="preview-weekly-recap">
                      {getMarkdownPreview(weeklyRecap.markdown)}
                    </pre>
                    <Button variant="outline" size="sm" data-testid="button-view-weekly-recap">
                      View Full Report
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary dark:text-gray-400" data-testid="text-no-weekly-recap">
                    No data available for week {currentWeek}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Waivers Report */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Waivers Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {waiversReportLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" data-testid="skeleton-waivers-report" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                ) : waiversReport?.markdown ? (
                  <div className="space-y-3">
                    <pre className="text-xs text-text-secondary dark:text-gray-400 whitespace-pre-wrap line-clamp-3" data-testid="preview-waivers-report">
                      {getMarkdownPreview(waiversReport.markdown)}
                    </pre>
                    <Button variant="outline" size="sm" data-testid="button-view-waivers-report">
                      View Full Report
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary dark:text-gray-400" data-testid="text-no-waivers-report">
                    No waiver activity for week {currentWeek}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Trades Digest */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trades Digest
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tradesDigestLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" data-testid="skeleton-trades-digest" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                ) : tradesDigest?.markdown ? (
                  <div className="space-y-3">
                    <pre className="text-xs text-text-secondary dark:text-gray-400 whitespace-pre-wrap line-clamp-3" data-testid="preview-trades-digest">
                      {getMarkdownPreview(tradesDigest.markdown)}
                    </pre>
                    <Button variant="outline" size="sm" data-testid="button-view-trades-digest">
                      View Full Report
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary dark:text-gray-400" data-testid="text-no-trades-digest">
                    No trades this season
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Standings Report */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Standings Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {standingsReportLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" data-testid="skeleton-standings-report" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                ) : standingsReport?.markdown ? (
                  <div className="space-y-3">
                    <pre className="text-xs text-text-secondary dark:text-gray-400 whitespace-pre-wrap line-clamp-3" data-testid="preview-standings-report">
                      {getMarkdownPreview(standingsReport.markdown)}
                    </pre>
                    <Button variant="outline" size="sm" data-testid="button-view-standings-report">
                      View Full Report
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary dark:text-gray-400" data-testid="text-no-standings-report">
                    No standings data for {currentSeason}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Constitution Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Constitution Status
          </CardTitle>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">Manage your league constitution templates</p>
        </CardHeader>
        <CardContent>
          {constitutionLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" data-testid="skeleton-constitution-status" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-40" />
            </div>
          ) : constitutionSections?.sections && constitutionSections.sections.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary dark:text-gray-400">Last Rendered</p>
                  <p className="font-medium text-text-primary dark:text-white" data-testid="text-last-rendered">
                    {formatTimestamp(constitutionSections.sections[0].renderedAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary dark:text-gray-400">Active Sections</p>
                  <p className="font-medium text-text-primary dark:text-white" data-testid="text-active-sections">
                    {constitutionSections.sections.length} sections
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <Button
                  onClick={() => renderConstitutionMutation.mutate()}
                  disabled={renderConstitutionMutation.isPending}
                  data-testid="button-render-constitution"
                >
                  {renderConstitutionMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Rendering...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Re-render Constitution
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert data-testid="alert-no-constitution">
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="font-semibold">No constitution rendered</p>
                  <p className="text-sm">Render your constitution to make it available for queries.</p>
                </div>
              </Alert>
              <Button
                onClick={() => renderConstitutionMutation.mutate()}
                disabled={renderConstitutionMutation.isPending}
                data-testid="button-render-constitution-first"
              >
                {renderConstitutionMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Rendering...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Render Constitution
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* League Settings Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            League Settings
          </CardTitle>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">View and manage league configuration</p>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" data-testid="skeleton-league-settings" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : leagueSettings ? (
            <div className="space-y-4">
              {/* Commissioner Overrides Status */}
              {hasOverrides(leagueSettings) && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md" data-testid="alert-overrides-active">
                  <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Commissioner overrides are active
                  </p>
                </div>
              )}

              {/* Settings Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary dark:text-gray-400">Scoring</p>
                  <p className="text-xs text-text-primary dark:text-white" data-testid="text-scoring-settings">
                    {leagueSettings.merged?.scoring ? 
                      `${Object.keys(leagueSettings.merged.scoring).length} rules configured` : 
                      'Not configured'
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary dark:text-gray-400">Roster</p>
                  <p className="text-xs text-text-primary dark:text-white" data-testid="text-roster-settings">
                    {leagueSettings.merged?.roster ? 
                      `${Object.keys(leagueSettings.merged.roster).length} positions` : 
                      'Not configured'
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary dark:text-gray-400">Playoffs</p>
                  <p className="text-xs text-text-primary dark:text-white" data-testid="text-playoffs-settings">
                    {leagueSettings.merged?.playoffs ? 
                      'Configured' : 
                      'Not configured'
                    }
                  </p>
                </div>
              </div>

              {/* Link to Settings Page */}
              <div className="pt-2">
                <Button variant="outline" data-testid="button-manage-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Settings
                </Button>
              </div>
            </div>
          ) : (
            <Alert data-testid="alert-no-settings">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-semibold">No settings available</p>
                <p className="text-sm">Sync your Sleeper league to load settings.</p>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
