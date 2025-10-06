import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { api } from '@/lib/apiApp';
import { queryClient } from '@/lib/queryClient';
import { ToggleLeft, ToggleRight } from 'lucide-react';

interface ReactionPolicy {
  enabled: boolean;
  description: string;
}

interface AutomationReactionsProps {
  leagueId: string;
}

export function AutomationReactions({ leagueId }: AutomationReactionsProps) {
  const [description, setDescription] = useState('');

  const { data: policy, isLoading } = useQuery<ReactionPolicy>({
    queryKey: ['/api/v2/automation/reactions', leagueId],
    queryFn: async () => {
      return await api(`/api/v2/automation/reactions/${leagueId}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ReactionPolicy>) => {
      return await api(`/api/v2/automation/reactions/${leagueId}`, {
        method: 'POST',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/automation/reactions', leagueId] });
      toast.success('Reaction automation updated', {
        description: 'Your settings have been saved',
      });
    },
    onError: (error) => {
      toast.error('Failed to update settings', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handleToggle = () => {
    if (policy) {
      updateMutation.mutate({ enabled: !policy.enabled });
    }
  };

  const handleSaveDescription = () => {
    if (!description.trim()) {
      toast.error('Description required', {
        description: 'Please enter a description',
      });
      return;
    }
    updateMutation.mutate({ description });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Reaction Automation</h1>
          <p className="text-gray-400">Loading settings...</p>
        </div>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-8">
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-gray-700 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Reaction Automation</h1>
        <p className="text-gray-400">Configure automated reactions to league events</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 font-medium">Enable Reactions</p>
              <p className="text-sm text-gray-400 mt-1">
                Automatically react to messages based on league events
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={updateMutation.isPending}
              className="transition-colors"
              data-testid="button-toggle-reactions"
            >
              {policy?.enabled ? (
                <ToggleRight className="w-12 h-12 text-green-500" />
              ) : (
                <ToggleLeft className="w-12 h-12 text-gray-500" />
              )}
            </button>
          </div>

          <div
            className={`px-4 py-3 rounded-lg ${
              policy?.enabled
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-gray-900 border border-gray-700'
            }`}
            data-testid="status-indicator"
          >
            <p className="text-sm font-medium text-gray-100">
              Status: {policy?.enabled ? 'Active' : 'Inactive'}
            </p>
            {policy?.description && (
              <p className="text-sm text-gray-400 mt-1">{policy.description}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Feature Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-100 mb-2">
              Describe how reactions should work
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., React with 🔥 on big plays, 💀 on injuries..."
              className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500"
              data-testid="input-description"
            />
          </div>
          <Button
            onClick={handleSaveDescription}
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-save-description"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Description'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
