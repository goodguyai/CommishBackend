import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

export function ChatPage() {
  const channels = ['general', 'waivers', 'trades', 'smack-talk'];
  
  const messages = [
    { id: 1, author: 'The Commish', text: 'Week 4 report has been posted', time: '1h ago' },
    { id: 2, author: 'alice', text: 'Queued WR T. Breakout for 12 FAAB. Thoughts?', time: '30m ago' },
    { id: 3, author: 'bob', text: 'Anyone need a RB? Got depth, need WR help', time: '15m ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Chat</h1>
        <p className="text-gray-600">League discussions and bot updates</p>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <Tabs defaultValue="general">
            <TabsList>
              {channels.map((ch) => (
                <TabsTrigger key={ch} value={ch}>
                  #{ch}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 bg-[#009898] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-white">
                    {msg.author[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{msg.author}</span>
                    <span className="text-xs text-gray-500">{msg.time}</span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input placeholder="Type a message..." data-testid="input-message" />
            <Button size="sm" data-testid="button-send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
