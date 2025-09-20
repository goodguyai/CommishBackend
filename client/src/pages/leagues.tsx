import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Settings, Users } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect } from "react";

interface League {
  id: string;
  name: string;
  platform: string;
  sleeperLeagueId?: string;
  guildId?: string;
  channelId?: string;
  timezone: string;
  featureFlags: Record<string, boolean>;
  createdAt: string;
}

export default function Leagues() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLeague, setNewLeague] = useState({
    name: "",
    sleeperLeagueId: "",
    timezone: "America/New_York",
  });
  const { toast } = useToast();

  // Set page title
  useEffect(() => {
    const titleElement = document.querySelector('.flex-1 h2');
    if (titleElement) {
      titleElement.textContent = 'Leagues';
    }
  }, []);

  const { data: leagues, isLoading } = useQuery({
    queryKey: ["/api/leagues"],
    queryFn: () => {
      // This would need an account ID from auth context
      // For now, return empty array
      return Promise.resolve([]);
    },
  });

  const createLeagueMutation = useMutation({
    mutationFn: async (leagueData: any) => {
      return apiRequest("POST", "/api/leagues", leagueData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      setIsCreateDialogOpen(false);
      setNewLeague({ name: "", sleeperLeagueId: "", timezone: "America/New_York" });
      toast({
        title: "League Created",
        description: "Your league has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create league",
        variant: "destructive",
      });
    },
  });

  const handleCreateLeague = () => {
    if (!newLeague.name.trim()) {
      toast({
        title: "Error",
        description: "League name is required",
        variant: "destructive",
      });
      return;
    }

    createLeagueMutation.mutate({
      accountId: "temp-account-id", // This would come from auth context
      name: newLeague.name,
      sleeperLeagueId: newLeague.sleeperLeagueId || undefined,
      timezone: newLeague.timezone,
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-32"></div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-secondary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-foreground">Leagues</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-league">
              <Plus className="w-4 h-4 mr-2" />
              Create League
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New League</DialogTitle>
              <DialogDescription>
                Set up a new fantasy league to manage with THE COMMISH.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="league-name">League Name</Label>
                <Input
                  id="league-name"
                  value={newLeague.name}
                  onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                  placeholder="Enter league name"
                  data-testid="input-league-name"
                />
              </div>
              <div>
                <Label htmlFor="sleeper-id">Sleeper League ID (Optional)</Label>
                <Input
                  id="sleeper-id"
                  value={newLeague.sleeperLeagueId}
                  onChange={(e) => setNewLeague({ ...newLeague, sleeperLeagueId: e.target.value })}
                  placeholder="123456789"
                  data-testid="input-sleeper-id"
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={newLeague.timezone}
                  onChange={(e) => setNewLeague({ ...newLeague, timezone: e.target.value })}
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                  data-testid="select-timezone"
                >
                  <option value="America/New_York">Eastern (EST/EDT)</option>
                  <option value="America/Chicago">Central (CST/CDT)</option>
                  <option value="America/Denver">Mountain (MST/MDT)</option>
                  <option value="America/Los_Angeles">Pacific (PST/PDT)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateLeague}
                  disabled={createLeagueMutation.isPending}
                  data-testid="button-submit-league"
                >
                  {createLeagueMutation.isPending ? "Creating..." : "Create League"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {leagues?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Leagues Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first league to start managing your fantasy sports with AI-powered assistance.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-league">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First League
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {leagues?.map((league: League) => (
            <Card key={league.id} data-testid={`league-card-${league.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{league.name}</CardTitle>
                  <Badge variant="secondary">{league.platform}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Timezone:</span>
                    <span className="ml-2 font-medium text-foreground">{league.timezone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {new Date(league.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {league.sleeperLeagueId && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Sleeper Integration</p>
                      <p className="text-sm text-muted-foreground">ID: {league.sleeperLeagueId}</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Connected
                    </Badge>
                  </div>
                )}

                {league.guildId && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Discord Integration</p>
                      <p className="text-sm text-muted-foreground">
                        {league.channelId ? `Channel configured` : "No channel set"}
                      </p>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      Connected
                    </Badge>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Features: {Object.values(league.featureFlags || {}).filter(Boolean).length} enabled
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" data-testid={`button-manage-${league.id}`}>
                      <Settings className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                    {league.sleeperLeagueId && (
                      <Button variant="outline" size="sm" asChild>
                        <a 
                          href={`https://sleeper.app/leagues/${league.sleeperLeagueId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-sleeper-${league.id}`}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Sleeper
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
