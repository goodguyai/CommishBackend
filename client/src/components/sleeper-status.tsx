import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function SleeperStatus() {
  const { toast } = useToast();

  // This would need a real league ID - using placeholder for now
  const mockLeagueId = "123456789";

  const { data: healthData } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sleeper/sync/${mockLeagueId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sleeper"] });
      toast({
        title: "Sync Complete",
        description: "Sleeper data has been synchronized successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Sleeper data",
        variant: "destructive",
      });
    },
  });

  const isSleeperHealthy = healthData?.services?.sleeper === "available";

  return (
    <Card data-testid="sleeper-status-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-foreground">Sleeper Integration</CardTitle>
        <Badge className={isSleeperHealthy ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}>
          {isSleeperHealthy ? "Synced" : "Pending"}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="p-3 bg-secondary rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">Dynasty League 2024</span>
            <span className="text-xs text-muted-foreground">ID: 123456789</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Teams:</span>
              <span>12</span>
            </div>
            <div className="flex justify-between">
              <span>Week:</span>
              <span>14</span>
            </div>
            <div className="flex justify-between">
              <span>Last sync:</span>
              <span>2 min ago</span>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Cache status:</span>
            <span className="text-green-400">Fresh</span>
          </div>
          <div className="flex justify-between">
            <span>API calls today:</span>
            <span>23/1000</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="secondary" 
            className="flex-1" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-force-sync"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? "Syncing..." : "Force Sync Now"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a 
              href={`https://sleeper.app/leagues/${mockLeagueId}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-sleeper-league"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
