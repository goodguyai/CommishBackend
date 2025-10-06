import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ExternalLink, RefreshCw, CheckCircle, Link as LinkIcon, Search } from 'lucide-react';

interface SleeperLeague {
  id: string;
  name: string;
  season: string;
  total_rosters?: number;
}

interface SleeperIntegration {
  leagueId: string;
  sleeperLeagueId: string;
  season: string;
  username?: string;
  lastSync?: string;
}

export function SleeperLinkPage() {
  const [username, setUsername] = useState('');
  const [season, setSeason] = useState('2025');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedLeagueId] = useState<string>(() => {
    return localStorage.getItem('selectedLeagueId') || '';
  });

  // Fetch existing Sleeper integration for current league
  const { data: integrationData, isLoading: integrationLoading } = useQuery<{ ok: boolean; integration: SleeperIntegration | null }>({
    queryKey: ['/api/v2/sleeper/integration', selectedLeagueId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/sleeper/integration/${selectedLeagueId}`);
      if (res.status === 404) return { ok: true, integration: null };
      if (!res.ok) throw new Error('Failed to fetch integration');
      return res.json();
    },
    enabled: !!selectedLeagueId,
  });

  // Fetch leagues when searching
  const { data: leaguesData, isLoading: leaguesLoading, error: leaguesError } = useQuery<{ ok: boolean; leagues: SleeperLeague[] }>({
    queryKey: ['/api/v2/sleeper/leagues', username, season],
    queryFn: async () => {
      const res = await fetch(`/api/v2/sleeper/leagues?username=${encodeURIComponent(username)}&season=${season}`);
      if (!res.ok) throw new Error('Failed to fetch leagues');
      return res.json();
    },
    enabled: searchTriggered && !!username && !!season,
  });

  // Link Sleeper league mutation
  const linkMutation = useMutation({
    mutationFn: async (data: { sleeperLeagueId: string; season: string; username: string }) => {
      const response = await apiRequest('POST', '/api/v2/setup/sleeper', {
        leagueId: selectedLeagueId,
        sleeperLeagueId: data.sleeperLeagueId,
        season: data.season,
        username: data.username,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/sleeper/integration', selectedLeagueId] });
      toast.success('Sleeper league linked', {
        description: 'Your league has been successfully linked',
      });
      setSearchTriggered(false);
      setUsername('');
    },
    onError: (error: Error) => {
      toast.error('Failed to link league', {
        description: error.message || 'An error occurred',
      });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v2/sleeper/sync', {
        leagueId: selectedLeagueId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/sleeper/integration', selectedLeagueId] });
      toast.success('Sleeper data synced', {
        description: 'League settings have been updated',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to sync', {
        description: error.message || 'An error occurred',
      });
    },
  });

  const handleSearch = () => {
    if (!username.trim()) {
      toast.error('Username required', {
        description: 'Please enter a Sleeper username',
      });
      return;
    }
    setSearchTriggered(true);
  };

  const handleLink = (league: SleeperLeague) => {
    linkMutation.mutate({
      sleeperLeagueId: league.id,
      season: league.season,
      username,
    });
  };

  const integration = integrationData?.integration;
  const isLinked = !!integration;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Link Sleeper League</h1>
        <p className="text-text-secondary">Connect your Sleeper league to sync settings and data</p>
      </div>

      {/* Current Integration Status */}
      {integrationLoading ? (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardContent className="pt-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : isLinked ? (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Linked League
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">Sleeper League ID</div>
                <div className="text-text-primary font-medium" data-testid="text-sleeper-league-id">
                  {integration.sleeperLeagueId}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Season</div>
                <div className="text-text-primary font-medium" data-testid="text-season">
                  {integration.season}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Username</div>
                <div className="text-text-primary font-medium" data-testid="text-username">
                  {integration.username || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Last Sync</div>
                <div className="text-text-primary font-medium" data-testid="text-last-sync">
                  {integration.lastSync 
                    ? new Date(integration.lastSync).toLocaleString()
                    : 'Never'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-sync-now"
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSearchTriggered(false)}
                data-testid="button-change-league"
              >
                Change League
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Search Form */}
      {!isLinked || searchTriggered ? (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <Search className="w-5 h-5" />
              Find Your League
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-text-primary">Sleeper Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your Sleeper username"
                  className="bg-surface-elevated border-border-default text-text-primary"
                  data-testid="input-username"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="season" className="text-text-primary">Season</Label>
                <Input
                  id="season"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g., 2025"
                  className="bg-surface-elevated border-border-default text-text-primary"
                  data-testid="input-season"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={leaguesLoading}
              className="w-full"
              data-testid="button-search"
            >
              {leaguesLoading ? 'Searching...' : 'Search Leagues'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Search Results */}
      {searchTriggered && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Available Leagues</h2>
          
          {leaguesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-surface-card border-border-subtle">
                  <CardContent className="pt-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : leaguesError ? (
            <Card className="bg-surface-card border-border-subtle">
              <CardContent className="pt-6">
                <div className="text-center text-text-secondary">
                  <p>Failed to load leagues. Please check the username and try again.</p>
                </div>
              </CardContent>
            </Card>
          ) : leaguesData && leaguesData.leagues.length === 0 ? (
            <Card className="bg-surface-card border-border-subtle">
              <CardContent className="pt-6">
                <div className="text-center text-text-secondary">
                  <p>No leagues found for this username and season.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaguesData?.leagues.map((league) => (
                <Card
                  key={league.id}
                  className="bg-surface-card border-border-subtle hover:border-brand-teal transition-all"
                  data-testid={`card-league-${league.id}`}
                >
                  <CardHeader>
                    <CardTitle className="text-text-primary flex items-center justify-between">
                      <span>{league.name}</span>
                      <Badge variant="default" className="bg-brand-teal/20 text-brand-teal">
                        {league.season}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-text-secondary">League ID</div>
                        <div className="text-text-primary font-mono text-xs">{league.id}</div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Teams</div>
                        <div className="text-text-primary">{league.total_rosters || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleLink(league)}
                        disabled={linkMutation.isPending}
                        className="flex-1 flex items-center gap-2"
                        data-testid={`button-link-${league.id}`}
                      >
                        <LinkIcon className="w-4 h-4" />
                        {linkMutation.isPending ? 'Linking...' : 'Link League'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://sleeper.com/leagues/${league.id}`, '_blank')}
                        data-testid={`button-view-${league.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
