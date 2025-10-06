import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';
import { api } from '@/lib/apiApp';
import { AlertCircle, Send, Eye } from 'lucide-react';

interface CooldownStatus {
  canPost: boolean;
  nextAvailableAt?: string;
  remainingSeconds?: number;
}

interface AnnouncementPreview {
  text: string;
  mention: string;
  estimatedReach: number;
}

interface AutomationAnnouncementsProps {
  leagueId: string;
}

export function AutomationAnnouncements({ leagueId }: AutomationAnnouncementsProps) {
  const [text, setText] = useState('');
  const [mention, setMention] = useState<'none' | '@everyone' | '@here'>('none');
  const [preview, setPreview] = useState<AnnouncementPreview | null>(null);

  const { data: cooldown, isLoading } = useQuery<CooldownStatus>({
    queryKey: ['/api/announce/cooldown', leagueId],
    queryFn: async () => {
      return await api(`/api/announce/cooldown/${leagueId}`);
    },
    refetchInterval: 10000,
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      return await api('/api/announce/preview', {
        method: 'POST',
        body: JSON.stringify({ text, mention, leagueId }),
      });
    },
    onSuccess: (data) => {
      setPreview(data);
      toast.success('Preview generated', {
        description: 'Review your announcement before sending',
      });
    },
    onError: (error) => {
      toast.error('Preview failed', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return await api('/api/announce/send', {
        method: 'POST',
        body: JSON.stringify({ text, mention, leagueId }),
      });
    },
    onSuccess: () => {
      toast.success('Announcement sent', {
        description: 'Your message has been posted to the channel',
      });
      setText('');
      setMention('none');
      setPreview(null);
    },
    onError: (error) => {
      toast.error('Failed to send announcement', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handlePreview = () => {
    if (!text.trim()) {
      toast.error('Message required', {
        description: 'Please enter announcement text',
      });
      return;
    }
    previewMutation.mutate();
  };

  const handleSend = () => {
    if (!text.trim()) {
      toast.error('Message required', {
        description: 'Please enter announcement text',
      });
      return;
    }
    if (!cooldown?.canPost) {
      toast.error('Cooldown active', {
        description: 'Please wait before sending another announcement',
      });
      return;
    }
    sendMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Announcements</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Announcements</h1>
        <p className="text-gray-400">Send announcements with built-in guardrails</p>
      </div>

      {cooldown && !cooldown.canPost && (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-yellow-500 font-medium">Cooldown Active</p>
                <p className="text-sm text-gray-400 mt-1">
                  Next announcement available{' '}
                  {cooldown.nextAvailableAt &&
                    new Date(cooldown.nextAvailableAt).toLocaleTimeString()}
                  {cooldown.remainingSeconds && ` (${cooldown.remainingSeconds}s remaining)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Compose Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="announcement-text" className="block text-sm font-medium text-gray-100 mb-2">
              Message
            </label>
            <Textarea
              id="announcement-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your announcement message..."
              rows={6}
              className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500"
              data-testid="input-announcement-text"
            />
          </div>

          <div>
            <label htmlFor="mention-type" className="block text-sm font-medium text-gray-100 mb-2">
              Mention Type
            </label>
            <select
              id="mention-type"
              value={mention}
              onChange={(e) => setMention(e.target.value as typeof mention)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100"
              data-testid="select-mention-type"
            >
              <option value="none">None</option>
              <option value="@everyone">@everyone</option>
              <option value="@here">@here</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handlePreview}
              disabled={previewMutation.isPending || !text.trim()}
              variant="secondary"
              className="bg-gray-700 hover:bg-gray-600 text-gray-100"
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMutation.isPending ? 'Loading...' : 'Preview'}
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || !cooldown?.canPost || !text.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-send"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" data-testid="preview-section">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-100">{preview.text}</p>
              {preview.mention !== 'none' && (
                <p className="text-blue-400 mt-2 text-sm">Mentions: {preview.mention}</p>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Estimated reach: {preview.estimatedReach} members
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
