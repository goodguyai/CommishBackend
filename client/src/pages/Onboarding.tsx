import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/Textarea';
import { CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiApp';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

type Step = 'discord' | 'sleeper' | 'rules' | 'complete';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordChannel {
  id: string;
  name: string;
  position: number;
}

interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status: string;
}

export function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('discord');
  
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isSavingDiscord, setIsSavingDiscord] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [sleeperUsername, setSleeperUsername] = useState('');
  const [sleeperSeason, setSleeperSeason] = useState(new Date().getFullYear().toString());
  const [sleeperLeagues, setSleeperLeagues] = useState<SleeperLeague[]>([]);
  const [selectedSleeperLeagueId, setSelectedSleeperLeagueId] = useState('');
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false);
  const [isSavingSleeper, setIsSavingSleeper] = useState(false);
  
  const [rulesContent, setRulesContent] = useState('');
  const [rulesTitle, setRulesTitle] = useState('League Constitution');
  const [isIndexing, setIsIndexing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  const [accountId, setAccountId] = useState<string>('');
  const [leagueId, setLeagueId] = useState<string>('');

  useEffect(() => {
    const checkResumeState = async () => {
      try {
        const user = await api<{ userId: string; accountId: string; leagueId?: string }>('/api/app/me');
        
        if (user.accountId) {
          setAccountId(user.accountId);
        }
        
        if (user.leagueId) {
          const league = await api<any>(`/api/leagues/${user.leagueId}`);
          if (league.activatedAt) {
            toast.success('Your league is already set up!');
            setLocation('/app');
            return;
          }
          
          setCurrentStep('rules');
          setLeagueId(user.leagueId);
          return;
        }
        
        const sessionData = await api<{ guilds: any[] }>('/api/v2/setup/discord-session');
        if (sessionData.guilds && sessionData.guilds.length > 0) {
          setGuilds(sessionData.guilds);
        }
      } catch (e) {
        console.log('Starting fresh wizard');
      }
    };
    
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const success = params.get('success');
    
    if (error) {
      switch (error) {
        case 'discord_auth_failed':
          toast.error('Discord authentication failed. Please try again.');
          break;
        case 'token_exchange_failed':
          toast.error('Failed to exchange Discord token. Please try again.');
          break;
        case 'user_fetch_failed':
          toast.error('Failed to fetch Discord user info. Please try again.');
          break;
        case 'guilds_fetch_failed':
          toast.error('Failed to fetch Discord servers. Please try again.');
          break;
        case 'no_code':
          toast.error('Discord did not provide authorization code.');
          break;
        default:
          toast.error(`Setup error: ${error}`);
      }
    }
    
    if (success === 'true') {
      toast.success('Discord connected successfully!');
    }
    
    checkResumeState();
  }, []);

  const fetchSessionGuilds = async () => {
    try {
      const data = await api<{ guilds: DiscordGuild[]; username?: string }>(
        '/api/v2/setup/discord-session'
      );
      
      if (data.guilds && data.guilds.length > 0) {
        setGuilds(data.guilds);
        if (data.username) {
          toast.success(`Welcome ${data.username}! Select a server to continue.`);
        }
      } else {
        setGuilds([]);
        if (data.guilds && data.guilds.length === 0) {
          toast.error('No servers found where you have Manage Server permission. Please make sure you\'re an admin on at least one Discord server.');
        }
      }
    } catch (e) {
      console.error('[Fetch Guilds]', e);
      toast.error('Failed to fetch Discord servers');
      setGuilds([]);
    }
  };

  const handleConnectDiscord = async () => {
    try {
      setConnectionError(null);
      const { url } = await api<{ url: string }>('/api/v2/discord/auth-url');
      window.location.href = url;
    } catch (e) {
      const errorMsg = 'Failed to initiate Discord connection';
      setConnectionError(errorMsg);
      toast.error(errorMsg);
      console.error(e);
    }
  };

  const handleGuildSelect = async (guildId: string) => {
    setSelectedGuildId(guildId);
    setIsLoadingChannels(true);
    try {
      const { channels: fetchedChannels } = await api<{ channels: DiscordChannel[] }>(
        `/api/v2/discord/channels?guildId=${guildId}`
      );
      
      if (fetchedChannels.length === 0) {
        toast.error('No writable channels found. Make sure the bot has permission to post in at least one channel.');
        setChannels([]);
        return;
      }
      
      setChannels(fetchedChannels);
    } catch (e) {
      toast.error('Failed to fetch channels');
      console.error(e);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleSaveDiscord = async () => {
    if (!selectedGuildId || !selectedChannelId) {
      toast.error('Please select both a server and channel');
      return;
    }

    setIsSavingDiscord(true);
    try {
      const result = await api<{ ok: boolean; leagueId: string }>(
        '/api/v2/setup/discord',
        {
          method: 'POST',
          body: JSON.stringify({
            accountId,
            guildId: selectedGuildId,
            channelId: selectedChannelId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        }
      );

      if (result.ok) {
        setLeagueId(result.leagueId);
        toast.success('Discord connected successfully!');
        await new Promise(resolve => setTimeout(resolve, 500));
        setCurrentStep('sleeper');
      }
    } catch (e) {
      toast.error('Failed to save Discord configuration');
      console.error(e);
    } finally {
      setIsSavingDiscord(false);
    }
  };

  const handleFetchSleeperLeagues = async () => {
    if (!sleeperUsername.trim()) {
      toast.error('Please enter your Sleeper username');
      return;
    }

    setIsLoadingLeagues(true);
    try {
      const leagues = await api<SleeperLeague[]>(
        `/api/v2/sleeper/leagues?username=${encodeURIComponent(sleeperUsername)}&season=${sleeperSeason}`
      );
      setSleeperLeagues(leagues);
      if (leagues.length === 0) {
        toast.info(`No leagues found for "${sleeperUsername}" in ${sleeperSeason}. Check spelling or try a different season.`);
      }
    } catch (e) {
      toast.error('Failed to fetch Sleeper leagues');
      console.error(e);
    } finally {
      setIsLoadingLeagues(false);
    }
  };

  const handleSaveSleeper = async () => {
    if (!selectedSleeperLeagueId) {
      toast.error('Please select a league');
      return;
    }

    setIsSavingSleeper(true);
    try {
      const result = await api<{ ok: boolean }>(
        '/api/v2/setup/sleeper',
        {
          method: 'POST',
          body: JSON.stringify({
            accountId,
            guildId: selectedGuildId,
            sleeperLeagueId: selectedSleeperLeagueId,
          }),
        }
      );

      if (result.ok) {
        toast.success('Sleeper league connected!');
        await new Promise(resolve => setTimeout(resolve, 500));
        setCurrentStep('rules');
      }
    } catch (e) {
      toast.error('Failed to save Sleeper configuration');
      console.error(e);
    } finally {
      setIsSavingSleeper(false);
    }
  };

  const handleSkipSleeper = () => {
    toast.info('Sleeper integration skipped - you can add it later');
    setCurrentStep('rules');
  };

  const handleIndexRules = async () => {
    if (!rulesContent.trim()) {
      toast.error('Please enter your league rules');
      return;
    }

    setIsIndexing(true);
    try {
      await api(`/api/rag/index/${leagueId}`, {
        method: 'POST',
        body: JSON.stringify({
          content: rulesContent,
          contentType: 'text/plain',
          title: rulesTitle,
          version: new Date().toISOString().split('T')[0],
        }),
      });
      
      toast.success('Rules indexed successfully!');
      await handleActivate();
    } catch (e) {
      toast.error('Failed to index rules');
      console.error(e);
      setIsIndexing(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const result = await api<{ ok: boolean }>(
        '/api/v2/setup/activate',
        {
          method: 'POST',
          body: JSON.stringify({
            accountId,
            guildId: selectedGuildId,
          }),
        }
      );

      if (result.ok) {
        setCurrentStep('complete');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast.success('League activated! 🎉');
      }
    } catch (e) {
      toast.error('Failed to activate league');
      console.error(e);
    } finally {
      setIsActivating(false);
      setIsIndexing(false);
    }
  };

  const steps = [
    { id: 'discord', name: 'Discord', completed: currentStep !== 'discord' },
    { id: 'sleeper', name: 'Sleeper', completed: currentStep === 'rules' || currentStep === 'complete' },
    { id: 'rules', name: 'Rules', completed: currentStep === 'complete' },
  ];

  return (
    <div className="min-h-screen bg-[#050607] py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#F5F7FA] mb-2" data-testid="text-setup-title">
            Setup Your League
          </h1>
          <p className="text-[#9CA3AF]">Connect Discord, Sleeper, and index your rules</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      s.completed
                        ? 'bg-green-600'
                        : currentStep === s.id
                        ? 'bg-[#009898]'
                        : 'bg-[#1f2937]'
                    }`}
                    data-testid={`step-indicator-${s.id}`}
                  >
                    {s.completed ? (
                      <CheckCircle className="w-5 h-5 text-[#F5F7FA]" />
                    ) : (
                      <span className="text-sm font-medium text-[#F5F7FA]">{i + 1}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#9CA3AF]">{s.name}</span>
                </div>
                {i < steps.length - 1 && <div className="w-12 h-px bg-[#374151] mx-2" />}
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-[#111820] border-[#1f2937]">
          <CardHeader>
            <CardTitle className="text-[#F5F7FA]">
              {currentStep === 'discord' && 'Connect Discord'}
              {currentStep === 'sleeper' && 'Connect Sleeper (Optional)'}
              {currentStep === 'rules' && 'Index Your Rules'}
              {currentStep === 'complete' && 'Setup Complete!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 'discord' && (
              <div className="space-y-4">
                <p className="text-[#9CA3AF] text-sm">
                  Connect your Discord server to enable slash commands and automated features.
                </p>
                
                {connectionError && (
                  <div className="bg-red-900/20 border border-red-500 rounded p-4" data-testid="error-connection">
                    <p className="text-red-400 text-sm mb-2">{connectionError}</p>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleConnectDiscord}
                      data-testid="button-retry-connection"
                    >
                      Retry Connection
                    </Button>
                  </div>
                )}
                
                {guilds.length === 0 ? (
                  <div className="space-y-4">
                    <Button
                      onClick={handleConnectDiscord}
                      className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                      data-testid="button-connect-discord"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Discord Account
                    </Button>
                    <p className="text-sm text-[#6B7280] text-center">
                      Connect your Discord to select a server and channel
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[#F5F7FA]">Select Server</Label>
                      <Select value={selectedGuildId} onValueChange={handleGuildSelect}>
                        <SelectTrigger data-testid="select-guild">
                          <SelectValue placeholder="Choose a server..." />
                        </SelectTrigger>
                        <SelectContent>
                          {guilds.map(guild => (
                            <SelectItem key={guild.id} value={guild.id}>
                              {guild.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isLoadingChannels ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-[#009898]" />
                      </div>
                    ) : channels.length > 0 ? (
                      <div>
                        <Label className="text-[#F5F7FA]">Select Channel</Label>
                        <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                          <SelectTrigger data-testid="select-channel">
                            <SelectValue placeholder="Choose a channel..." />
                          </SelectTrigger>
                          <SelectContent>
                            {channels.map(channel => (
                              <SelectItem key={channel.id} value={channel.id}>
                                #{channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    <Button
                      onClick={handleSaveDiscord}
                      disabled={!selectedChannelId || isSavingDiscord}
                      className="w-full"
                      data-testid="button-save-discord"
                    >
                      {isSavingDiscord ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Continue'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'sleeper' && (
              <div className="space-y-4">
                <p className="text-[#9CA3AF] text-sm">
                  Connect your Sleeper league to sync rosters, matchups, and standings.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#F5F7FA]">Sleeper Username</Label>
                    <Input
                      value={sleeperUsername}
                      onChange={(e) => setSleeperUsername(e.target.value)}
                      placeholder="your_username"
                      className="bg-[#1f2937] border-[#374151] text-[#F5F7FA]"
                      data-testid="input-sleeper-username"
                    />
                  </div>
                  <div>
                    <Label className="text-[#F5F7FA]">Season</Label>
                    <Input
                      value={sleeperSeason}
                      onChange={(e) => setSleeperSeason(e.target.value)}
                      placeholder="2025"
                      className="bg-[#1f2937] border-[#374151] text-[#F5F7FA]"
                      data-testid="input-sleeper-season"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleFetchSleeperLeagues}
                  disabled={isLoadingLeagues}
                  variant="secondary"
                  className="w-full"
                  data-testid="button-fetch-leagues"
                >
                  {isLoadingLeagues ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Find My Leagues'
                  )}
                </Button>

                {sleeperLeagues.length > 0 && (
                  <div>
                    <Label className="text-[#F5F7FA]">Select League</Label>
                    <Select value={selectedSleeperLeagueId} onValueChange={setSelectedSleeperLeagueId}>
                      <SelectTrigger data-testid="select-sleeper-league">
                        <SelectValue placeholder="Choose a league..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sleeperLeagues.map(league => (
                          <SelectItem key={league.league_id} value={league.league_id}>
                            {league.name} ({league.season})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleSkipSleeper}
                    variant="secondary"
                    className="flex-1"
                    data-testid="button-skip-sleeper"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleSaveSleeper}
                    disabled={!selectedSleeperLeagueId || isSavingSleeper}
                    className="flex-1"
                    data-testid="button-save-sleeper"
                  >
                    {isSavingSleeper ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'rules' && (
              <div className="space-y-4">
                <p className="text-[#9CA3AF] text-sm">
                  Paste your league constitution so THE COMMISH can answer rules questions.
                </p>

                <div>
                  <Label className="text-[#F5F7FA]">Document Title</Label>
                  <Input
                    value={rulesTitle}
                    onChange={(e) => setRulesTitle(e.target.value)}
                    placeholder="League Constitution"
                    className="bg-[#1f2937] border-[#374151] text-[#F5F7FA]"
                    data-testid="input-rules-title"
                  />
                </div>

                <div>
                  <Label className="text-[#F5F7FA]">Rules Content</Label>
                  <Textarea
                    value={rulesContent}
                    onChange={(e) => setRulesContent(e.target.value)}
                    placeholder="Paste your league rules, constitution, or bylaws here..."
                    rows={12}
                    className="bg-[#1f2937] border-[#374151] text-[#F5F7FA] font-mono text-sm"
                    data-testid="textarea-rules-content"
                  />
                </div>

                <Button
                  onClick={handleIndexRules}
                  disabled={isIndexing || isActivating || !rulesContent.trim()}
                  className="w-full"
                  data-testid="button-index-activate"
                >
                  {isIndexing || isActivating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isIndexing ? 'Indexing...' : 'Activating...'}
                    </>
                  ) : (
                    'Index & Activate League'
                  )}
                </Button>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-[#F5F7FA]">
                  Your league is live!
                </h3>
                <p className="text-[#9CA3AF] mb-6">
                  THE COMMISH is ready to assist your league. Try using slash commands in Discord!
                </p>
                <Button
                  onClick={() => setLocation('/app')}
                  className="w-full"
                  data-testid="button-go-dashboard"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OnboardingPage;
