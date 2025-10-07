import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAppStore } from '@/store/useAppStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { RefreshCw, Settings2, MessageSquare, Trophy, Loader2, ExternalLink } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface SleeperIntegration {
  leagueId: string;
  sleeperLeagueId: string;
  season: string;
  sport: string;
  username?: string;
  createdAt?: string;
}

interface League {
  id: string;
  name: string;
  guildId?: string;
  channelId?: string;
  [key: string]: any;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export function SettingsPage() {
  const { userPersona, setUserPersona, selectedLeagueId } = useAppStore();
  const [, setLocation] = useLocation();

  const personas = [
    { id: 'neutral', name: 'Neutral', desc: 'Plain, concise updates' },
    { id: 'sassy', name: 'Sassy', desc: 'Playful with light sarcasm' },
    { id: 'batman', name: 'Batman', desc: 'Terse vigilante metaphors' },
    { id: 'yoda', name: 'Yoda', desc: 'Inverted syntax wisdom' },
  ] as const;

  const handlePersonaChange = (personaId: 'neutral' | 'sassy' | 'batman' | 'yoda') => {
    setUserPersona(personaId);
    const persona = personas.find(p => p.id === personaId);
    toast.success(`Bot personality updated`, {
      description: `Now using ${persona?.name} style: ${persona?.desc}`,
    });
  };

  const handleNotificationToggle = (notificationType: string, checked: boolean) => {
    toast.info(`${notificationType} ${checked ? 'enabled' : 'disabled'}`, {
      description: `You will ${checked ? 'now receive' : 'no longer receive'} ${notificationType.toLowerCase()}.`,
    });
  };

  // Fetch Sleeper integration data
  const { data: sleeperData, isLoading: isLoadingSleeper } = useQuery<{ ok: boolean; integration: SleeperIntegration | null }>({
    queryKey: ['/api/v2/sleeper/integration', selectedLeagueId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/sleeper/integration/${selectedLeagueId}`);
      if (!response.ok) throw new Error('Failed to fetch Sleeper integration');
      return response.json();
    },
    enabled: !!selectedLeagueId,
  });

  // Fetch league data for Discord info
  const { data: leagueData, isLoading: isLoadingLeague } = useQuery<League>({
    queryKey: ['/api/leagues', selectedLeagueId],
    enabled: !!selectedLeagueId,
  });

  // Fetch Discord guilds to get guild name
  const { data: guildsData } = useQuery<{ guilds: DiscordGuild[] }>({
    queryKey: ['/api/v2/discord/guilds'],
    enabled: !!leagueData?.guildId,
  });

  // Fetch Discord channels to get channel name
  const { data: channelsData } = useQuery<{ channels: DiscordChannel[] }>({
    queryKey: ['/api/v2/discord/channels', leagueData?.guildId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/discord/channels?guildId=${leagueData?.guildId}`);
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    },
    enabled: !!leagueData?.guildId && !!leagueData?.channelId,
  });

  // Sleeper sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/v2/sleeper/sync', {
        leagueId: selectedLeagueId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/sleeper/integration', selectedLeagueId] });
      toast.success('Sleeper data synced successfully', {
        description: 'Your league data has been updated.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to sync Sleeper data', {
        description: error?.message || 'Please try again later.',
      });
    },
  });

  const handleSleeperSync = () => {
    syncMutation.mutate();
  };

  const handleChangeSleeperLeague = () => {
    setLocation('/app/sleeper/link');
  };

  const handleReconfigureDiscord = () => {
    setLocation('/onboarding');
  };

  // Get guild and channel names
  const guildName = guildsData?.guilds.find(g => g.id === leagueData?.guildId)?.name;
  const channelName = channelsData?.channels.find(c => c.id === leagueData?.channelId)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Settings</h1>
        <p className="text-text-secondary">Personalize your experience</p>
      </div>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Bot Personality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePersonaChange(p.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  userPersona === p.id
                    ? 'border-brand-teal bg-brand-teal/10 shadow-glow'
                    : 'border-border-subtle bg-surface-elevated hover:border-border-default hover:bg-surface-hover'
                }`}
                data-testid={`persona-${p.id}`}
              >
                <div className="font-medium text-text-primary">{p.name}</div>
                <div className="text-sm text-text-secondary mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Trophy className="w-5 h-5 text-brand-teal" />
              Sleeper Integration
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSleeper ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sleeperData?.integration ? (
            <div className="space-y-4">
              <div className="p-4 bg-surface-elevated rounded-lg border border-border-subtle">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Username</span>
                    <span className="font-medium text-text-primary" data-testid="sleeper-username">
                      {sleeperData.integration.username || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">League ID</span>
                    <span className="font-mono text-xs text-text-primary" data-testid="sleeper-league-id">
                      {sleeperData.integration.sleeperLeagueId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Season</span>
                    <span className="font-medium text-text-primary" data-testid="sleeper-season">
                      {sleeperData.integration.season}
                    </span>
                  </div>
                  {sleeperData.integration.createdAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Last Sync</span>
                      <span className="text-xs text-text-secondary" data-testid="sleeper-last-sync">
                        {new Date(sleeperData.integration.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleSleeperSync}
                  disabled={syncMutation.isPending}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-sync-sleeper"
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Re-sync Sleeper Data
                </Button>
                <Button
                  onClick={handleChangeSleeperLeague}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-change-sleeper"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Change Sleeper League
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Trophy className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
              <p className="text-text-secondary mb-4">No Sleeper league linked yet</p>
              <Button
                onClick={handleChangeSleeperLeague}
                variant="default"
                data-testid="button-link-sleeper"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Link Sleeper League
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#5865F2]" />
              Discord Integration
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingLeague ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : leagueData?.guildId && leagueData?.channelId ? (
            <div className="space-y-4">
              <div className="p-4 bg-surface-elevated rounded-lg border border-border-subtle">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-[#5865F2] rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary" data-testid="discord-server-name">
                      {guildName || `Server ID: ${leagueData.guildId}`}
                    </p>
                    <p className="text-sm text-text-secondary" data-testid="discord-channel-name">
                      #{channelName || leagueData.channelId}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleReconfigureDiscord}
                variant="outline"
                className="w-full"
                data-testid="button-reconfigure-discord"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Reconfigure Discord
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
              <p className="text-text-secondary mb-4">Discord not configured</p>
              <Button
                onClick={handleReconfigureDiscord}
                variant="default"
                data-testid="button-setup-discord"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Setup Discord
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Waiver alerts', 'Trade proposals', 'Lineup warnings', 'Weekly reports'].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-text-primary">{item}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  onChange={(e) => handleNotificationToggle(item, e.target.checked)}
                  data-testid={`notification-${i}`}
                  className="w-4 h-4 rounded border-border-default bg-surface-elevated text-brand-teal"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
