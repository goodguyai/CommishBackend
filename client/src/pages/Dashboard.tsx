import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  MessageSquare, 
  Calendar, 
  Zap, 
  CheckCircle, 
  Circle,
  RefreshCw,
  ExternalLink,
  Database,
  Brain,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  activeLeagues: number;
  rulesQueries: number;
  upcomingDeadlines: number;
  aiTokensUsed: string;
}

interface DiscordIntegration {
  botName: string;
  server: string;
  online: boolean;
  permissions: string;
  slashCommands: string;
  webhookVerification: string;
}

interface SleeperIntegration {
  leagueName: string;
  leagueId: string;
  season: number;
  week: number;
  lastSync: string;
  cacheStatus: string;
  apiCalls: string;
}

interface SlashCommand {
  command: string;
  access: string;
  description: string;
  features: string[];
}

interface RagSystemStatus {
  constitutionVersion: string;
  uploadedAgo: string;
  sections: number;
  embeddings: number;
  vectorDim: number;
  avgSimilarity: number;
  recentQueries: string[];
}

interface AiAssistantStatus {
  model: string;
  functionCalling: string;
  requestsToday: number;
  avgResponse: string;
  cacheHit: number;
  tokensUsed: number;
  tokenUsagePercent: number;
}

interface ActivityLog {
  id: string;
  icon: string;
  text: string;
  details: string;
  timestamp: string;
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/mock/dashboard/stats'],
  });

  const { data: discord, isLoading: discordLoading } = useQuery<DiscordIntegration>({
    queryKey: ['/api/mock/integrations/discord'],
  });

  const { data: sleeper, isLoading: sleeperLoading } = useQuery<SleeperIntegration>({
    queryKey: ['/api/mock/integrations/sleeper'],
  });

  const { data: commands, isLoading: commandsLoading } = useQuery<SlashCommand[]>({
    queryKey: ['/api/mock/slash-commands'],
  });

  const { data: rag, isLoading: ragLoading } = useQuery<RagSystemStatus>({
    queryKey: ['/api/mock/rag/status'],
  });

  const { data: ai, isLoading: aiLoading } = useQuery<AiAssistantStatus>({
    queryKey: ['/api/mock/ai/status'],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/mock/activity'],
  });

  const handleManageDiscord = () => {
    toast.info('Opening Discord settings...', {
      description: 'Manage bot permissions, slash commands, and webhook configuration.',
    });
  };

  const handleForceSyncSleeper = () => {
    toast.success('Syncing with Sleeper...', {
      description: 'Fetching latest league data, rosters, and matchups.',
    });
  };

  const handleReindexConstitution = () => {
    toast.info('Reindexing constitution...', {
      description: 'Regenerating embeddings and updating vector database.',
    });
  };

  const handleViewLogs = () => {
    toast.info('Opening full activity log...', {
      description: 'View detailed system events and audit trail.',
    });
  };

  const statsCards = [
    { label: 'Active Leagues', value: stats?.activeLeagues ?? 0, icon: MessageSquare, color: 'text-brand-teal' },
    { label: 'Rules Queries', value: stats?.rulesQueries ?? 0, icon: MessageSquare, color: 'text-brand-teal' },
    { label: 'Upcoming Deadlines', value: stats?.upcomingDeadlines ?? 0, icon: Calendar, color: 'text-brand-gold' },
    { label: 'AI Tokens Used', value: stats?.aiTokensUsed ?? '0', icon: Zap, color: 'text-brand-pink' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
        <p className="text-text-secondary">League management and bot system status</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, i) => (
          <Card 
            key={i} 
            className="bg-surface-card border-border-subtle shadow-depth1"
            data-testid={`stat-card-${i}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Discord & Sleeper Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Discord Integration</CardTitle>
              <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {discordLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Circle className={`w-3 h-3 ${discord?.online ? 'fill-brand-teal text-brand-teal' : 'fill-text-muted text-text-muted'}`} />
                  <div>
                    <div className="font-medium text-text-primary">{discord?.botName}</div>
                    <div className="text-sm text-text-secondary">{discord?.server}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Bot permissions</span>
                    <Badge className="text-brand-teal border-brand-teal/30 border bg-brand-teal/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {discord?.permissions}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Slash commands</span>
                    <Badge className="text-brand-teal border-brand-teal/30 border bg-brand-teal/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {discord?.slashCommands}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Webhook verification</span>
                    <Badge className="text-brand-teal border-brand-teal/30 border bg-brand-teal/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {discord?.webhookVerification}
                    </Badge>
                  </div>
                </div>

                <Button 
                  onClick={handleManageDiscord}
                  data-testid="button-manage-discord"
                  variant="secondary" 
                  size="sm" 
                  className="w-full text-text-primary border border-border-default hover:bg-surface-hover"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage Discord Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Sleeper Integration</CardTitle>
              <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30">Synced</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sleeperLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-text-primary">{sleeper?.leagueName}</div>
                  <div className="text-sm text-text-secondary">ID: {sleeper?.leagueId}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-muted">Season</div>
                    <div className="text-sm font-medium text-text-primary">{sleeper?.season}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Week</div>
                    <div className="text-sm font-medium text-text-primary">{sleeper?.week}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Last sync</div>
                    <div className="text-sm font-medium text-text-primary">{sleeper?.lastSync}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Cache status</div>
                    <div className="text-sm font-medium text-brand-teal">{sleeper?.cacheStatus}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-text-muted mb-1">API calls today</div>
                  <div className="text-sm font-medium text-text-primary">{sleeper?.apiCalls}</div>
                </div>

                <Button 
                  onClick={handleForceSyncSleeper}
                  data-testid="button-force-sync"
                  variant="secondary" 
                  size="sm" 
                  className="w-full text-text-primary border border-border-default hover:bg-surface-hover"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Force Sync Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slash Commands */}
      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Available Slash Commands</CardTitle>
        </CardHeader>
        <CardContent>
          {commandsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commands?.map((cmd, i) => (
                <div 
                  key={i} 
                  className="p-4 border border-border-subtle rounded-lg bg-surface-elevated"
                  data-testid={`command-card-${i}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-semibold text-brand-teal">{cmd.command}</code>
                    {cmd.access === 'Commish Only' && (
                      <Badge className="text-xs bg-brand-gold/20 text-brand-gold border-brand-gold/30">
                        {cmd.access}
                      </Badge>
                    )}
                    {cmd.access === 'Public' && (
                      <Badge className="text-xs bg-brand-teal/20 text-brand-teal border-brand-teal/30">
                        {cmd.access}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-2">{cmd.description}</p>
                  <ul className="text-xs text-text-muted space-y-1">
                    {cmd.features.map((f, j) => (
                      <li key={j}>• {f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RAG System & AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Database className="w-5 h-5" />
              RAG System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ragLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-primary">Constitution {rag?.constitutionVersion}</span>
                    <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30">Indexed</Badge>
                  </div>
                  <div className="text-sm text-text-secondary">Uploaded {rag?.uploadedAgo}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-muted">Sections</div>
                    <div className="text-lg font-semibold text-text-primary">{rag?.sections}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Embeddings</div>
                    <div className="text-lg font-semibold text-text-primary">{rag?.embeddings}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Vector dim</div>
                    <div className="text-lg font-semibold text-text-primary">{rag?.vectorDim}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Avg similarity</div>
                    <div className="text-lg font-semibold text-text-primary">{rag?.avgSimilarity}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-muted mb-2">Recent Queries</div>
                  <div className="space-y-1">
                    {rag?.recentQueries?.map((q, i) => (
                      <div key={i} className="text-xs text-text-secondary">"{q}"</div>
                    )) || <div className="text-xs text-text-muted">No recent queries</div>}
                  </div>
                </div>

                <Button 
                  onClick={handleReindexConstitution}
                  data-testid="button-reindex"
                  variant="secondary" 
                  size="sm" 
                  className="w-full text-text-primary border border-border-default hover:bg-surface-hover"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reindex Constitution
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Assistant (DeepSeek)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-muted">Model</div>
                    <div className="text-sm font-medium text-text-primary">{ai?.model}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Function calling</div>
                    <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30">
                      {ai?.functionCalling}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Requests today</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.requestsToday}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Avg response</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.avgResponse}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Cache hit %</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.cacheHit}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Tokens used</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.tokensUsed.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-muted mb-2">Token usage (bar graph)</div>
                  <div className="w-full bg-surface-elevated border border-border-subtle rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-brand-teal to-brand-pink h-full rounded-full transition-all"
                      style={{ width: `${ai?.tokenUsagePercent}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-text-muted mt-1">{ai?.tokenUsagePercent}% used</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <Button 
              onClick={handleViewLogs}
              data-testid="button-view-logs"
              variant="ghost" 
              size="sm" 
              className="text-brand-teal hover:bg-surface-hover"
            >
              View All Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {activity?.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 bg-surface-elevated border border-border-subtle rounded-lg"
                  data-testid={`activity-${log.id}`}
                >
                  <div className="text-2xl">{log.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">{log.text}</div>
                    <div className="text-sm text-text-secondary">{log.details}</div>
                  </div>
                  <div className="text-xs text-text-muted whitespace-nowrap">{log.timestamp}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
