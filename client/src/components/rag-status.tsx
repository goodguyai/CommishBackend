import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw } from "lucide-react";

export function RAGStatus() {
  // This would need a real league ID - using placeholder for now
  const mockLeagueId = "temp-league-id";

  const { data: ragStats, isLoading } = useQuery({
    queryKey: ["/api/rag/stats", mockLeagueId],
    queryFn: () => fetch(`/api/rag/stats/${mockLeagueId}`).then(res => res.json()),
    enabled: false, // Disable for now since we don't have a real league
  });

  return (
    <Card data-testid="rag-status-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">RAG System Status</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
          <div>
            <p className="font-medium text-foreground">Constitution v2.1</p>
            <p className="text-sm text-muted-foreground">Updated 3 days ago</p>
          </div>
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
            Indexed
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Sections:</span>
            <span className="ml-2 font-medium text-foreground">
              {ragStats?.rulesCount || 47}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Embeddings:</span>
            <span className="ml-2 font-medium text-foreground">
              {ragStats?.embeddingsCount || 312}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Vector dim:</span>
            <span className="ml-2 font-medium text-foreground">1536</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg similarity:</span>
            <span className="ml-2 font-medium text-foreground">0.84</span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Recent Queries</p>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">"What happens if someone misses the draft?"</div>
            <div className="text-xs text-muted-foreground">"Trade deadline rules for this year"</div>
            <div className="text-xs text-muted-foreground">"Playoff seeding tiebreakers"</div>
          </div>
        </div>

        <Button 
          variant="secondary" 
          className="w-full" 
          disabled={isLoading}
          data-testid="button-reindex-rag"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Reindex Constitution
        </Button>
      </CardContent>
    </Card>
  );
}
