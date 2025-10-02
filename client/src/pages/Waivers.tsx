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
          <h1 className="text-2xl font-bold text-neutral-midnight mb-1">Waivers</h1>
          <p className="text-neutral-midnight/60">Week 4 waiver wire suggestions</p>
        </div>
        <Button data-testid="button-simulate">
          Simulate Results
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Pos</TableHead>
                  <TableHead>Suggested FAAB</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.player}</TableCell>
                    <TableCell>{s.team}</TableCell>
                    <TableCell>{s.pos}</TableCell>
                    <TableCell className="font-semibold text-brand-teal">${s.suggestFaab}</TableCell>
                    <TableCell className="text-sm text-neutral-midnight/60">{s.note}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddToQueue(s)}
                        data-testid={`button-add-${s.id}`}
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

      <Card>
        <CardHeader>
          <CardTitle>Your Queue ({waiverQueue.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {waiverQueue.length === 0 ? (
            <div className="text-center py-8 text-neutral-midnight/60">
              No waivers queued yet. Add players from suggestions above.
            </div>
          ) : (
            <div className="space-y-2">
              {waiverQueue.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-neutral-panel rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-midnight/60">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-neutral-midnight">{item.player}</div>
                      <div className="text-sm text-neutral-midnight/60">{item.team} - {item.pos}</div>
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
