import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Link } from 'wouter';
import { 
  Bell, 
  Calendar,
  Activity,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Zap,
  Database,
  Brain,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { FinishSetupBanner } from '@/components/FinishSetupBanner';
import type { Member, Reminder, League } from '@shared/schema';

interface Dispute {
  id: string;
  leagueId: string;
  kind: 'trade' | 'rule' | 'behavior';
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface Highlight {
  id: string;
  leagueId: string;
  week: number;
  kind: 'comeback' | 'blowout' | 'bench_tragedy' | 'top_scorer';
  createdAt: string;
}

export function DashboardPage() {
  const { selectedLeagueId } = useAppStore();

  // Fetch current league data
  const { data: leagueData, isLoading: leagueLoading } = useQuery<{ league: League }>({
    queryKey: ['/api/leagues', selectedLeagueId],
    enabled: !!selectedLeagueId,
  });

  // Today's Data
  const { data: remindersData, isLoading: remindersLoading } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ['/api/leagues', selectedLeagueId, 'reminders'],
    enabled: !!selectedLeagueId,
  });

  const { data: statsResp, isLoading: statsLoading } = useQuery<{ ok: boolean; stats: { rulesDocs: number; activityLast24h: number; ownersCount: number } }>({
    queryKey: ['/api/v2/dashboard', selectedLeagueId, 'stats'],
    enabled: !!selectedLeagueId,
  });

  const { data: disputesData, isLoading: disputesLoading } = useQuery<{ disputes: Dispute[] }>({
    queryKey: ['/api/v2/disputes', selectedLeagueId, 'open'],
    queryFn: async () => {
      const res = await fetch(`/api/v2/disputes?leagueId=${selectedLeagueId}&status=open`);
      if (!res.ok) throw new Error('Failed to fetch disputes');
      return res.json();
    },
    enabled: !!selectedLeagueId,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery<{ members: Member[] }>({
    queryKey: ['/api/leagues', selectedLeagueId, 'members'],
    enabled: !!selectedLeagueId,
  });

  // This Week's Data
  const { data: highlightsData, isLoading: highlightsLoading } = useQuery<{ highlights: Highlight[] }>({
    queryKey: ['/api/v2/highlights', selectedLeagueId, 'current'],
    queryFn: async () => {
      const res = await fetch(`/api/v2/highlights?leagueId=${selectedLeagueId}`);
      if (!res.ok) throw new Error('Failed to fetch highlights');
      return res.json();
    },
    enabled: !!selectedLeagueId,
  });

  // Health Data
  const { data: discord, isLoading: discordLoading } = useQuery<{ botName: string; server: string; online: boolean }>({
    queryKey: ['/api/integrations/discord'],
  });

  const { data: sleeperData, isLoading: sleeperLoading } = useQuery<{
    ok: boolean;
    integration: {
      leagueId: string;
      sleeperLeagueId: string;
      season: string;
      sport: string;
    } | null;
  }>({
    queryKey: ['/api/v2/sleeper/integration', selectedLeagueId],
    enabled: !!selectedLeagueId,
  });

  const { data: ragResp, isLoading: ragLoading } = useQuery<{ ok: boolean; rag: { indexed: boolean; embeddedCount: number } }>({
    queryKey: ['/api/v2/dashboard', selectedLeagueId, 'rag'],
    enabled: !!selectedLeagueId,
  });

  const { data: ai, isLoading: aiLoading } = useQuery<{ model: string; requestsToday: number }>({
    queryKey: ['/api/ai/status'],
  });

  // Calculate Today tile metrics
  const todayReminders = remindersData?.reminders?.filter(r => {
    if (!r.enabled) return false;
    // Check if reminder is due today (simplified - would need proper cron parsing)
    return true;
  }).slice(0, 1) || [];

  const pendingAnnouncements = statsResp?.stats?.activityLast24h || 0;
  const unresolvedDisputes = disputesData?.disputes?.filter(d => {
    const createdToday = new Date(d.createdAt).toDateString() === new Date().toDateString();
    return d.status === 'open' && createdToday;
  }).length || 0;

  const ownerMappingGaps = membersData?.members ? 
    Math.max(0, 10 - membersData.members.length) : 0; // Assuming 10 team league

  // Calculate This Week tile metrics
  const autoDigestEnabled = leagueData?.league?.featureFlags && 
    (leagueData.league.featureFlags as any)?.autoDigest === true;
  
  const upcomingDeadlines = remindersData?.reminders?.filter(r => 
    r.enabled && (r.type === 'waivers' || r.type === 'trade_deadline')
  ).length || 0;

  const highlightsInProgress = highlightsData?.highlights?.length || 0;

  // Calculate Health tile metrics
  const discordStatus = discord?.online ? 'healthy' : 'down';
  const sleeperStatus = sleeperData?.integration ? 'healthy' : 'not_configured';
  const ragStatus = ragResp?.rag?.indexed ? 'healthy' : 'not_configured';
  const aiStatus = ai?.requestsToday !== undefined ? 'healthy' : 'down';

  const healthyCount = [
    discordStatus === 'healthy',
    sleeperStatus === 'healthy',
    ragStatus === 'healthy',
    aiStatus === 'healthy',
  ].filter(Boolean).length;

  const healthScore = Math.round((healthyCount / 4) * 100);
  const healthColor = healthScore >= 75 ? 'text-green-500' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-500';

  const isLoading = leagueLoading || remindersLoading || statsLoading || 
    disputesLoading || membersLoading || highlightsLoading || 
    discordLoading || sleeperLoading || ragLoading || aiLoading;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary" data-testid="dashboard-title">
            Commissioner Dashboard
          </h1>
          <p className="text-text-secondary mt-1">
            Your league overview and quick actions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tile 1 - Today */}
        <Card className="bg-surface-card border-border-default shadow-depth1" data-testid="tile-today">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Bell className="h-5 w-5 text-brand-teal" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between" data-testid="today-reminders">
                <span className="text-sm text-text-secondary">Next Reminder</span>
                <Badge variant="default" className="text-xs">
                  {todayReminders.length > 0 ? todayReminders[0].type : 'None'}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="today-announcements">
                <span className="text-sm text-text-secondary">Pending Announcements</span>
                <Badge variant={pendingAnnouncements > 0 ? 'warning' : 'default'} className="text-xs">
                  {pendingAnnouncements}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="today-disputes">
                <span className="text-sm text-text-secondary">Unresolved Disputes</span>
                <Badge variant={unresolvedDisputes > 0 ? 'error' : 'default'} className="text-xs">
                  {unresolvedDisputes}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="today-mapping-gaps">
                <span className="text-sm text-text-secondary">Owner Mapping Gaps</span>
                <Badge variant={ownerMappingGaps > 0 ? 'error' : 'success'} className="text-xs flex items-center gap-1">
                  {ownerMappingGaps > 0 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                  {ownerMappingGaps}
                </Badge>
              </div>
            </div>

            <Link href="/app/reminders">
              <Button className="w-full" variant="default" data-testid="button-manage-today">
                <Calendar className="h-4 w-4 mr-2" />
                Manage Today's Tasks
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tile 2 - This Week */}
        <Card className="bg-surface-card border-border-default shadow-depth1" data-testid="tile-week">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Calendar className="h-5 w-5 text-brand-teal" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between" data-testid="week-digest">
                <span className="text-sm text-text-secondary">Weekly Digest</span>
                <Badge variant={autoDigestEnabled ? 'success' : 'default'} className="text-xs">
                  {autoDigestEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="week-deadlines">
                <span className="text-sm text-text-secondary">Upcoming Deadlines</span>
                <Badge variant={upcomingDeadlines > 0 ? 'warning' : 'default'} className="text-xs">
                  {upcomingDeadlines}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="week-highlights">
                <span className="text-sm text-text-secondary">Highlights in Progress</span>
                <Badge variant={highlightsInProgress > 0 ? 'success' : 'default'} className="text-xs">
                  {highlightsInProgress}
                </Badge>
              </div>
            </div>

            <Link href="/app/content-studio">
              <Button className="w-full" variant="default" data-testid="button-weekly-schedule">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Weekly Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tile 3 - Health */}
        <Card className="bg-surface-card border-border-default shadow-depth1" data-testid="tile-health">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Activity className="h-5 w-5 text-brand-teal" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between" data-testid="health-discord">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">Discord</span>
                </div>
                <Badge variant={discordStatus === 'healthy' ? 'success' : 'error'} className="text-xs">
                  {discordStatus === 'healthy' ? 'Online' : 'Offline'}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="health-sleeper">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">Sleeper</span>
                </div>
                <Badge variant={sleeperStatus === 'healthy' ? 'success' : 'default'} className="text-xs">
                  {sleeperStatus === 'healthy' ? 'Connected' : 'Not Setup'}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="health-rag">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">RAG System</span>
                </div>
                <Badge variant={ragStatus === 'healthy' ? 'success' : 'default'} className="text-xs">
                  {ragStatus === 'healthy' ? 'Indexed' : 'Not Setup'}
                </Badge>
              </div>

              <div className="flex items-center justify-between" data-testid="health-ai">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">AI Assistant</span>
                </div>
                <Badge variant={aiStatus === 'healthy' ? 'success' : 'error'} className="text-xs">
                  {aiStatus === 'healthy' ? 'Active' : 'Down'}
                </Badge>
              </div>

              <div className="pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-secondary">Health Score</span>
                  <span className={`text-2xl font-bold ${healthColor}`} data-testid="health-score">
                    {healthScore}%
                  </span>
                </div>
              </div>
            </div>

            <Link href="/app/settings">
              <Button className="w-full" variant="default" data-testid="button-system-health">
                <Activity className="h-4 w-4 mr-2" />
                View System Health
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
