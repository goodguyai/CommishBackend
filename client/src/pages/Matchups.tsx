import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

export function MatchupsPage() {
  const matchups = [
    { home: 'Birds of Prey', away: 'Gridiron Geeks', homeProj: 122.4, awayProj: 116.7, note: 'Close matchup' },
    { home: 'The Replacements', away: 'End Zone Elite', homeProj: 108.2, awayProj: 114.5, note: 'Away favored' },
    { home: 'Touchdown Titans', away: 'Field Goal Fanatics', homeProj: 131.8, awayProj: 119.3, note: 'High scoring' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Matchups</h1>
        <p className="text-text-secondary">Weekly projections and analysis</p>
      </div>

      <Tabs defaultValue="4" className="bg-surface-base">
        <TabsList className="bg-surface-elevated border border-border-subtle">
          {[1, 2, 3, 4, 5].map((w) => (
            <TabsTrigger 
              key={w} 
              value={String(w)}
              className="data-[state=active]:bg-brand-teal data-[state=active]:text-white text-text-secondary"
            >
              Week {w}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="4">
          <div className="grid gap-4">
            {matchups.map((m, i) => (
              <Card key={i} className="bg-surface-card border-border-subtle shadow-depth2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-right">
                      <div className="font-medium text-text-primary">{m.home}</div>
                      <div className="text-2xl font-bold text-brand-teal mt-1">{m.homeProj}</div>
                    </div>
                    <div className="text-center text-text-muted">vs</div>
                    <div>
                      <div className="font-medium text-text-primary">{m.away}</div>
                      <div className="text-2xl font-bold text-brand-teal mt-1">{m.awayProj}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-text-secondary border-t border-border-subtle pt-3">
                    Coach Note: {m.note}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
