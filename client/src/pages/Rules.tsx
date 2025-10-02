import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export function RulesPage() {
  const rules = [
    { id: 1, title: 'Trade Veto Policy', body: 'Trades require 4 veto votes within 24 hours...' },
    { id: 2, title: 'FAAB Budget', body: 'Season-long FAAB of 100. Ties broken by reverse standings...' },
    { id: 3, title: 'Keeper Rules', body: 'Keep up to 2 players. Cost is 1 round earlier than drafted...' },
  ];

  const handleAddRule = () => {
    toast.info('Opening rule editor...', {
      description: 'Create a new league rule or policy.',
    });
  };

  const handleEditRule = (ruleId: number, ruleTitle: string) => {
    toast.info(`Editing: ${ruleTitle}`, {
      description: 'Opening rule editor with existing content.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Rules</h1>
          <p className="text-text-secondary">League constitution and policies</p>
        </div>
        <Button 
          onClick={handleAddRule}
          data-testid="button-add-rule" 
          className="bg-gradient-cta text-white shadow-depth1 hover:shadow-depth2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="bg-surface-card border-border-subtle shadow-depth2">
            <CardHeader>
              <CardTitle className="text-base text-text-primary">{rule.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{rule.body}</p>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleEditRule(rule.id, rule.title)}
                className="mt-3 text-brand-teal hover:bg-surface-hover" 
                data-testid={`button-edit-${rule.id}`}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
