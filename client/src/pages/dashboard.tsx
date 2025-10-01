import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DiscordStatus } from "@/components/discord-status";
import { SleeperStatus } from "@/components/sleeper-status";
import { RAGStatus } from "@/components/rag-status";
import { ActivityLog } from "@/components/activity-log";
import { OwnerMapping } from "@/components/owner-mapping";
import { Users, Book, Calendar, Bot, Terminal, Send, RefreshCw, FileText, PlayCircle, Database } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  // Set page title
  useEffect(() => {
    const titleElement = document.querySelector('.flex-1 h2');
    if (titleElement) {
      titleElement.textContent = 'Dashboard';
    }
  }, []);

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: () => fetch("/api/events?limit=10").then(res => res.json()),
  });

  const { data: leaguesData, isLoading: leaguesLoading } = useQuery({
    queryKey: ["/api/leagues"],
    queryFn: () => {
      // This would need an account ID - for now return empty
      return Promise.resolve([]);
    },
  });

  if (healthLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-32"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-secondary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card data-testid="card-active-leagues">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leagues</p>
                <p className="text-3xl font-bold text-foreground">
                  {leaguesData?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-rules-queries">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rules Queries</p>
                <p className="text-3xl font-bold text-foreground">127</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Book className="text-green-500 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-upcoming-deadlines">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</p>
                <p className="text-3xl font-bold text-foreground">5</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="text-amber-500 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-ai-tokens">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Tokens Used</p>
                <p className="text-3xl font-bold text-foreground">2.1K</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Bot className="text-purple-500 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <DiscordStatus />
        <SleeperStatus />
      </div>

      {/* Slash Commands Interface */}
      <Card className="mb-8" data-testid="slash-commands-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Available Slash Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono text-sm text-primary">/rules</span>
                <Badge variant="secondary" className="text-xs">Public</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Query league rules and constitution</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• RAG-powered responses</div>
                <div>• Citation requirements</div>
                <div>• Defer + follow-up pattern</div>
              </div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono text-sm text-primary">/deadlines</span>
                <Badge variant="secondary" className="text-xs">Public</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Show upcoming league deadlines</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Timezone-aware</div>
                <div>• Multiple sources</div>
                <div>• Ephemeral responses</div>
              </div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono text-sm text-primary">/scoring</span>
                <Badge variant="secondary" className="text-xs">Public</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Display current scoring settings</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Sleeper sync</div>
                <div>• Formatted tables</div>
                <div>• Quick reference</div>
              </div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg border border-amber-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono text-sm text-amber-400">/config</span>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-400">Commish Only</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Configure bot settings</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Feature flags</div>
                <div>• Channel settings</div>
                <div>• Permission controls</div>
              </div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg border border-amber-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono text-sm text-amber-400">/reindex</span>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-400">Commish Only</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Rebuild RAG index</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Force embedding refresh</div>
                <div>• Constitution parsing</div>
                <div>• Progress tracking</div>
              </div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono text-sm text-primary">/help</span>
                <Badge variant="secondary" className="text-xs">Public</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Show command help</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Command examples</div>
                <div>• Quick reference</div>
                <div>• Support links</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAG System & AI Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <RAGStatus />

        <Card data-testid="ai-status-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">AI Assistant (DeepSeek)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Model</span>
              <span className="text-sm font-medium text-foreground">deepseek-chat</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Function calling</span>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                Enabled
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Requests today:</span>
                <span className="ml-2 font-medium text-foreground">89</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg response:</span>
                <span className="ml-2 font-medium text-foreground">1.2s</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cache hits:</span>
                <span className="ml-2 font-medium text-green-400">67%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tokens used:</span>
                <span className="ml-2 font-medium text-foreground">2,147</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Token Usage (per league caps)</span>
                <span className="text-xs text-green-400">21% used</span>
              </div>
              <Progress value={21} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Developer Utilities */}
      <Card className="mb-8" data-testid="developer-utilities-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Developer Utilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UtilityButton
              icon={<RefreshCw className="w-4 h-4" />}
              title="Register Commands"
              description="Register slash commands to Discord"
              endpoint="/api/discord/register-commands"
              requiresGuildId
              testId="button-register-commands"
            />
            <UtilityButton
              icon={<Send className="w-4 h-4" />}
              title="Post Test Message"
              description="Send test message to channel"
              endpoint="/api/discord/post-test"
              requiresGuildId
              testId="button-post-test"
            />
            <UtilityButton
              icon={<PlayCircle className="w-4 h-4" />}
              title="Run Digest"
              description="Generate weekly digest for a league"
              endpoint="/api/digest/run"
              requiresLeagueId
              testId="button-run-digest"
            />
            <UtilityButton
              icon={<Database className="w-4 h-4" />}
              title="Sync Sleeper Data"
              description="Sync league data from Sleeper"
              endpointTemplate="/api/sleeper/sync/{leagueId}"
              requiresLeagueId
              testId="button-sync-sleeper"
            />
            <UtilityButton
              icon={<RefreshCw className="w-4 h-4" />}
              title="View Logs"
              description="Check application logs"
              onClick={() => window.open('/__logs', '_blank')}
              testId="button-view-logs"
            />
            <UtilityButton
              icon={<FileText className="w-4 h-4" />}
              title="Health Check"
              description="View system health status"
              onClick={() => window.open('/api/health', '_blank')}
              testId="button-health-check"
            />
          </div>
        </CardContent>
      </Card>

      {/* League Management */}
      <Card className="mb-8" data-testid="league-management-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">League Management</CardTitle>
        </CardHeader>
        <CardContent>
          <LeagueManagementSection />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <ActivityLog events={eventsData || []} isLoading={eventsLoading} />
    </div>
  );
}

function UtilityButton({ 
  icon, 
  title, 
  description, 
  endpoint, 
  endpointTemplate,
  requiresGuildId, 
  requiresLeagueId,
  onClick,
  testId 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  endpoint?: string;
  endpointTemplate?: string;
  requiresGuildId?: boolean;
  requiresLeagueId?: boolean;
  onClick?: () => void;
  testId: string;
}) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState("");
  const [showInput, setShowInput] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      let url = endpoint;
      
      // Build URL based on requirements
      if (endpointTemplate && requiresLeagueId && inputValue) {
        url = endpointTemplate.replace('{leagueId}', inputValue);
      } else if (requiresGuildId && inputValue) {
        url = `${endpoint}?guildId=${inputValue}`;
      } else if (requiresLeagueId && inputValue) {
        url = `${endpoint}?leagueId=${inputValue}`;
      }
      
      if (!url) return;
      
      const adminKey = prompt("Enter ADMIN_KEY:");
      if (!adminKey) throw new Error("Admin key required");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-admin-key": adminKey,
        },
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || "Request failed");
      }

      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data?.message || "Operation completed successfully",
      });
      setShowInput(false);
      setInputValue("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Operation failed",
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if ((requiresGuildId || requiresLeagueId) && !inputValue) {
      setShowInput(true);
    } else {
      mutation.mutate();
    }
  };

  const inputPlaceholder = requiresLeagueId ? "League ID" : "Guild ID";

  return (
    <div className="p-4 bg-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground mb-3">{description}</p>
          
          {showInput && (requiresGuildId || requiresLeagueId) ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-background border border-border rounded"
                data-testid={`input-${testId}`}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !inputValue}
                  className="text-xs h-7 flex-1"
                  data-testid={`${testId}-submit`}
                >
                  {mutation.isPending ? "Running..." : "Execute"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowInput(false);
                    setInputValue("");
                  }}
                  className="text-xs h-7"
                  data-testid={`${testId}-cancel`}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleClick}
              disabled={mutation.isPending}
              className="text-xs h-7 w-full"
              data-testid={testId}
            >
              {mutation.isPending ? "Running..." : "Run"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LeagueManagementSection() {
  const [leagueId, setLeagueId] = useState("");
  const [showOwnerMapping, setShowOwnerMapping] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Enter League ID"
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="league-id-input"
        />
        <Button
          onClick={() => setShowOwnerMapping(!!leagueId)}
          disabled={!leagueId}
          size="sm"
          data-testid="load-owner-mapping-button"
        >
          Load Owner Mapping
        </Button>
      </div>

      {showOwnerMapping && leagueId && (
        <OwnerMapping leagueId={leagueId} />
      )}
    </div>
  );
}
