import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface WaiverSuggestion {
  id: string;
  player: string;
  team: string;
  pos: string;
  suggestFaab: number;
  note: string;
}

export function WaiversPage() {
  const { data: suggestions, isLoading } = useQuery<WaiverSuggestion[]>({
    queryKey: ['/api/mock/waivers/suggestions'],
  });

  const { waiverQueue, addWaiverToQueue } = useAppStore();

  const handleAddToQueue = (suggestion: WaiverSuggestion) => {
    addWaiverToQueue({
      id: suggestion.id,
      player: suggestion.player,
      team: suggestion.team,
      pos: suggestion.pos,
      priority: waiverQueue.length + 1,
      faab: suggestion.suggestFaab,
      note: suggestion.note,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Waivers</h1>
          <p className="text-text-secondary">Week 4 waiver wire suggestions</p>
        </div>
        <Button data-testid="button-simulate" className="bg-gradient-cta text-white shadow-depth1 hover:shadow-depth2">
          Simulate Results
        </Button>
      </div>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Top Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border-subtle hover:bg-surface-hover">
                  <TableHead className="text-text-secondary">Player</TableHead>
                  <TableHead className="text-text-secondary">Team</TableHead>
                  <TableHead className="text-text-secondary">Pos</TableHead>
                  <TableHead className="text-text-secondary">Suggested FAAB</TableHead>
                  <TableHead className="text-text-secondary">Note</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions?.map((s) => (
                  <TableRow key={s.id} className="border-border-subtle hover:bg-surface-hover">
                    <TableCell className="font-medium text-text-primary">{s.player}</TableCell>
                    <TableCell className="text-text-secondary">{s.team}</TableCell>
                    <TableCell className="text-text-secondary">{s.pos}</TableCell>
                    <TableCell className="font-semibold text-brand-teal">${s.suggestFaab}</TableCell>
                    <TableCell className="text-sm text-text-muted">{s.note}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddToQueue(s)}
                        data-testid={`button-add-${s.id}`}
                        className="text-brand-teal hover:bg-surface-hover"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Your Queue ({waiverQueue.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {waiverQueue.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              No waivers queued yet. Add players from suggestions above.
            </div>
          ) : (
            <div className="space-y-2">
              {waiverQueue.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-surface-elevated border border-border-subtle rounded-lg shadow-depth1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-muted">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-text-primary">{item.player}</div>
                      <div className="text-sm text-text-secondary">{item.team} - {item.pos}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-brand-teal">${item.faab}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
