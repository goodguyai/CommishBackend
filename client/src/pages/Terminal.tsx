import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Terminal as TerminalIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

interface TerminalOutput {
  command: string;
  response: string;
  timestamp: string;
}

export function TerminalPage() {
  const [outputs, setOutputs] = useState<TerminalOutput[]>([
    {
      command: 'system',
      response: '> Welcome to THE COMMISH Terminal\n> Type a command and press Enter\n> Examples: league status, generate report week 4, propose trade, set rule, export constitution',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [commandInput, setCommandInput] = useState('');

  const executeMutation = useMutation({
    mutationFn: async (command: string) => {
      const response = await apiRequest('POST', '/api/mock/terminal/execute', { command });
      const data = await response.json();
      return data;
    },
    onSuccess: (data: any, command) => {
      setOutputs([
        ...outputs,
        {
          command,
          response: data.summary || 'Command executed',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setCommandInput('');
      toast.success('Command executed', {
        description: data.summary || 'Command completed successfully',
      });
    },
    onError: (error, command) => {
      setOutputs([
        ...outputs,
        {
          command,
          response: `Error: ${error instanceof Error ? error.message : 'Command failed'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      toast.error('Command failed', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commandInput.trim()) {
      executeMutation.mutate(commandInput);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Terminal</h1>
        <p className="text-text-secondary">Advanced command interface</p>
      </div>

      <Card className="h-[600px] flex flex-col bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader className="border-b border-border-subtle">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <TerminalIcon className="w-5 h-5" />
            Command Line
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] font-mono text-sm">
          <div className="space-y-3">
            {outputs.map((output, i) => (
              <div key={i} className="space-y-1">
                {output.command !== 'system' && (
                  <div className="text-text-muted">
                    <span className="text-brand-teal">$</span> {output.command}
                  </div>
                )}
                <div className="text-brand-teal whitespace-pre-wrap">{output.response}</div>
                <div className="text-xs text-text-muted">{output.timestamp}</div>
              </div>
            ))}
            {executeMutation.isPending && (
              <div className="text-brand-gold animate-pulse">Executing...</div>
            )}
          </div>
        </CardContent>
        <div className="border-t border-border-subtle p-4 bg-[#0a0a0a]">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter command..."
              disabled={executeMutation.isPending}
              className="bg-surface-elevated border-border-default text-brand-teal placeholder:text-text-muted"
              data-testid="input-command"
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={executeMutation.isPending}
              data-testid="button-execute" 
              className="bg-brand-teal text-white hover:bg-brand-teal/90"
            >
              Execute
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
