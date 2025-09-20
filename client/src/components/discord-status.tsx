import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

export function DiscordStatus() {
  const { data: healthData } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30000,
  });

  const isDiscordHealthy = healthData?.services?.discord === "configured";

  return (
    <Card data-testid="discord-status-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-foreground">Discord Integration</CardTitle>
        <Badge className={isDiscordHealthy ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
          {isDiscordHealthy ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
          <div className="w-10 h-10 bg-[#5865F2] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Fantasy Football League</p>
            <p className="text-sm text-muted-foreground">#the-commish • 247 members</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-400">Online</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Bot permissions</span>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">Configured</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Slash commands</span>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">Registered</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Ed25519 verification</span>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">Active</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="secondary" 
          className="w-full" 
          data-testid="button-manage-discord"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Manage Discord Settings
        </Button>
      </CardContent>
    </Card>
  );
}
