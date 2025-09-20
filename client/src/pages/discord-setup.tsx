import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, CheckCircle, AlertCircle, Users, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

export default function DiscordSetup() {
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [authData, setAuthData] = useState<{
    user: DiscordUser;
    guilds: DiscordGuild[];
  } | null>(null);
  const { toast } = useToast();

  // Set page title
  useEffect(() => {
    const titleElement = document.querySelector('.flex-1 h2');
    if (titleElement) {
      titleElement.textContent = 'Discord Setup';
    }
  }, []);

  // Get Discord auth URL
  const { data: authUrlData } = useQuery({
    queryKey: ["/api/discord/auth-url"],
    queryFn: () => {
      const redirectUri = `${window.location.origin}/discord-setup`;
      return fetch(`/api/discord/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`)
        .then(res => res.json());
    },
    enabled: !authData,
  });

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !authData) {
      handleOAuthCallback(code);
    }
  }, [authData]);

  const handleOAuthCallback = async (code: string) => {
    try {
      const redirectUri = `${window.location.origin}/discord-setup`;
      const response = await apiRequest("POST", "/api/discord/oauth-callback", {
        code,
        redirectUri,
      });
      const data = await response.json();
      setAuthData(data);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      toast({
        title: "Discord Connected",
        description: "Successfully connected to Discord. Now select a server to install the bot.",
      });
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with Discord",
        variant: "destructive",
      });
    }
  };

  const getBotInstallUrl = async (guildId: string) => {
    try {
      const redirectUri = `${window.location.origin}/discord-setup?installed=true`;
      const response = await fetch(
        `/api/discord/bot-install-url?guildId=${guildId}&redirectUri=${encodeURIComponent(redirectUri)}`
      );
      const data = await response.json();
      return data.installUrl;
    } catch (error) {
      console.error("Failed to get bot install URL:", error);
      return null;
    }
  };

  const handleInstallBot = async (guildId: string) => {
    const installUrl = await getBotInstallUrl(guildId);
    if (installUrl) {
      window.location.href = installUrl;
    } else {
      toast({
        title: "Error",
        description: "Failed to generate bot install URL",
        variant: "destructive",
      });
    }
  };

  const canManageGuild = (guild: DiscordGuild) => {
    return guild.owner || (parseInt(guild.permissions) & 0x20) !== 0; // Admin or Manage Server
  };

  const eligibleGuilds = authData?.guilds.filter(canManageGuild) || [];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Discord Setup</h2>
        <p className="text-muted-foreground mt-2">
          Connect THE COMMISH to your Discord server for seamless fantasy league management.
        </p>
      </div>

      {!authData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#5865F2] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span>Step 1: Connect Your Discord Account</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              First, we need to connect your Discord account to see which servers you can manage.
            </p>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                We only request permission to see your identity and server list. 
                We cannot read messages or access other private information.
              </AlertDescription>
            </Alert>

            {authUrlData?.authUrl && (
              <Button 
                asChild 
                className="w-full sm:w-auto" 
                data-testid="button-connect-discord"
              >
                <a href={authUrlData.authUrl}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Discord Account
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-semibold">
                  {authData.user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Connected as {authData.user.username}#{authData.user.discriminator}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {eligibleGuilds.length} manageable server{eligibleGuilds.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />
            </CardContent>
          </Card>

          {/* Server Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Step 2: Select Discord Server</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eligibleGuilds.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You don't have permission to manage any Discord servers. 
                    You need "Manage Server" or "Administrator" permissions to install THE COMMISH.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Choose the Discord server where you want to install THE COMMISH bot.
                  </p>
                  
                  <div className="grid gap-4">
                    {eligibleGuilds.map((guild) => (
                      <div
                        key={guild.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedGuild === guild.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedGuild(guild.id)}
                        data-testid={`guild-option-${guild.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                              <span className="font-semibold text-sm">
                                {guild.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{guild.name}</h4>
                              <div className="flex items-center space-x-2">
                                {guild.owner && (
                                  <Badge variant="outline" className="text-xs">Owner</Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">Admin</Badge>
                              </div>
                            </div>
                          </div>
                          {selectedGuild === guild.id && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedGuild && (
                    <div className="pt-4 border-t border-border">
                      <Button 
                        onClick={() => handleInstallBot(selectedGuild)}
                        className="w-full sm:w-auto"
                        data-testid="button-install-bot"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Install THE COMMISH Bot
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Installation Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">1</div>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to Discord to authorize the bot installation
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">2</div>
                <p className="text-sm text-muted-foreground">
                  THE COMMISH will join your server with minimal permissions
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">3</div>
                <p className="text-sm text-muted-foreground">
                  You'll select a home channel for bot interactions
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">4</div>
                <p className="text-sm text-muted-foreground">
                  Start using slash commands like /rules, /deadlines, and /scoring
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
