import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { api } from '@/lib/apiApp';
import { FileText, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface RecapResponse {
  markdown: string;
  week: number;
}

export function AIRecaps() {
  const { selectedLeagueId } = useAppStore();
  const [weekNumber, setWeekNumber] = useState<string>('');
  const [recap, setRecap] = useState<RecapResponse | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const week = parseInt(weekNumber);
      if (isNaN(week) || week < 1 || week > 18) {
        throw new Error('Please enter a valid week number (1-18)');
      }
      return await api('/api/ai/recap', {
        method: 'POST',
        body: JSON.stringify({ week, leagueId: selectedLeagueId }),
      });
    },
    onSuccess: (data) => {
      setRecap(data);
      toast.success('Recap generated', {
        description: `Week ${data.week} recap is ready`,
      });
    },
    onError: (error) => {
      toast.error('Failed to generate recap', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handleGenerate = () => {
    if (!weekNumber.trim()) {
      toast.error('Week number required', {
        description: 'Please enter a week number',
      });
      return;
    }
    generateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Weekly Recaps</h1>
        <p className="text-gray-400">Generate AI-powered weekly summaries</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Generate Recap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="week-number" className="block text-sm font-medium text-gray-100 mb-2">
              Week Number
            </label>
            <Input
              id="week-number"
              type="number"
              min="1"
              max="18"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              placeholder="Enter week number (1-18)"
              className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500"
              data-testid="input-week-number"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !weekNumber.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-generate"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generateMutation.isPending ? 'Generating...' : 'Generate Recap'}
          </Button>
        </CardContent>
      </Card>

      {generateMutation.isPending && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-8">
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-full bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-4/6 bg-gray-700 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      )}

      {recap && !generateMutation.isPending && (
        <Card className="bg-gray-800 border-gray-700" data-testid="recap-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-100">
                Week {recap.week} Recap
              </CardTitle>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <div
                className="text-gray-100 space-y-4"
                dangerouslySetInnerHTML={{
                  __html: recap.markdown
                    .split('\n')
                    .map(line => {
                      if (line.startsWith('# ')) {
                        return `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>`;
                      }
                      if (line.startsWith('## ')) {
                        return `<h2 class="text-xl font-semibold mb-3">${line.slice(3)}</h2>`;
                      }
                      if (line.startsWith('### ')) {
                        return `<h3 class="text-lg font-medium mb-2">${line.slice(4)}</h3>`;
                      }
                      if (line.startsWith('- ')) {
                        return `<li class="ml-4">${line.slice(2)}</li>`;
                      }
                      if (line.startsWith('* ')) {
                        return `<li class="ml-4">${line.slice(2)}</li>`;
                      }
                      if (line.trim() === '') {
                        return '<br />';
                      }
                      return `<p>${line}</p>`;
                    })
                    .join(''),
                }}
                data-testid="text-recap-content"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
