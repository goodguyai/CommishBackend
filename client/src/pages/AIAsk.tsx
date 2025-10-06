import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';
import { api } from '@/lib/apiApp';
import { MessageCircle, ExternalLink } from 'lucide-react';

interface Source {
  title: string;
  url?: string;
  snippet: string;
}

interface AIResponse {
  answer: string;
  sources: Source[];
}

interface AIAskProps {
  leagueId: string;
}

export function AIAsk({ leagueId }: AIAskProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);

  const askMutation = useMutation({
    mutationFn: async () => {
      return await api('/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question, leagueId }),
      });
    },
    onSuccess: (data) => {
      setResponse(data);
      toast.success('Answer received', {
        description: 'AI has processed your question',
      });
    },
    onError: (error) => {
      toast.error('Failed to get answer', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handleAsk = () => {
    if (!question.trim()) {
      toast.error('Question required', {
        description: 'Please enter a question',
      });
      return;
    }
    askMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">AI Q&A</h1>
        <p className="text-gray-400">Ask questions about your league</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Ask a Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-100 mb-2">
              Your Question
            </label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What are the scoring settings for this league?"
              rows={4}
              className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500"
              data-testid="input-question"
            />
          </div>

          <Button
            onClick={handleAsk}
            disabled={askMutation.isPending || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-ask"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {askMutation.isPending ? 'Thinking...' : 'Ask'}
          </Button>
        </CardContent>
      </Card>

      {askMutation.isPending && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-8">
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-4/6 bg-gray-700 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      )}

      {response && !askMutation.isPending && (
        <Card className="bg-gray-800 border-gray-700" data-testid="response-section">
          <CardHeader>
            <CardTitle className="text-gray-100">Answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-100 whitespace-pre-wrap" data-testid="text-answer">
                {response.answer}
              </p>
            </div>

            {response.sources && response.sources.length > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Sources</h4>
                <div className="space-y-2">
                  {response.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-900 p-3 rounded-lg border border-gray-700"
                      data-testid={`source-${idx}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-gray-100 font-medium text-sm">{source.title}</p>
                          <p className="text-gray-400 text-xs mt-1">{source.snippet}</p>
                        </div>
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            data-testid={`link-source-${idx}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
