import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export function RulesPage() {
  const rules = [
    { id: 1, title: 'Trade Veto Policy', body: 'Trades require 4 veto votes within 24 hours...' },
    { id: 2, title: 'FAAB Budget', body: 'Season-long FAAB of 100. Ties broken by reverse standings...' },
    { id: 3, title: 'Keeper Rules', body: 'Keep up to 2 players. Cost is 1 round earlier than drafted...' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-midnight mb-1">Rules</h1>
          <p className="text-neutral-midnight/60">League constitution and policies</p>
        </div>
        <Button data-testid="button-add-rule">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <CardTitle className="text-base">{rule.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-midnight/60">{rule.body}</p>
              <Button size="sm" variant="ghost" className="mt-3" data-testid={`button-edit-${rule.id}`}>
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
