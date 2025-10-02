import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus } from 'lucide-react';

export function WaiversPage() {
  const suggestions = [
    { id: 1, player: 'RB J. Rookie', team: 'BUF', pos: 'RB', faab: 18, note: 'Lead back while starter recovers' },
    { id: 2, player: 'WR T. Breakout', team: 'LAC', pos: 'WR', faab: 12, note: 'Targets rising 3 weeks straight' },
    { id: 3, player: 'TE R. Sleeper', team: 'KC', pos: 'TE', faab: 8, note: 'TE1 went to IR' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Waivers</h1>
          <p className="text-gray-600">Week 4 waiver wire suggestions</p>
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
              {suggestions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.player}</TableCell>
                  <TableCell>{s.team}</TableCell>
                  <TableCell>{s.pos}</TableCell>
                  <TableCell className="font-semibold text-[#009898]">${s.faab}</TableCell>
                  <TableCell className="text-sm text-gray-600">{s.note}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" data-testid={`button-add-${s.id}`}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Queue (Drag to Reorder)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No waivers queued yet. Add players from suggestions above.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
