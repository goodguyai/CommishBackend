import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Rule {
  id: string;
  title: string;
  body: string;
}

export function RulesPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleBody, setRuleBody] = useState('');

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ['/api/mock/rules'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/mock/rules', undefined);
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (rule: Partial<Rule>) => {
      const response = await apiRequest('POST', '/api/mock/rules/save', rule);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/mock/rules'] });
      const action = variables.id ? 'updated' : 'added';
      toast.success(`Rule ${action}`, {
        description: `${action === 'added' ? 'Created' : 'Updated'}: ${variables.title}`,
      });
      setIsEditorOpen(false);
      setEditingRule(null);
      setRuleTitle('');
      setRuleBody('');
    },
    onError: (error) => {
      toast.error('Failed to save rule', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await apiRequest('DELETE', `/api/mock/rules/${ruleId}`, undefined);
      return response.json();
    },
    onSuccess: (_, ruleId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/mock/rules'] });
      const rule = rules.find(r => r.id === ruleId);
      toast.success('Rule deleted', {
        description: `Removed: ${rule?.title}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to delete rule', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

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

    const ruleData: Partial<Rule> = {
      title: ruleTitle,
      body: ruleBody,
    };

    if (editingRule) {
      ruleData.id = editingRule.id;
    }

    saveMutation.mutate(ruleData);
  };

  const handleDeleteRule = (ruleId: string) => {
    deleteMutation.mutate(ruleId);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-surface-card border-border-subtle shadow-depth2">
              <CardHeader>
                <div className="h-5 w-48 bg-surface-hover animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-surface-hover animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-surface-hover animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
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
                  disabled={saveMutation.isPending || deleteMutation.isPending}
                  className="text-brand-teal hover:bg-surface-hover" 
                  data-testid={`button-edit-${rule.id}`}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleDeleteRule(rule.id)}
                  disabled={saveMutation.isPending || deleteMutation.isPending}
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
    );
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

      {renderContent()}

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
              disabled={saveMutation.isPending}
              data-testid="button-cancel"
              className="border border-border-default hover:bg-surface-hover"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRule}
              disabled={saveMutation.isPending}
              data-testid="button-save-rule"
              className="bg-brand-teal text-white hover:bg-brand-teal/90"
            >
              {saveMutation.isPending ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
