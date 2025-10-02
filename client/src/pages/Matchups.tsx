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
        <h1 className="text-2xl font-bold text-neutral-midnight mb-1">Matchups</h1>
        <p className="text-neutral-midnight/60">Weekly projections and analysis</p>
      </div>

      <Tabs defaultValue="4">
        <TabsList>
          {[1, 2, 3, 4, 5].map((w) => (
            <TabsTrigger key={w} value={String(w)}>
              Week {w}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="4">
          <div className="grid gap-4">
            {matchups.map((m, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-right">
                      <div className="font-medium text-neutral-midnight">{m.home}</div>
                      <div className="text-2xl font-bold text-brand-teal mt-1">{m.homeProj}</div>
                    </div>
                    <div className="text-center text-neutral-midnight/40">vs</div>
                    <div>
                      <div className="font-medium text-neutral-midnight">{m.away}</div>
                      <div className="text-2xl font-bold text-brand-teal mt-1">{m.awayProj}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-neutral-midnight/60 border-t pt-3">
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
