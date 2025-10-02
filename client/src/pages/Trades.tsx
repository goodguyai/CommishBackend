import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function TradesPage() {
  const opportunities = [
    { id: 1, team: 'Gridiron Geeks', give: 'RB BenchGuy', get: 'WR T. Breakout', note: 'They need RB depth' },
    { id: 2, team: 'Touchdown Titans', give: 'TE Surplus', get: 'RB Flex Play', note: 'TE for RB swap' },
  ];

  const pending = [
    { id: 1, teams: ['Birds of Prey', 'Gridiron Geeks'], status: 'pending', fairness: 85 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Trades</h1>
          <p className="text-gray-600">Active offers and opportunities</p>
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
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">Trade with {opp.team}</div>
                  <Button size="sm" variant="ghost" data-testid={`button-propose-${opp.id}`}>
                    Propose
                  </Button>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  Give: <span className="font-medium">{opp.give}</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Get: <span className="font-medium">{opp.get}</span>
                </div>
                <div className="text-xs text-gray-500">{opp.note}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pending.map((trade) => (
              <div key={trade.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">
                    {trade.teams[0]} ↔ {trade.teams[1]}
                  </div>
                  <Badge variant={trade.fairness >= 80 ? 'success' : 'warning'}>
                    Fairness: {trade.fairness}%
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
        </CardContent>
      </Card>
    </div>
  );
}
