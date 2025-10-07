import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/Textarea';
import { CheckCircle, Loader2, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/apiApp';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

type Step = 'account' | 'discord' | 'sleeper' | 'rules' | 'complete';

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

interface League {
  id: string;
  name?: string;
  guildId?: string;
  channelId?: string;
  sleeperLeagueId?: string;
  activatedAt?: string;
  rulesIndexed?: boolean;
}

export function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('account');
  
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isSavingDiscord, setIsSavingDiscord] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
  
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
  const [needsBotInstall, setNeedsBotInstall] = useState(false);
  const [botInstallGuildId, setBotInstallGuildId] = useState<string>('');
  
  // Account creation state
  const [accountEmail, setAccountEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const checkResumeState = async () => {
      try {
        const user = await api<{ 
          userId: string; 
          accountId: string; 
          leagues?: Array<{ id: string; name?: string; isDemo?: boolean; isBeta?: boolean }> 
        }>('/api/app/me');
        
        if (user.accountId) {
          setAccountId(user.accountId);
          // Skip account step if account already exists
          setCurrentStep('discord');
        }
        
        // Check if user has leagues
        if (user.leagues && user.leagues.length > 0) {
          // Find first incomplete league
          for (const leagueInfo of user.leagues) {
            const league = await api<League>(`/api/leagues/${leagueInfo.id}`);
            if (!league.activatedAt) {
              // Resume this league's setup
              setLeagueId(leagueInfo.id);
              
              // Restore Discord state if already configured
              if (league.guildId) {
                setSelectedGuildId(league.guildId);
                
                // Fetch guilds to populate dropdown
                try {
                  const sessionData = await api<{ guilds: DiscordGuild[] }>('/api/v2/setup/discord-session');
                  if (sessionData.guilds) {
                    setGuilds(sessionData.guilds);
                  }
                } catch (e) {
                  console.error('Failed to fetch guilds on resume', e);
                }
              }
              
              if (league.channelId) {
                setSelectedChannelId(league.channelId);
                
                // Fetch channels for the guild to populate dropdown
                if (league.guildId) {
                  await handleGuildSelect(league.guildId);
                }
              }
              
              // Check what step to resume at based on league data
              if (!league.sleeperLeagueId) {
                setCurrentStep('sleeper');  
              } else if (!league.rulesIndexed) {
                setCurrentStep('rules');
              } else {
                // Has Sleeper and rules but not activated yet - go to rules to complete
                setCurrentStep('rules');
              }
              return;
            }
          }
          // All leagues activated
          toast.success('Your league is already set up!');
          setLocation('/app');
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
      setHasAttemptedAuth(true);
      toast.success('Discord connected successfully!');
      // Fetch guilds from session after successful OAuth
      fetchSessionGuilds();
    }
    
    // Check for bot installation completion and auto-retry
    if (params.get('bot-installed') === 'true') {
      const pendingGuildId = sessionStorage.getItem('pending-guild-id');
      
      if (pendingGuildId) {
        toast.success('Bot installed! Checking for channels...');
        
        // Rehydrate state and retry
        setSelectedGuildId(pendingGuildId);
        setBotInstallGuildId(pendingGuildId);
        
        // Auto-retry fetching channels
        setTimeout(() => {
          handleGuildSelect(pendingGuildId);
        }, 500);
      }
      
      // Clean URL
      window.history.replaceState({}, '', '/setup');
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
      }
    } catch (e) {
      console.error('[Fetch Guilds]', e);
      toast.error('Failed to fetch Discord servers');
      setGuilds([]);
    }
  };

  const fetchFreshGuilds = async () => {
    try {
      setConnectionError(null);
      const data = await api<{ guilds: DiscordGuild[] }>('/api/v2/discord/guilds');
      
      if (data.guilds && data.guilds.length > 0) {
        setGuilds(data.guilds);
        toast.success(`Found ${data.guilds.length} server(s) where you have permissions!`);
      } else {
        setGuilds([]);
        toast.error('Still no servers found. You may need to re-authenticate.');
      }
    } catch (e: any) {
      console.error('[Fetch Fresh Guilds]', e);
      if (e.message?.includes('NO_USER_TOKEN') || e.message?.includes('TOKEN_EXPIRED')) {
        setConnectionError('Session expired. Please re-authenticate with Discord.');
        toast.error('Session expired. Please re-authenticate.');
      } else {
        toast.error('Failed to refresh Discord servers');
      }
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

  const handleForceReauth = async () => {
    try {
      setConnectionError(null);
      const { url } = await api<{ url: string }>('/api/v2/discord/auth-url?force=1');
      window.location.href = url;
    } catch (e) {
      console.error('[Force Reauth]', e);
      toast.error('Failed to generate Discord auth URL');
    }
  };

  const handleInstallBot = async () => {
    try {
      const { url } = await api<{ url: string }>(`/api/v2/discord/bot-install-url?guildId=${botInstallGuildId}`);
      
      // Open in new tab so user stays on setup page
      window.open(url, '_blank', 'noopener,noreferrer');
      
      // Set up focus listener to auto-retry when user returns
      const handleFocus = () => {
        console.log('[Bot Install] Window focused, retrying channel fetch...');
        
        // Small delay to allow Discord to process bot addition
        setTimeout(() => {
          if (botInstallGuildId) {
            handleGuildSelect(botInstallGuildId);
          }
        }, 1000);
        
        // Remove listener after first retry
        window.removeEventListener('focus', handleFocus);
      };
      
      window.addEventListener('focus', handleFocus);
      
      toast.info('Install the bot in the Discord tab, then return here');
    } catch (e) {
      console.error('[Install Bot]', e);
      toast.error('Failed to generate bot install URL');
    }
  };

  const handleGuildSelect = async (guildId: string) => {
    setSelectedGuildId(guildId);
    setIsLoadingChannels(true);
    setNeedsBotInstall(false);
    setBotInstallGuildId(guildId);
    
    // Persist guild ID for auto-retry after bot installation
    sessionStorage.setItem('pending-guild-id', guildId);
    
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
      // Clear on success
      sessionStorage.removeItem('pending-guild-id');
    } catch (e: any) {
      console.error('[Fetch Channels]', e);
      
      // Check if error is due to bot not being installed
      if (e.message?.includes('BOT_NOT_IN_GUILD') || e.message?.includes('not installed')) {
        setNeedsBotInstall(true);
        toast.error('THE COMMISH bot needs to be installed in this server');
      } else {
        toast.error('Failed to fetch channels');
      }
      setChannels([]);
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
      const payload: any = {
        guildId: selectedGuildId,
        channelId: selectedChannelId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Only include accountId if it's a valid UUID
      if (accountId && accountId.length > 0) {
        payload.accountId = accountId;
      }

      const result = await api<{ ok: boolean; leagueId: string }>(
        '/api/v2/setup/discord',
        {
          method: 'POST',
          body: JSON.stringify(payload),
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
      const result = await api<{ ok: boolean; leagues: SleeperLeague[] }>(
        `/api/v2/sleeper/leagues?username=${encodeURIComponent(sleeperUsername)}&season=${sleeperSeason}`
      );
      setSleeperLeagues(result.leagues);
      if (result.leagues.length === 0) {
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

    if (!leagueId) {
      toast.error('League not created yet. Please complete Discord setup first.');
      return;
    }

    setIsSavingSleeper(true);
    try {
      const result = await api<{ ok: boolean }>(
        '/api/v2/setup/sleeper',
        {
          method: 'POST',
          body: JSON.stringify({
            leagueId,
            sleeperLeagueId: selectedSleeperLeagueId,
            season: sleeperSeason,
            username: sleeperUsername || undefined,
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

  const handleSignIn = async () => {
    if (!accountEmail.trim() || !accountPassword) {
      toast.error('Please enter your email and password');
      return;
    }

    setIsSigningIn(true);
    setPasswordError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: accountPassword,
      });

      if (error) {
        toast.error(error.message || 'Failed to sign in');
        setPasswordError(error.message || 'Failed to sign in');
        return;
      }

      if (!data.user || !data.session?.access_token) {
        toast.error('Sign in failed - no session returned');
        setPasswordError('Sign in failed');
        return;
      }

      try {
        await api('/api/auth/session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.session.access_token.trim()}`,
          },
        });

        const user = await api<{ 
          userId: string; 
          accountId: string; 
          leagues?: Array<{ id: string; name?: string; isDemo?: boolean; isBeta?: boolean }> 
        }>('/api/app/me');
        
        if (user.accountId) {
          setAccountId(user.accountId);
          setNeedsEmailConfirmation(false);
          toast.success('Signed in successfully!');
          
          // Check if user has incomplete leagues
          if (user.leagues && user.leagues.length > 0) {
            // Find first incomplete league and resume setup
            for (const leagueInfo of user.leagues) {
              const league = await api<League>(`/api/leagues/${leagueInfo.id}`);
              if (!league.activatedAt) {
                setLeagueId(leagueInfo.id);
                
                // Route to appropriate step based on league state
                if (!league.guildId) {
                  setCurrentStep('discord');
                } else if (!league.sleeperLeagueId) {
                  setCurrentStep('sleeper');
                } else if (!league.rulesIndexed) {
                  setCurrentStep('rules');
                } else {
                  setCurrentStep('rules'); // Complete activation
                }
                return;
              }
            }
            // All leagues complete - go to app
            setLocation('/app');
          } else {
            // No leagues - start fresh setup
            setCurrentStep('discord');
          }
        } else {
          toast.error('Account not found. Please contact support.');
        }
      } catch (e: any) {
        console.error('[Session Exchange]', e);
        toast.error('Failed to establish session');
        setPasswordError('Failed to establish session');
      }
    } catch (e: any) {
      console.error('[Sign In]', e);
      const errorMsg = e.message || 'Failed to sign in';
      toast.error(errorMsg);
      setPasswordError(errorMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateAccount = async () => {
    setPasswordError(null);

    if (!accountEmail.trim() || !accountName.trim()) {
      toast.error('Please provide your email and name');
      return;
    }

    if (!accountPassword || !accountPasswordConfirm) {
      setPasswordError('Please enter and confirm your password');
      toast.error('Please enter and confirm your password');
      return;
    }

    if (accountPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (accountPassword !== accountPasswordConfirm) {
      setPasswordError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    setIsCreatingAccount(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: accountEmail,
        password: accountPassword,
      });

      if (error) {
        toast.error(error.message || 'Failed to create account');
        setPasswordError(error.message || 'Failed to create account');
        return;
      }

      if (!data.user) {
        toast.error('Signup failed - no user returned');
        setPasswordError('Signup failed');
        return;
      }

      const result = await api<{ ok: boolean; accountId: string }>(
        '/api/v2/setup/account',
        {
          method: 'POST',
          body: JSON.stringify({
            email: accountEmail,
            name: accountName,
            supabaseUserId: data.user.id,
          }),
        }
      );

      if (result.ok && result.accountId) {
        setAccountId(result.accountId);

        if (data.session?.access_token) {
          try {
            await api('/api/auth/session', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${data.session.access_token.trim()}`,
              },
            });
            toast.success('Account created successfully!');
          } catch (sessionError) {
            console.error('[Session Exchange]', sessionError);
            toast.info('Account created! You can sign in after confirming your email.');
            setNeedsEmailConfirmation(true);
          }
        } else {
          setNeedsEmailConfirmation(true);
          toast.info('Please check your email to verify your account. You can continue setup anyway.');
        }
        
        setCurrentStep('discord');
      }
    } catch (e: any) {
      console.error('[Create Account]', e);
      const errorMsg = e.message || 'Failed to create account';
      toast.error(errorMsg);
      setPasswordError(errorMsg);
    } finally {
      setIsCreatingAccount(false);
    }
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
    // Defensive validation: ensure Discord is properly configured
    if (!selectedGuildId || !selectedChannelId) {
      toast.error('Discord configuration incomplete. Please complete Discord setup.');
      return;
    }
    
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
    { id: 'account', name: 'Account', completed: currentStep !== 'account' },
    { id: 'discord', name: 'Discord', completed: currentStep !== 'account' && currentStep !== 'discord' },
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
              {currentStep === 'account' && 'Create Your Account'}
              {currentStep === 'discord' && 'Connect Discord'}
              {currentStep === 'sleeper' && 'Connect Sleeper (Optional)'}
              {currentStep === 'rules' && 'Index Your Rules'}
              {currentStep === 'complete' && 'Setup Complete!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 'account' && (
              <div className="space-y-4" data-testid="setup-step-account">
                <p className="text-[#9CA3AF] text-sm">
                  Create your account to get started with THE COMMISH
                </p>

                <div>
                  <Label className="text-[#F5F7FA]">Email</Label>
                  <Input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-[#1f2937] border-[#374151] text-[#F5F7FA]"
                    data-testid="input-account-email"
                  />
                </div>

                <div>
                  <Label className="text-[#F5F7FA]">Name</Label>
                  <Input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Your Name"
                    className="bg-[#1f2937] border-[#374151] text-[#F5F7FA]"
                    data-testid="input-account-name"
                  />
                </div>

                <div>
                  <Label className="text-[#F5F7FA]">Password</Label>
                  <Input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => {
                      setAccountPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="At least 8 characters"
                    className="bg-[#1f2937] border-[#374151] text-[#F5F7FA]"
                    data-testid="input-account-password"
                  />
                </div>

                <div>
                  <Label className="text-[#F5F7FA]">Confirm Password</Label>
                  <Input
                    type="password"
                    value={accountPasswordConfirm}
                    onChange={(e) => {
                      setAccountPasswordConfirm(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Re-enter your password"
                    className="bg-[#1f2937] border-[#374151] text-[#F5F7FA]"
                    data-testid="input-account-password-confirm"
                  />
                </div>

                {passwordError && (
                  <div className="bg-red-900/20 border border-red-500 rounded p-3" data-testid="error-password">
                    <p className="text-red-400 text-sm">{passwordError}</p>
                  </div>
                )}

                <Button
                  onClick={handleCreateAccount}
                  disabled={isCreatingAccount || !accountEmail.trim() || !accountName.trim() || !accountPassword || !accountPasswordConfirm}
                  className="w-full"
                  data-testid="button-create-account"
                >
                  {isCreatingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#374151]" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#111820] text-[#6B7280]">Already have an account?</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[#9CA3AF] text-sm">
                    Already have an account?{' '}
                    <a 
                      href="/login" 
                      className="text-[#009898] hover:text-[#00b8b8] font-medium transition-colors"
                      data-testid="link-login"
                    >
                      Sign In
                    </a>
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'discord' && (
              <div className="space-y-4" data-testid="setup-step-discord">
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
                
                {!hasAttemptedAuth && guilds.length === 0 ? (
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
                ) : hasAttemptedAuth && guilds.length === 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-200 font-medium">No servers found where you have Manage Server permission</p>
                        <p className="text-xs text-yellow-200/70 mt-1">
                          Make sure you're an admin on at least one Discord server, or you may have granted permissions after authentication.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={fetchFreshGuilds}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-refresh-guilds"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Guilds
                      </Button>
                      <Button 
                        onClick={handleForceReauth}
                        variant="default"
                        className="flex-1"
                        data-testid="button-reauth-discord"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Re-authenticate
                      </Button>
                    </div>
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

                    {needsBotInstall && (
                      <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-200 mb-2">
                              THE COMMISH bot is not installed in this server
                            </p>
                            <p className="text-xs text-yellow-200/70 mb-3">
                              Click below to install the bot with the necessary permissions (View Channels, Send Messages, etc.)
                            </p>
                            <Button
                              onClick={handleInstallBot}
                              variant="default"
                              className="w-full"
                              data-testid="button-install-bot"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Install THE COMMISH in this server
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

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
              <div className="space-y-4" data-testid="setup-step-sleeper">
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
                    onClick={() => setCurrentStep('discord')}
                    variant="outline"
                    className="w-24"
                    data-testid="button-back-to-discord"
                  >
                    Back
                  </Button>
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
              <div className="space-y-4" data-testid="setup-step-rules">
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

                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStep('sleeper')}
                    variant="outline"
                    className="w-24"
                    data-testid="button-back-to-sleeper"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleIndexRules}
                    disabled={isIndexing || isActivating || !rulesContent.trim()}
                    className="flex-1"
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
                  onClick={() => {
                    // Store league ID for beta dashboard
                    if (leagueId) {
                      localStorage.setItem('selectedLeagueId', leagueId);
                    }
                    setLocation('/app');
                  }}
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
