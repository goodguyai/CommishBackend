import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import * as setupApi from '@/lib/setupApi';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export default function Setup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'account' | 'connections' | 'assignments'>('account');

  // Fetch setup state
  const { data: setupState, isLoading: isLoadingState } = useQuery({
    queryKey: ['/api/v2/setup/state'],
    queryFn: setupApi.getSetupState,
  });

  // Advance setup mutation
  const advanceMutation = useMutation({
    mutationFn: (step: 'account' | 'connections' | 'assignments') => setupApi.advanceSetup(step),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/setup/state'] });
    },
  });

  // Set current step based on setup state
  useEffect(() => {
    if (setupState) {
      setCurrentStep(setupState.nextStep);
    }
  }, [setupState]);

  if (isLoadingState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep === 'account' && setupState?.account.ready) {
      advanceMutation.mutate('connections');
      setCurrentStep('connections');
    } else if (currentStep === 'connections' && setupState?.discord.ready && setupState?.sleeper.ready) {
      advanceMutation.mutate('assignments');
      setCurrentStep('assignments');
    } else if (currentStep === 'assignments' && setupState?.assignments.ready) {
      setLocation('/app');
    }
  };

  return (
    <div className="min-h-screen bg-surface-base py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Setup The Commish</h1>
          <p className="text-text-secondary">Get your league connected in 3 easy steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          <StepIndicator
            number={1}
            title="Account"
            active={currentStep === 'account'}
            completed={setupState?.account.ready || false}
          />
          <div className="flex-1 h-0.5 bg-border-subtle mx-2" />
          <StepIndicator
            number={2}
            title="Connections"
            active={currentStep === 'connections'}
            completed={setupState?.discord.ready && setupState?.sleeper.ready || false}
          />
          <div className="flex-1 h-0.5 bg-border-subtle mx-2" />
          <StepIndicator
            number={3}
            title="Assignments"
            active={currentStep === 'assignments'}
            completed={setupState?.assignments.ready || false}
          />
        </div>

        {/* Step Content */}
        {currentStep === 'account' && (
          <StepAccount setupState={setupState} onNext={handleNext} />
        )}
        {currentStep === 'connections' && (
          <StepConnections setupState={setupState} onNext={handleNext} />
        )}
        {currentStep === 'assignments' && (
          <StepAssignments setupState={setupState} onNext={handleNext} />
        )}
      </div>
    </div>
  );
}

// Step Indicator Component
function StepIndicator({ number, title, active, completed }: { number: number; title: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-full w-10 h-10 flex items-center justify-center border-2 ${
        completed ? 'border-accent-green bg-accent-green text-white' :
        active ? 'border-accent-blue bg-accent-blue text-white' :
        'border-border-subtle bg-surface-base text-text-secondary'
      }`}>
        {completed ? <CheckCircle2 className="h-5 w-5" /> : <span>{number}</span>}
      </div>
      <span className={`mt-2 text-sm ${active ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
        {title}
      </span>
    </div>
  );
}

// Step A: Account Verification
function StepAccount({ setupState, onNext }: { setupState: any; onNext: () => void }) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Account Verification</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
          <Input
            value={setupState?.account.email || ''}
            disabled
            className="bg-surface-subtle"
            data-testid="input-account-email"
          />
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-accent-green" />
          <span className="text-text-secondary">Account verified and ready</span>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          onClick={onNext}
          disabled={!setupState?.account.ready}
          data-testid="button-next-account"
        >
          Next: Connect Services
        </Button>
      </div>
    </Card>
  );
}

// Step B: Discord & Sleeper Connections
function StepConnections({ setupState, onNext }: { setupState: any; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <DiscordConnection initialGuildId={setupState?.discord.guildId} initialChannelId={setupState?.discord.channelId} />
      <SleeperConnection initialLeagueId={setupState?.sleeper.leagueId} />
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()} data-testid="button-back">
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!setupState?.discord.ready || !setupState?.sleeper.ready}
          data-testid="button-next-connections"
        >
          Next: Assign Teams
        </Button>
      </div>
    </div>
  );
}

// Discord Connection Component
function DiscordConnection({ initialGuildId, initialChannelId }: { initialGuildId?: string | null; initialChannelId?: string | null }) {
  const { toast } = useToast();
  const [selectedGuildId, setSelectedGuildId] = useState(initialGuildId || '');
  const [selectedChannelId, setSelectedChannelId] = useState(initialChannelId || '');
  const [verified, setVerified] = useState(false);

  const { data: guilds } = useQuery({
    queryKey: ['/api/v2/discord/guilds'],
    queryFn: setupApi.getDiscordGuilds,
  });

  const { data: channels } = useQuery({
    queryKey: ['/api/v2/discord/channels', selectedGuildId],
    queryFn: () => setupApi.getDiscordChannels(selectedGuildId),
    enabled: !!selectedGuildId,
  });

  const selectMutation = useMutation({
    mutationFn: () => setupApi.selectDiscord(selectedGuildId, selectedChannelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/setup/state'] });
      toast({ title: 'Discord connected successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to connect Discord', description: error.message, variant: 'destructive' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => setupApi.verifyDiscord(selectedGuildId, selectedChannelId),
    onSuccess: () => {
      setVerified(true);
      toast({ title: 'Discord verified successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    if (!selectedGuildId || !selectedChannelId) return;
    selectMutation.mutate();
  };

  const handleVerify = () => {
    if (!selectedGuildId || !selectedChannelId) return;
    verifyMutation.mutate();
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Discord Connection</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Select Server</label>
          <Select value={selectedGuildId} onValueChange={setSelectedGuildId}>
            <SelectTrigger data-testid="select-discord-guild">
              <SelectValue placeholder="Choose a Discord server" />
            </SelectTrigger>
            <SelectContent>
              {guilds?.map((guild) => (
                <SelectItem key={guild.id} value={guild.id}>
                  {guild.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Select Channel</label>
          <Select value={selectedChannelId} onValueChange={setSelectedChannelId} disabled={!selectedGuildId}>
            <SelectTrigger data-testid="select-discord-channel">
              <SelectValue placeholder="Choose a text channel" />
            </SelectTrigger>
            <SelectContent>
              {channels?.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  #{channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!selectedGuildId || !selectedChannelId || selectMutation.isPending} data-testid="button-save-discord">
            {selectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button variant="outline" onClick={handleVerify} disabled={!selectedGuildId || !selectedChannelId || verifyMutation.isPending} data-testid="button-verify-discord">
            {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </Button>
          {verified && <CheckCircle2 className="h-5 w-5 text-accent-green ml-2" />}
        </div>
      </div>
    </Card>
  );
}

// Sleeper Connection Component
function SleeperConnection({ initialLeagueId }: { initialLeagueId?: string | null }) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [selectedLeagueId, setSelectedLeagueId] = useState(initialLeagueId || '');
  const [verified, setVerified] = useState(false);

  const lookupMutation = useMutation({
    mutationFn: (username: string) => setupApi.lookupSleeperUser(username),
    onSuccess: (user) => {
      setUserId(user.user_id);
      toast({ title: `Found user: ${user.display_name}` });
    },
    onError: (error: Error) => {
      toast({ title: 'User not found', description: error.message, variant: 'destructive' });
    },
  });

  const { data: leagues } = useQuery({
    queryKey: ['/api/v2/sleeper/leagues', userId],
    queryFn: () => setupApi.getSleeperLeagues(userId),
    enabled: !!userId,
  });

  const selectMutation = useMutation({
    mutationFn: () => setupApi.selectSleeperLeague(selectedLeagueId, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/setup/state'] });
      toast({ title: 'Sleeper league connected successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to connect Sleeper', description: error.message, variant: 'destructive' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => setupApi.verifySleeper(selectedLeagueId),
    onSuccess: () => {
      setVerified(true);
      toast({ title: 'Sleeper verified successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Sleeper Connection</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Sleeper Username</label>
          <div className="flex gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your Sleeper username"
              data-testid="input-sleeper-username"
            />
            <Button onClick={() => lookupMutation.mutate(username)} disabled={!username || lookupMutation.isPending} data-testid="button-lookup-sleeper">
              {lookupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
            </Button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Select League</label>
          <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId} disabled={!userId}>
            <SelectTrigger data-testid="select-sleeper-league">
              <SelectValue placeholder="Choose a league" />
            </SelectTrigger>
            <SelectContent>
              {leagues?.map((league) => (
                <SelectItem key={league.league_id} value={league.league_id}>
                  {league.name} ({league.season})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => selectMutation.mutate()} disabled={!selectedLeagueId || selectMutation.isPending} data-testid="button-save-sleeper">
            {selectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => verifyMutation.mutate()} disabled={!selectedLeagueId || verifyMutation.isPending} data-testid="button-verify-sleeper">
            {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </Button>
          {verified && <CheckCircle2 className="h-5 w-5 text-accent-green ml-2" />}
        </div>
      </div>
    </Card>
  );
}

// Step C: Assignments
function StepAssignments({ setupState, onNext }: { setupState: any; onNext: () => void }) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<setupApi.Assignment[]>([]);

  const { data: bootstrapData } = useQuery({
    queryKey: ['/api/v2/assignments/bootstrap', setupState?.sleeper.leagueId, setupState?.discord.guildId],
    queryFn: () => setupApi.getAssignmentsBootstrap(setupState?.sleeper.leagueId, setupState?.discord.guildId),
    enabled: !!setupState?.sleeper.leagueId && !!setupState?.discord.guildId,
  });

  // Initialize assignments with suggestions when bootstrap data is loaded
  useEffect(() => {
    if (bootstrapData?.suggestions) {
      setAssignments(bootstrapData.suggestions.map(s => ({
        sleeperOwnerId: s.sleeperOwnerId,
        discordUserId: s.discordUserId,
        sleeperTeamName: s.sleeperTeamName,
        discordUsername: s.discordUsername,
      })));
    }
  }, [bootstrapData]);

  const commitMutation = useMutation({
    mutationFn: () => setupApi.commitAssignments(assignments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/setup/state'] });
      toast({ title: 'Assignments saved successfully' });
      onNext();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save assignments', description: error.message, variant: 'destructive' });
    },
  });

  const handleAssignment = (sleeperOwnerId: string, discordUserId: string) => {
    const team = bootstrapData?.sleeperTeams.find(t => t.ownerId === sleeperOwnerId);
    const member = bootstrapData?.discordMembers.find(m => m.id === discordUserId);
    
    setAssignments(prev => {
      const existing = prev.find(a => a.sleeperOwnerId === sleeperOwnerId);
      if (existing) {
        return prev.map(a => 
          a.sleeperOwnerId === sleeperOwnerId
            ? { ...a, discordUserId, discordUsername: member?.username }
            : a
        );
      }
      return [...prev, {
        sleeperOwnerId,
        discordUserId,
        sleeperTeamName: team?.teamName,
        discordUsername: member?.username,
      }];
    });
  };

  const allAssigned = bootstrapData?.sleeperTeams.every(team => 
    assignments.find(a => a.sleeperOwnerId === team.ownerId)
  );

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Assign Discord Users to Teams</h2>
      <div className="space-y-4">
        {bootstrapData?.sleeperTeams.map((team) => {
          const assignment = assignments.find(a => a.sleeperOwnerId === team.ownerId);
          return (
            <div key={team.ownerId} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary">
                  {team.teamName}
                </label>
              </div>
              <div className="flex-1">
                <Select
                  value={assignment?.discordUserId || ''}
                  onValueChange={(value) => handleAssignment(team.ownerId, value)}
                >
                  <SelectTrigger data-testid={`select-assignment-${team.ownerId}`}>
                    <SelectValue placeholder="Choose Discord user" />
                  </SelectTrigger>
                  <SelectContent>
                    {bootstrapData?.discordMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()} data-testid="button-back-assignments">
          Back
        </Button>
        <Button
          onClick={() => commitMutation.mutate()}
          disabled={!allAssigned || commitMutation.isPending}
          data-testid="button-finish-setup"
        >
          {commitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finish Setup'}
        </Button>
      </div>
    </Card>
  );
}
