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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Terminal</h1>
        <p className="text-gray-600">Advanced command interface</p>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <TerminalIcon className="w-5 h-5" />
            Command Line
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 bg-gray-900 font-mono text-sm">
          <div className="space-y-1">
            {output.map((line, i) => (
              <div key={i} className="text-green-400">{line}</div>
            ))}
          </div>
        </CardContent>
        <div className="border-t p-4 bg-gray-900">
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
              className="bg-gray-800 border-gray-700 text-green-400 placeholder:text-gray-500"
              data-testid="input-command"
            />
            <Button type="submit" size="sm" data-testid="button-execute">
              Execute
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
