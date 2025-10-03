import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  Activity,
  UserPlus,
  Bell,
  Trash2,
  Edit,
  Settings,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Member, Reminder, League } from '@shared/schema';

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

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'UTC',
];

const REMINDER_TYPES = [
  { value: 'lineup_lock', label: 'Lineup Lock' },
  { value: 'waivers', label: 'Waivers' },
  { value: 'trade_deadline', label: 'Trade Deadline' },
  { value: 'bye_week', label: 'Bye Week' },
  { value: 'custom', label: 'Custom' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'roast', label: 'Roast Mode' },
];

export function DashboardPage() {
  // Get leagueId from localStorage or use first available league
  const [leagueId, setLeagueId] = useState<string>(() => {
    return localStorage.getItem('selectedLeagueId') || '';
  });

  // Owner Mapping Dialog State
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [discordUserId, setDiscordUserId] = useState('');
  const [sleeperOwnerId, setSleeperOwnerId] = useState('');
  const [sleeperTeamName, setSleeperTeamName] = useState('');

  // Reminder Dialog State
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderType, setReminderType] = useState('');
  const [reminderCron, setReminderCron] = useState('');
  const [reminderTimezone, setReminderTimezone] = useState('UTC');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // League Settings State
  const [settingsTone, setSettingsTone] = useState('');
  const [settingsTimezone, setSettingsTimezone] = useState('');
  const [autoDigest, setAutoDigest] = useState(false);
  const [pollsEnabled, setPollsEnabled] = useState(false);
  const [tradeInsights, setTradeInsights] = useState(false);

  // Fetch leagues to get the first one if not set (using demo endpoint for testing)
  const { data: leagues } = useQuery<{ leagues: League[] }>({
    queryKey: ['/api/demo/leagues'],
    enabled: !leagueId,
  });

  // Set leagueId from first league if available
  useEffect(() => {
    if (!leagueId && leagues?.leagues && leagues.leagues.length > 0) {
      const firstLeagueId = leagues.leagues[0].id;
      setLeagueId(firstLeagueId);
      localStorage.setItem('selectedLeagueId', firstLeagueId);
    }
  }, [leagues, leagueId]);

  // Fetch current league data
  const { data: leagueData } = useQuery<{ league: League }>({
    queryKey: ['/api/demo/leagues', leagueId],
    enabled: !!leagueId,
  });

  // Initialize settings when league data loads
  useEffect(() => {
    if (leagueData?.league) {
      const league = leagueData.league;
      const flags = league.featureFlags as any;
      setSettingsTone(league.tone || 'professional');
      setSettingsTimezone(league.timezone || 'America/New_York');
      setAutoDigest(flags?.autoDigest ?? true);
      setPollsEnabled(flags?.polls ?? true);
      setTradeInsights(flags?.tradeInsights ?? false);
    }
  }, [leagueData?.league]);

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

  // Owner Mappings (Members) Query
  const { data: membersData, isLoading: membersLoading } = useQuery<{ members: Member[] }>({
    queryKey: ['/api/leagues', leagueId, 'members'],
    enabled: !!leagueId,
  });

  // Reminders Query
  const { data: remindersData, isLoading: remindersLoading } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ['/api/leagues', leagueId, 'reminders'],
    enabled: !!leagueId,
  });

  // Create Member Mutation
  const createMemberMutation = useMutation({
    mutationFn: async (memberData: any) => {
      const response = await apiRequest('POST', `/api/leagues/${leagueId}/members`, memberData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'members'] });
      toast.success('Owner mapped successfully', {
        description: `Mapped ${discordUsername} to team`,
      });
      setIsOwnerDialogOpen(false);
      resetOwnerForm();
    },
    onError: (error: any) => {
      toast.error('Failed to map owner', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Create Reminder Mutation
  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const response = await apiRequest('POST', `/api/leagues/${leagueId}/reminders`, reminderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'reminders'] });
      toast.success('Reminder created', {
        description: 'New reminder has been added',
      });
      setIsReminderDialogOpen(false);
      resetReminderForm();
    },
    onError: (error: any) => {
      toast.error('Failed to create reminder', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Update Reminder Mutation
  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/reminders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'reminders'] });
      toast.success('Reminder updated', {
        description: 'Reminder has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update reminder', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Delete Reminder Mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/reminders/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'reminders'] });
      toast.success('Reminder deleted', {
        description: 'Reminder has been removed',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to delete reminder', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Update League Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const response = await apiRequest('PATCH', `/api/leagues/${leagueId}/settings`, settingsData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId] });
      toast.success('Settings updated', {
        description: 'League settings have been saved',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update settings', {
        description: error?.message || 'An error occurred',
      });
    },
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

  const resetOwnerForm = () => {
    setDiscordUsername('');
    setDiscordUserId('');
    setSleeperOwnerId('');
    setSleeperTeamName('');
  };

  const resetReminderForm = () => {
    setEditingReminder(null);
    setReminderType('');
    setReminderCron('');
    setReminderTimezone('UTC');
    setReminderEnabled(true);
  };

  const handleAddOwner = () => {
    setIsOwnerDialogOpen(true);
  };

  const handleSaveOwner = () => {
    if (!discordUserId) {
      toast.error('Validation error', {
        description: 'Discord User ID is required',
      });
      return;
    }

    createMemberMutation.mutate({
      discordUserId,
      discordUsername: discordUsername || undefined,
      sleeperOwnerId: sleeperOwnerId || undefined,
      sleeperTeamName: sleeperTeamName || undefined,
      role: 'MANAGER',
    });
  };

  const handleAddReminder = () => {
    resetReminderForm();
    setIsReminderDialogOpen(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setReminderType(reminder.type);
    setReminderCron(reminder.cron);
    setReminderTimezone(reminder.timezone);
    setReminderEnabled(reminder.enabled);
    setIsReminderDialogOpen(true);
  };

  const handleSaveReminder = () => {
    if (!reminderType || !reminderCron) {
      toast.error('Validation error', {
        description: 'Type and schedule are required',
      });
      return;
    }

    if (editingReminder) {
      updateReminderMutation.mutate({
        id: editingReminder.id,
        data: {
          type: reminderType,
          cron: reminderCron,
          timezone: reminderTimezone,
          enabled: reminderEnabled,
        },
      });
      setIsReminderDialogOpen(false);
      resetReminderForm();
    } else {
      createReminderMutation.mutate({
        type: reminderType,
        cron: reminderCron,
        timezone: reminderTimezone,
        enabled: reminderEnabled,
      });
    }
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      deleteReminderMutation.mutate(id);
    }
  };

  const handleToggleReminder = (reminder: Reminder) => {
    updateReminderMutation.mutate({
      id: reminder.id,
      data: { enabled: !reminder.enabled },
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      tone: settingsTone,
      timezone: settingsTimezone,
      featureFlags: {
        digest: autoDigest,
        polls: pollsEnabled,
        trade_helper: tradeInsights,
      },
    });
  };

  const statsCards = [
    { label: 'Active Leagues', value: stats?.activeLeagues ?? 0, icon: MessageSquare, color: 'text-brand-teal' },
    { label: 'Rules Queries', value: stats?.rulesQueries ?? 0, icon: MessageSquare, color: 'text-brand-teal' },
    { label: 'Upcoming Deadlines', value: stats?.upcomingDeadlines ?? 0, icon: Calendar, color: 'text-brand-gold' },
    { label: 'AI Tokens Used', value: stats?.aiTokensUsed ?? '0', icon: Zap, color: 'text-brand-pink' },
  ];

  const formatCronToHuman = (cron: string): string => {
    // Simple cron to human readable converter
    if (cron === '0 0 * * 0') return 'Weekly on Sunday at midnight';
    if (cron === '0 12 * * *') return 'Daily at noon';
    return cron;
  };

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

      {/* League Settings Card */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Settings className="w-5 h-5" />
                League Settings
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Tone Preference</label>
                  <Select value={settingsTone} onValueChange={setSettingsTone}>
                    <SelectTrigger data-testid="select-tone" className="bg-surface-elevated border-border-default text-text-primary">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-default">
                      {TONE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-text-primary hover:bg-surface-hover">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Timezone</label>
                  <Select value={settingsTimezone} onValueChange={setSettingsTimezone}>
                    <SelectTrigger data-testid="select-timezone" className="bg-surface-elevated border-border-default text-text-primary">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-default">
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz} className="text-text-primary hover:bg-surface-hover">
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-text-secondary block mb-2">Feature Flags</label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Auto Digest</span>
                  <Switch
                    checked={autoDigest}
                    onCheckedChange={setAutoDigest}
                    data-testid="switch-auto-digest"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Polls</span>
                  <Switch
                    checked={pollsEnabled}
                    onCheckedChange={setPollsEnabled}
                    data-testid="switch-polls"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Trade Insights</span>
                  <Switch
                    checked={tradeInsights}
                    onCheckedChange={setTradeInsights}
                    data-testid="switch-trade-insights"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleSaveSettings}
                data-testid="button-save-settings"
                disabled={updateSettingsMutation.isPending}
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Owner Mapping Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Team Owner Mapping</CardTitle>
              <Button
                onClick={handleAddOwner}
                data-testid="button-add-owner"
                size="sm"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Map Owner
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discord User</TableHead>
                    <TableHead>Sleeper Team</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersData?.members && membersData.members.length > 0 ? (
                    membersData.members.map((member) => (
                      <TableRow key={member.id} data-testid={`member-row-${member.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-text-primary">
                              {member.discordUsername || 'Unknown User'}
                            </div>
                            <div className="text-xs text-text-muted">{member.discordUserId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-text-primary">{member.sleeperTeamName || 'Not mapped'}</div>
                            {member.sleeperOwnerId && (
                              <div className="text-xs text-text-muted">ID: {member.sleeperOwnerId}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={member.role === 'COMMISH' ? 'bg-brand-gold/20 text-brand-gold border-brand-gold/30' : 'bg-brand-teal/20 text-brand-teal border-brand-teal/30'}>
                            {member.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-text-muted py-8">
                        No owner mappings yet. Click "Map Owner" to add one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reminder Management Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Automated Reminders</CardTitle>
              <Button
                onClick={handleAddReminder}
                data-testid="button-add-reminder"
                size="sm"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <Bell className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {remindersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {remindersData?.reminders && remindersData.reminders.length > 0 ? (
                  remindersData.reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="p-4 border border-border-subtle rounded-lg bg-surface-elevated"
                      data-testid={`reminder-card-${reminder.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-text-primary capitalize">
                            {reminder.type.replace('_', ' ')}
                          </h4>
                          <p className="text-xs text-text-muted mt-1">
                            {formatCronToHuman(reminder.cron)}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">{reminder.timezone}</p>
                        </div>
                        <Switch
                          checked={reminder.enabled}
                          onCheckedChange={() => handleToggleReminder(reminder)}
                          data-testid={`switch-reminder-${reminder.id}`}
                          className="data-[state=checked]:bg-brand-teal"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditReminder(reminder)}
                          data-testid={`button-edit-reminder-${reminder.id}`}
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-text-primary hover:bg-surface-hover"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          data-testid={`button-delete-reminder-${reminder.id}`}
                          variant="secondary"
                          size="sm"
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-text-muted py-8">
                    No reminders configured. Click "Add Reminder" to create one.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Owner Mapping Dialog */}
      <Dialog
        open={isOwnerDialogOpen}
        onClose={() => {
          setIsOwnerDialogOpen(false);
          resetOwnerForm();
        }}
        title="Map Owner"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Discord Username</label>
            <Input
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
              placeholder="JohnDoe#1234"
              data-testid="input-discord-username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Discord User ID <span className="text-red-400">*</span>
            </label>
            <Input
              value={discordUserId}
              onChange={(e) => setDiscordUserId(e.target.value)}
              placeholder="123456789012345678"
              data-testid="input-discord-userid"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Sleeper Owner ID</label>
            <Input
              value={sleeperOwnerId}
              onChange={(e) => setSleeperOwnerId(e.target.value)}
              placeholder="optional"
              data-testid="input-sleeper-ownerid"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Sleeper Team Name</label>
            <Input
              value={sleeperTeamName}
              onChange={(e) => setSleeperTeamName(e.target.value)}
              placeholder="Team Name"
              data-testid="input-sleeper-teamname"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setIsOwnerDialogOpen(false);
                resetOwnerForm();
              }}
              data-testid="button-cancel-owner"
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOwner}
              data-testid="button-save-owner"
              disabled={createMemberMutation.isPending}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
            >
              {createMemberMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog
        open={isReminderDialogOpen}
        onClose={() => {
          setIsReminderDialogOpen(false);
          resetReminderForm();
        }}
        title={editingReminder ? 'Edit Reminder' : 'Add Reminder'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Type <span className="text-red-400">*</span>
            </label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger data-testid="select-reminder-type" className="bg-surface-elevated border-border-default text-text-primary">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-default">
                {REMINDER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value} className="text-text-primary hover:bg-surface-hover">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Cron Schedule <span className="text-red-400">*</span>
            </label>
            <Input
              value={reminderCron}
              onChange={(e) => setReminderCron(e.target.value)}
              placeholder="0 12 * * *"
              data-testid="input-reminder-cron"
            />
            <p className="text-xs text-text-muted mt-1">Example: "0 12 * * *" = Daily at noon</p>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Timezone</label>
            <Select value={reminderTimezone} onValueChange={setReminderTimezone}>
              <SelectTrigger data-testid="select-reminder-timezone" className="bg-surface-elevated border-border-default text-text-primary">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-default">
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz} className="text-text-primary hover:bg-surface-hover">
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">Enabled</label>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={setReminderEnabled}
              data-testid="switch-reminder-enabled"
              className="data-[state=checked]:bg-brand-teal"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setIsReminderDialogOpen(false);
                resetReminderForm();
              }}
              data-testid="button-cancel-reminder"
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveReminder}
              data-testid="button-save-reminder"
              disabled={createReminderMutation.isPending || updateReminderMutation.isPending}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
            >
              {(createReminderMutation.isPending || updateReminderMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
