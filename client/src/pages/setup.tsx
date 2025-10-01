import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Check, CheckCircle, ExternalLink, Hash, Bot, Users, Trophy, Settings } from "lucide-react";

type SetupStep = "discord" | "sleeper" | "finish";

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
}

interface SleeperLeague {
  league_id: string;
  name: string;
  avatar: string | null;
  season: string;
}

interface SetupStatus {
  discord: {
    user: DiscordUser | null;
    selectedGuild: string | null;
    selectedChannel: string | null;
  };
  sleeper: {
    username: string | null;
    season: string | null;
    selectedLeague: string | null;
  };
  timezone: string | null;
}

export default function Setup() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<SetupStep>("discord");
  const [setupData, setSetupData] = useState<SetupStatus>({
    discord: { user: null, selectedGuild: null, selectedChannel: null },
    sleeper: { username: null, season: null, selectedLeague: null },
    timezone: null
  });
  const [sleeperUsername, setSleeperUsername] = useState("");
  const [sleeperSeason, setSleeperSeason] = useState(new Date().getFullYear().toString());
  const [availableLeagues, setAvailableLeagues] = useState<SleeperLeague[]>([]);
  const { toast} = useToast();

  // Check for OAuth errors in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    
    if (error === 'oauth_failed') {
      toast({
        title: "Discord Authentication Failed",
        description: "We couldn't connect to your Discord account. This may be due to permission issues or a cancelled login. Please try again.",
        variant: "destructive"
      });
      // Clean URL
      window.history.replaceState({}, '', '/setup');
    }
  }, [toast]);

  // Load setup status on mount
  const { data: status } = useQuery({
    queryKey: ["/api/setup/status"],
    refetchOnMount: true
  });

  useEffect(() => {
    if (status) {
      setSetupData(status as SetupStatus);
      if ((status as SetupStatus).sleeper.username) {
        setSleeperUsername((status as SetupStatus).sleeper.username || "");
      }
      if ((status as SetupStatus).sleeper.season) {
        setSleeperSeason((status as SetupStatus).sleeper.season || new Date().getFullYear().toString());
      }

      // Auto-advance steps based on completion
      if ((status as SetupStatus).discord.user && (status as SetupStatus).discord.selectedChannel) {
        if ((status as SetupStatus).sleeper.selectedLeague) {
          setCurrentStep("finish");
        } else {
          setCurrentStep("sleeper");
        }
      }
    }
  }, [status]);

  // Discord OAuth Mutations
  const discordAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/discord/user-auth-url`);
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast({
        title: "Discord Authentication Failed",
        description: "Failed to connect to Discord. Please try again.",
        variant: "destructive"
      });
    }
  });

  const botInstallMutation = useMutation({
    mutationFn: async (guildId: string) => {
      const response = await fetch(`/api/discord/bot-install-url?guildId=${guildId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate install URL');
      }
      return response.json();
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast({
        title: "Install THE COMMISH",
        description: "A new window opened. Please authorize the bot with the required permissions and return here to continue.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bot Installation Error",
        description: `Failed to start bot installation: ${error.message}. Please ensure you have administrator permissions in the server.`,
        variant: "destructive"
      });
    }
  });

  const setChannelMutation = useMutation({
    mutationFn: async ({ guildId, channelId, timezone }: { guildId: string; channelId: string; timezone?: string }) => {
      return await apiRequest("POST", "/api/setup/discord", {
        guildId, 
        channelId,
        timezone: timezone || "America/New_York"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/setup/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discord/me"] });
      setCurrentStep("sleeper");
      toast({
        title: "Discord Setup Complete",
        description: "Channel configured! Bot commands registered and welcome message posted. 🎉"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Channel Configuration Failed",
        description: `Failed to configure channel: ${error.message}. Please ensure the bot has permission to access this channel.`,
        variant: "destructive"
      });
    }
  });

  // Sleeper Mutations
  const findLeaguesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sleeper/leagues?username=${encodeURIComponent(sleeperUsername)}&season=${sleeperSeason}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leagues');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      setAvailableLeagues(data.leagues || []);
      if (!data.leagues || data.leagues.length === 0) {
        toast({
          title: "No Leagues Found",
          description: `No leagues found for ${sleeperUsername} in ${sleeperSeason}`,
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Sleeper User Not Found",
        description: "Could not find that Sleeper username. Please check and try again.",
        variant: "destructive"
      });
    }
  });

  const selectLeagueMutation = useMutation({
    mutationFn: async (sleeperLeagueId: string) => {
      return await apiRequest("POST", "/api/setup/sleeper", {
        sleeperLeagueId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/setup/status"] });
      setCurrentStep("finish");
      toast({
        title: "League Connected! 🏈",
        description: "Sleeper league linked successfully. Data sync started."
      });
    }
  });

  // Final Setup
  const finishSetupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/setup/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Setup Complete! 🎉",
        description: "THE COMMISH is now active in your Discord server!"
      });
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Setup Failed",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Fetch Discord data
  const { data: discordUser } = useQuery({
    queryKey: ["/api/discord/me"],
    enabled: !!setupData.discord.user
  });

  const guildsQuery = useQuery({
    queryKey: ["/api/discord/my-guilds"],
    enabled: !!setupData.discord.user,
    retry: 1
  });

  const guildStatusQuery = useQuery({
    queryKey: ["/api/discord/guild-status", setupData.discord.selectedGuild],
    enabled: !!setupData.discord.selectedGuild,
    retry: 1
  });

  const channelsQuery = useQuery({
    queryKey: ["/api/discord/channels", setupData.discord.selectedGuild],
    enabled: !!setupData.discord.selectedGuild && !!(guildStatusQuery.data as any)?.installed,
    retry: 1
  });

  // Error handling for Discord API queries (React Query v5 pattern)
  useEffect(() => {
    if (guildsQuery.isError) {
      toast({
        title: "Failed to Load Servers",
        description: "Unable to fetch your Discord servers. This may be a permission issue or network problem. Please try reconnecting your Discord account.",
        variant: "destructive"
      });
    }
  }, [guildsQuery.isError, toast]);

  useEffect(() => {
    if (guildStatusQuery.isError) {
      toast({
        title: "Failed to Check Bot Status",
        description: "Unable to verify if the bot is installed. Please ensure you have permissions to manage this server and try again.",
        variant: "destructive"
      });
    }
  }, [guildStatusQuery.isError, toast]);

  useEffect(() => {
    if (channelsQuery.isError) {
      toast({
        title: "Failed to Load Channels",
        description: "Unable to fetch channels from Discord. This usually means the bot lacks 'View Channels' permission. Please check bot permissions in Server Settings → Roles.",
        variant: "destructive"
      });
    }
  }, [channelsQuery.isError, toast]);

  // Destructure data for backwards compatibility
  const guilds = guildsQuery.data;
  const guildStatus = guildStatusQuery.data;
  const channelsData = channelsQuery.data;

  const stepOrder: SetupStep[] = ["discord", "sleeper", "finish"];
  const currentStepIndex = stepOrder.indexOf(currentStep);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {stepOrder.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        
        return (
          <div key={step} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full border-2
              ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isCurrent ? 'bg-primary border-primary text-primary-foreground' :
                'bg-background border-muted-foreground text-muted-foreground'}
            `}>
              {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            {index < stepOrder.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${
                isCompleted ? 'bg-green-500' : 'bg-muted'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDiscordStep = () => (
    <Card className="max-w-2xl mx-auto" data-testid="discord-setup-card">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-[#5865F2] rounded-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl">Connect Discord</CardTitle>
        <CardDescription>
          First, we'll connect your Discord account and install THE COMMISH bot in your server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!setupData.discord.user ? (
          <div className="text-center">
            <Button 
              onClick={() => discordAuthMutation.mutate()} 
              size="lg"
              className="bg-[#5865F2] hover:bg-[#4752C4]"
              disabled={discordAuthMutation.isPending}
              data-testid="connect-discord-button"
            >
              <Bot className="w-5 h-5 mr-2" />
              {discordAuthMutation.isPending ? "Connecting..." : "Connect with Discord"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Connected as {(discordUser as any)?.username}#{(discordUser as any)?.discriminator}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Discord account linked successfully
                </p>
              </div>
            </div>

            {guilds && Array.isArray(guilds) && guilds.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Select Your Discord Server</Label>
                <div className="grid gap-3">
                  {guilds.map((guild: DiscordGuild) => (
                    <div
                      key={guild.id}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-colors
                        ${setupData.discord.selectedGuild === guild.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'}
                      `}
                      onClick={() => {
                        setSetupData(prev => ({
                          ...prev,
                          discord: { ...prev.discord, selectedGuild: guild.id }
                        }));
                      }}
                      data-testid={`guild-${guild.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <Hash className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-medium">{guild.name}</p>
                            <p className="text-sm text-muted-foreground">Discord Server</p>
                          </div>
                        </div>
                        {setupData.discord.selectedGuild === guild.id && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {setupData.discord.selectedGuild && guildStatus && (
              <div className="space-y-4">
                {!((guildStatus as any)?.installed) ? (
                  <Alert>
                    <Bot className="w-4 h-4" />
                    <AlertDescription>
                      THE COMMISH bot needs to be installed in your server.
                      <Button
                        onClick={() => botInstallMutation.mutate(setupData.discord.selectedGuild!)}
                        variant="link"
                        className="p-0 h-auto ml-1"
                        data-testid="install-bot-button"
                      >
                        Install bot <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          Bot Installed Successfully
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          THE COMMISH is ready to work in your server
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-medium">Choose Home Channel</Label>
                      {((channelsData as any)?.channels || []).length === 0 ? (
                        <Alert variant="destructive">
                          <AlertDescription>
                            No channels available. This usually means the bot doesn't have permission to view channels in this server. Please:
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                              <li>Go to Server Settings → Roles</li>
                              <li>Find "THE COMMISH" role</li>
                              <li>Enable "View Channels" permission</li>
                              <li>Refresh this page</li>
                            </ol>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Select 
                            value={setupData.discord.selectedChannel || ""} 
                            onValueChange={(channelId) => 
                              setChannelMutation.mutate({ 
                                guildId: setupData.discord.selectedGuild!, 
                                channelId 
                              })
                            }
                          >
                            <SelectTrigger data-testid="channel-select">
                              <SelectValue placeholder="Select a channel..." />
                            </SelectTrigger>
                            <SelectContent>
                              {((channelsData as any)?.channels || []).map((channel: any) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  # {channel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">
                            This is where THE COMMISH will post league updates and respond to commands.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSleeperStep = () => (
    <Card className="max-w-2xl mx-auto" data-testid="sleeper-setup-card">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-[#00D2FF] rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl">Connect Sleeper League</CardTitle>
        <CardDescription>
          Link your Sleeper fantasy football league so THE COMMISH can access your data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sleeper-username">Sleeper Username</Label>
              <Input
                id="sleeper-username"
                value={sleeperUsername}
                onChange={(e) => setSleeperUsername(e.target.value)}
                placeholder="Enter your Sleeper username"
                data-testid="sleeper-username-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleeper-season">Season</Label>
              <Select value={sleeperSeason} onValueChange={setSleeperSeason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => findLeaguesMutation.mutate()}
            disabled={!sleeperUsername || findLeaguesMutation.isPending}
            className="w-full"
            data-testid="find-leagues-button"
          >
            {findLeaguesMutation.isPending ? "Searching..." : "Find My Leagues"}
          </Button>
        </div>

        {availableLeagues.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Your League</Label>
              <div className="grid gap-3">
                {availableLeagues.map((league) => (
                  <div
                    key={league.league_id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${setupData.sleeper.selectedLeague === league.league_id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'}
                    `}
                    onClick={() => selectLeagueMutation.mutate(league.league_id)}
                    data-testid={`league-${league.league_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-medium">{league.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {league.season} Season
                          </p>
                        </div>
                      </div>
                      {setupData.sleeper.selectedLeague === league.league_id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderFinishStep = () => (
    <Card className="max-w-2xl mx-auto" data-testid="finish-setup-card">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl">Ready to Launch!</CardTitle>
        <CardDescription>
          Review your setup and activate THE COMMISH for your fantasy league.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Discord Server</span>
              <Badge variant="secondary">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Sleeper League</span>
              <Badge variant="secondary">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Bot Permissions</span>
              <Badge variant="secondary">Granted</Badge>
            </div>
          </div>

          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Everything looks good! THE COMMISH will be installed with slash commands and 
              will post a welcome message in your selected channel.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => finishSetupMutation.mutate()}
            disabled={finishSetupMutation.isPending}
            size="lg"
            className="w-full"
            data-testid="finish-setup-button"
          >
            {finishSetupMutation.isPending ? "Setting up..." : "Activate THE COMMISH! 🏈"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Setup THE COMMISH</h1>
        <p className="text-muted-foreground">
          Connect your Discord server and Sleeper league in just a few steps
        </p>
      </div>

      {renderStepIndicator()}

      <div className="min-h-[600px]">
        {currentStep === "discord" && renderDiscordStep()}
        {currentStep === "sleeper" && renderSleeperStep()}
        {currentStep === "finish" && renderFinishStep()}
      </div>

      <div className="flex justify-between mt-8 max-w-2xl mx-auto">
        <Button
          variant="outline"
          onClick={() => {
            const prevIndex = currentStepIndex - 1;
            if (prevIndex >= 0) {
              setCurrentStep(stepOrder[prevIndex]);
            }
          }}
          disabled={currentStepIndex === 0}
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={() => {
            const nextIndex = currentStepIndex + 1;
            if (nextIndex < stepOrder.length) {
              setCurrentStep(stepOrder[nextIndex]);
            }
          }}
          disabled={
            currentStepIndex === stepOrder.length - 1 ||
            (currentStep === "discord" && !setupData.discord.selectedChannel) ||
            (currentStep === "sleeper" && !setupData.sleeper.selectedLeague)
          }
          data-testid="next-button"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}