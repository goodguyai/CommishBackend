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
          <h1 className="text-2xl font-bold text-text-primary mb-1">Trades</h1>
          <p className="text-text-secondary">Active offers and opportunities</p>
        </div>
        <Button data-testid="button-create-trade" className="bg-gradient-cta text-white shadow-depth1 hover:shadow-depth2">
          Create Offer
        </Button>
      </div>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Trade Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {oppsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities?.map((opp) => (
                <div key={opp.id} className="p-4 border border-border-subtle rounded-lg bg-surface-elevated shadow-depth1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-text-primary">Trade with Team {opp.targetTeamId}</div>
                    <Button size="sm" variant="ghost" data-testid={`button-propose-${opp.id}`} className="text-brand-teal hover:bg-surface-hover">
                      Propose
                    </Button>
                  </div>
                  <div className="text-sm text-text-secondary mb-1">
                    Give: <span className="font-medium text-text-primary">{opp.give.join(', ')}</span>
                  </div>
                  <div className="text-sm text-text-secondary mb-2">
                    Get: <span className="font-medium text-text-primary">{opp.get.join(', ')}</span>
                  </div>
                  <div className="text-xs text-text-muted">{opp.rationale}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Pending Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="space-y-4">
              {[1].map((i) => (
                <Skeleton key={i} className="h-20 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {pending?.filter(t => t.status === 'pending').map((trade) => (
                <div key={trade.id} className="p-4 border border-border-subtle rounded-lg bg-surface-elevated shadow-depth1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-text-primary">
                      {trade.teams[0]} ↔ {trade.teams[1]}
                    </div>
                    <Badge 
                      variant={trade.fairnessScore >= 80 ? 'success' : 'warning'}
                      className={trade.fairnessScore >= 80 ? 'bg-brand-teal/20 text-brand-teal border-brand-teal/30' : 'bg-brand-gold/20 text-brand-gold border-brand-gold/30'}
                    >
                      Fairness: {trade.fairnessScore}%
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="secondary" data-testid={`button-review-${trade.id}`} className="bg-surface-hover text-text-primary hover:bg-surface-overlay">
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
