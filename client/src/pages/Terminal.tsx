import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Terminal as TerminalIcon } from 'lucide-react';

export function TerminalPage() {
  const [output, setOutput] = useState<string[]>([
    '> Welcome to THE COMMISH Terminal',
    '> Type a command and press Enter',
    '> Examples: league status, generate report week 4, propose trade',
  ]);

  const handleCommand = (cmd: string) => {
    setOutput([...output, `> ${cmd}`, '> Command executed successfully']);
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
          <div className="space-y-1">
            {output.map((line, i) => (
              <div key={i} className="text-brand-teal">{line}</div>
            ))}
          </div>
        </CardContent>
        <div className="border-t border-border-subtle p-4 bg-[#0a0a0a]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('cmd') as HTMLInputElement;
              if (input.value.trim()) {
                handleCommand(input.value);
                input.value = '';
              }
            }}
            className="flex gap-2"
          >
            <Input
              name="cmd"
              placeholder="Enter command..."
              className="bg-surface-elevated border-border-default text-brand-teal placeholder:text-text-muted"
              data-testid="input-command"
            />
            <Button type="submit" size="sm" data-testid="button-execute" className="bg-brand-teal text-white hover:bg-brand-teal/90">
              Execute
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
