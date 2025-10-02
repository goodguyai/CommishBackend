import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Rule {
  id: number;
  title: string;
  body: string;
}

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([
    { id: 1, title: 'Trade Veto Policy', body: 'Trades require 4 veto votes within 24 hours...' },
    { id: 2, title: 'FAAB Budget', body: 'Season-long FAAB of 100. Ties broken by reverse standings...' },
    { id: 3, title: 'Keeper Rules', body: 'Keep up to 2 players. Cost is 1 round earlier than drafted...' },
  ]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleBody, setRuleBody] = useState('');

  const handleAddRule = () => {
    setEditingRule(null);
    setRuleTitle('');
    setRuleBody('');
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setRuleTitle(rule.title);
    setRuleBody(rule.body);
    setIsEditorOpen(true);
  };

  const handleSaveRule = () => {
    if (!ruleTitle.trim() || !ruleBody.trim()) {
      toast.error('Please fill in all fields', {
        description: 'Both title and body are required.',
      });
      return;
    }

    if (editingRule) {
      // Update existing rule
      setRules(rules.map(r => 
        r.id === editingRule.id 
          ? { ...r, title: ruleTitle, body: ruleBody }
          : r
      ));
      toast.success('Rule updated', {
        description: `Updated: ${ruleTitle}`,
      });
    } else {
      // Add new rule
      const newRule = {
        id: Math.max(...rules.map(r => r.id), 0) + 1,
        title: ruleTitle,
        body: ruleBody,
      };
      setRules([...rules, newRule]);
      toast.success('Rule added', {
        description: `Created: ${ruleTitle}`,
      });
    }

    setIsEditorOpen(false);
    setEditingRule(null);
    setRuleTitle('');
    setRuleBody('');
  };

  const handleDeleteRule = (ruleId: number) => {
    const rule = rules.find(r => r.id === ruleId);
    setRules(rules.filter(r => r.id !== ruleId));
    toast.success('Rule deleted', {
      description: `Removed: ${rule?.title}`,
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
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleEditRule(rule)}
                  className="text-brand-teal hover:bg-surface-hover" 
                  data-testid={`button-edit-${rule.id}`}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-brand-coral hover:bg-surface-hover" 
                  data-testid={`button-delete-${rule.id}`}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog 
        open={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        title={editingRule ? 'Edit Rule' : 'Add New Rule'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="rule-title" className="block text-sm font-medium text-text-primary mb-2">
              Rule Title
            </label>
            <Input
              id="rule-title"
              value={ruleTitle}
              onChange={(e) => setRuleTitle(e.target.value)}
              placeholder="e.g., Trade Deadline Policy"
              data-testid="input-rule-title"
              className="bg-surface-hover border-border-default text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div>
            <label htmlFor="rule-body" className="block text-sm font-medium text-text-primary mb-2">
              Rule Description
            </label>
            <textarea
              id="rule-body"
              value={ruleBody}
              onChange={(e) => setRuleBody(e.target.value)}
              placeholder="Describe the rule in detail..."
              rows={6}
              data-testid="input-rule-body"
              className="w-full px-3 py-2 bg-surface-hover border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button 
              variant="secondary" 
              onClick={() => setIsEditorOpen(false)}
              data-testid="button-cancel"
              className="border border-border-default hover:bg-surface-hover"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRule}
              data-testid="button-save-rule"
              className="bg-brand-teal text-white hover:bg-brand-teal/90"
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
