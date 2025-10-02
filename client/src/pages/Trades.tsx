import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface TradeOpportunity {
  id: string;
  targetTeamId: string;
  give: string[];
  get: string[];
  rationale: string;
}

interface PendingTrade {
  id: string;
  teams: string[];
  status: string;
  fairnessScore: number;
}

export function TradesPage() {
  const { data: opportunities, isLoading: oppsLoading } = useQuery<TradeOpportunity[]>({
    queryKey: ['/api/mock/trades/opportunities'],
  });

  const { data: pending, isLoading: pendingLoading } = useQuery<PendingTrade[]>({
    queryKey: ['/api/mock/trades/log'],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-midnight mb-1">Trades</h1>
          <p className="text-neutral-midnight/60">Active offers and opportunities</p>
        </div>
        <Button data-testid="button-create-trade">
          Create Offer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {oppsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities?.map((opp) => (
                <div key={opp.id} className="p-4 border border-neutral-panel rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-neutral-midnight">Trade with Team {opp.targetTeamId}</div>
                    <Button size="sm" variant="ghost" data-testid={`button-propose-${opp.id}`}>
                      Propose
                    </Button>
                  </div>
                  <div className="text-sm text-neutral-midnight/60 mb-1">
                    Give: <span className="font-medium">{opp.give.join(', ')}</span>
                  </div>
                  <div className="text-sm text-neutral-midnight/60 mb-2">
                    Get: <span className="font-medium">{opp.get.join(', ')}</span>
                  </div>
                  <div className="text-xs text-neutral-midnight/60">{opp.rationale}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="space-y-4">
              {[1].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {pending?.filter(t => t.status === 'pending').map((trade) => (
                <div key={trade.id} className="p-4 border border-neutral-panel rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-neutral-midnight">
                      {trade.teams[0]} ↔ {trade.teams[1]}
                    </div>
                    <Badge variant={trade.fairnessScore >= 80 ? 'success' : 'warning'}>
                      Fairness: {trade.fairnessScore}%
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="secondary" data-testid={`button-review-${trade.id}`}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
