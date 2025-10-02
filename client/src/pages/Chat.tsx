import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from 'sonner';

export function ChatPage() {
  const [message, setMessage] = useState('');
  const channels = ['general', 'waivers', 'trades', 'smack-talk'];
  
  const messages = [
    { id: 1, author: 'The Commish', text: 'Week 4 report has been posted', time: '1h ago' },
    { id: 2, author: 'alice', text: 'Queued WR T. Breakout for 12 FAAB. Thoughts?', time: '30m ago' },
    { id: 3, author: 'bob', text: 'Anyone need a RB? Got depth, need WR help', time: '15m ago' },
  ];

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty', {
        description: 'Please type a message before sending.',
      });
      return;
    }

    toast.success('Message sent', {
      description: `Posted to #general: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
    });
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Chat</h1>
        <p className="text-text-secondary">League discussions and bot updates</p>
      </div>

      <Card className="h-[600px] flex flex-col bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader className="border-b border-border-subtle">
          <Tabs defaultValue="general">
            <TabsList className="bg-surface-elevated border border-border-subtle">
              {channels.map((ch) => (
                <TabsTrigger 
                  key={ch} 
                  value={ch}
                  className="data-[state=active]:bg-brand-teal data-[state=active]:text-white text-text-secondary"
                >
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
                <div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center shrink-0 shadow-glow">
                  <span className="text-xs font-semibold text-white">
                    {msg.author[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary">{msg.author}</span>
                    <span className="text-xs text-text-muted">{msg.time}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="border-t border-border-subtle p-4 bg-surface-elevated">
          <div className="flex gap-2">
            <Input 
              placeholder="Type a message..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              data-testid="input-message" 
              className="bg-surface-hover border-border-default text-text-primary placeholder:text-text-muted"
            />
            <Button 
              size="sm" 
              onClick={handleSendMessage}
              data-testid="button-send" 
              className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-depth1"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
