import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { 
  MessageSquare, 
  Calendar, 
  Zap, 
  CheckCircle, 
  Circle,
  RefreshCw,
  ExternalLink,
  Database,
  Brain,
  Activity,
  UserPlus,
  Bell,
  Trash2,
  Edit,
  Settings,
  Save,
  Heart,
  Scale,
  Shield,
  Search,
  Lock,
  MessageCircle,
  Trophy,
  Swords,
  Clock,
  BookOpen,
  Upload,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Member, Reminder, League } from '@shared/schema';
import { ModeBadge } from '@/components/ModeBadge';
import { FinishSetupBanner } from '@/components/FinishSetupBanner';
import { OwnerMapping } from '@/components/owner-mapping';
import { useAppStore } from '@/store/useAppStore';

interface DashboardStats {
  activeLeagues: number;
  rulesQueries: number;
  upcomingDeadlines: number;
  aiTokensUsed: string;
}

interface DiscordIntegration {
  botName: string;
  server: string;
  online: boolean;
  permissions: string;
  slashCommands: string;
  webhookVerification: string;
}


interface SlashCommand {
  command: string;
  access: string;
  description: string;
  features: string[];
}

interface RagSystemStatus {
  constitutionVersion: string;
  uploadedAgo: string;
  sections: number;
  embeddings: number;
  vectorDim: number;
  avgSimilarity: number;
  recentQueries: string[];
}

interface AiAssistantStatus {
  model: string;
  functionCalling: string;
  requestsToday: number;
  avgResponse: string;
  cacheHit: number;
  tokensUsed: number;
  tokenUsagePercent: number;
}

interface ActivityLog {
  id: string;
  icon: string;
  text: string;
  details: string;
  timestamp: string;
}

interface Dispute {
  id: string;
  leagueId: string;
  kind: 'trade' | 'rule' | 'behavior';
  subjectId?: string;
  openedBy: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  details?: any;
  resolution?: any;
  createdAt: string;
  resolvedAt?: string;
}

interface TradeEvaluation {
  fairness: number;
  rationale: string;
  timestamp: string;
}

interface Highlight {
  id: string;
  leagueId: string;
  week: number;
  kind: 'comeback' | 'blowout' | 'bench_tragedy' | 'top_scorer';
  payload: any;
  createdAt: string;
}

interface Rivalry {
  id: string;
  leagueId: string;
  teamA: string;
  teamB: string;
  aWins: number;
  bWins: number;
  lastMeetingWeek: number | null;
  meta: any;
}

interface ContentQueueItem {
  id: string;
  leagueId: string;
  channelId: string;
  scheduledAt: string;
  template: 'digest' | 'highlight' | 'meme' | 'rivalry';
  status: 'queued' | 'posted' | 'skipped';
  payload: any;
  postedMessageId: string | null;
  createdAt: string;
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'UTC',
];

const REMINDER_TYPES = [
  { value: 'lineup_lock', label: 'Lineup Lock' },
  { value: 'waivers', label: 'Waivers' },
  { value: 'trade_deadline', label: 'Trade Deadline' },
  { value: 'bye_week', label: 'Bye Week' },
  { value: 'custom', label: 'Custom' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'roast', label: 'Roast Mode' },
];

export function DashboardPage() {
  // Get selectedLeagueId from app store
  const { selectedLeagueId } = useAppStore();
  
  // Get leagueId from localStorage or use first available league
  const [leagueId, setLeagueId] = useState<string>(() => {
    return localStorage.getItem('selectedLeagueId') || '';
  });

  // Owner Mapping Dialog State
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [discordUserId, setDiscordUserId] = useState('');
  const [sleeperOwnerId, setSleeperOwnerId] = useState('');
  const [sleeperTeamName, setSleeperTeamName] = useState('');

  // Reminder Dialog State
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderType, setReminderType] = useState('');
  const [reminderCron, setReminderCron] = useState('');
  const [reminderTimezone, setReminderTimezone] = useState('UTC');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // League Settings State
  const [settingsTone, setSettingsTone] = useState('');
  const [settingsTimezone, setSettingsTimezone] = useState('');
  const [autoDigest, setAutoDigest] = useState(false);
  const [pollsEnabled, setPollsEnabled] = useState(false);
  const [tradeInsights, setTradeInsights] = useState(false);

  // Phase 2: Vibes Monitor State
  const [vibesMonitorEnabled, setVibesMonitorEnabled] = useState(false);
  const [vibesThreshold, setVibesThreshold] = useState(0.7);
  const [vibesAlertDm, setVibesAlertDm] = useState(false);

  // Phase 2: Disputes State
  const [disputeStatusFilter, setDisputeStatusFilter] = useState<string>('open');
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');
  const [disputeNewStatus, setDisputeNewStatus] = useState<string>('');

  // Phase 2: Trade Fairness State
  const [tradeId, setTradeId] = useState('');
  const [tradeEvaluation, setTradeEvaluation] = useState<TradeEvaluation | null>(null);
  const [isEvaluatingTrade, setIsEvaluatingTrade] = useState(false);

  // Phase 2: Moderation Tools State
  const [freezeChannelId, setFreezeChannelId] = useState('');
  const [freezeMinutes, setFreezeMinutes] = useState<number>(60);
  const [freezeReason, setFreezeReason] = useState('');
  const [clarifyChannelId, setClarifyChannelId] = useState('');
  const [clarifyQuestion, setClarifyQuestion] = useState('');

  // Phase 3: Highlights State
  const [highlightsWeek, setHighlightsWeek] = useState<number>(1);
  const [highlightsEnabled, setHighlightsEnabled] = useState(false);

  // Phase 3: Rivalries State
  const [rivalriesEnabled, setRivalriesEnabled] = useState(false);

  // Phase 3: Content Queue State
  const [contentQueueStatusFilter, setContentQueueStatusFilter] = useState<string>('all');
  const [creativeTrashTalk, setCreativeTrashTalk] = useState(false);
  const [deepStats, setDeepStats] = useState(false);

  // Commissioner Dashboard v2 State
  const [personalityStyle, setPersonalityStyle] = useState<string>('neutral');
  const [customTemplate, setCustomTemplate] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('Your team scored 150 points this week!');
  const [isDigestPreviewOpen, setIsDigestPreviewOpen] = useState(false);
  const [digestPreviewData, setDigestPreviewData] = useState<any>(null);

  // Phase 6: Rules Library State
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentVersion, setDocumentVersion] = useState('v1.0');
  const [documentContent, setDocumentContent] = useState('');

  // Fetch leagues to get the first one if not set (using demo endpoint for testing)
  const { data: leagues } = useQuery<{ leagues: League[] }>({
    queryKey: ['/api/demo/leagues'],
    enabled: !leagueId,
  });

  // Set leagueId from first league if available
  useEffect(() => {
    if (!leagueId && leagues?.leagues && leagues.leagues.length > 0) {
      const firstLeagueId = leagues.leagues[0].id;
      setLeagueId(firstLeagueId);
      localStorage.setItem('selectedLeagueId', firstLeagueId);
    }
  }, [leagues, leagueId]);

  // Fetch current league data
  const { data: leagueData } = useQuery<{ league: League }>({
    queryKey: ['/api/leagues', leagueId],
    enabled: !!leagueId,
  });

  // Check if current league is in demo mode
  const isDemoMode = leagueData?.league?.featureFlags && (leagueData.league.featureFlags as any)?.demo === true;

  // Initialize settings when league data loads
  useEffect(() => {
    if (leagueData?.league) {
      const league = leagueData.league;
      const flags = league.featureFlags as any;
      setSettingsTone(league.tone || 'professional');
      setSettingsTimezone(league.timezone || 'America/New_York');
      setAutoDigest(flags?.autoDigest ?? true);
      setPollsEnabled(flags?.polls ?? true);
      setTradeInsights(flags?.tradeInsights ?? false);
      setVibesMonitorEnabled(flags?.vibesMonitor ?? false);
      setVibesThreshold(flags?.vibesThreshold ?? 0.7);
      setVibesAlertDm(flags?.vibesAlertDm ?? false);
      setCreativeTrashTalk(flags?.creativeTrashTalk ?? false);
      setDeepStats(flags?.deepStats ?? false);
      setHighlightsEnabled(flags?.highlights ?? false);
      setRivalriesEnabled(flags?.rivalries ?? false);
    }
  }, [leagueData?.league]);

  // Dashboard data queries - using real league-specific endpoints
  const { data: statsResp, isLoading: statsLoading } = useQuery<{ ok: boolean; stats: { rulesDocs: number; activityLast24h: number; ownersCount: number } }>({
    queryKey: ['/api/v2/dashboard', leagueId, 'stats'],
    enabled: !!leagueId,
  });

  const { data: discord, isLoading: discordLoading } = useQuery<DiscordIntegration>({
    queryKey: ['/api/integrations/discord'],
  });

  const { data: sleeperData, isLoading: sleeperLoading } = useQuery<{
    ok: boolean;
    integration: {
      leagueId: string;
      sleeperLeagueId: string;
      season: string;
      sport: string;
      username?: string;
      createdAt?: string;
    } | null;
  }>({
    queryKey: ['/api/v2/sleeper/integration', selectedLeagueId],
    enabled: !!selectedLeagueId,
  });

  const { data: commands, isLoading: commandsLoading } = useQuery<SlashCommand[]>({
    queryKey: ['/api/slash-commands'],
  });

  const { data: ragResp, isLoading: ragLoading } = useQuery<{ ok: boolean; rag: { indexed: boolean; embeddedCount: number; recentDocs: any[] } }>({
    queryKey: ['/api/v2/dashboard', leagueId, 'rag'],
    enabled: !!leagueId,
  });

  const { data: ai, isLoading: aiLoading } = useQuery<AiAssistantStatus>({
    queryKey: ['/api/ai/status'],
  });

  const { data: activityResp, isLoading: activityLoading } = useQuery<{ ok: boolean; activity: any[] }>({
    queryKey: ['/api/v2/dashboard', leagueId, 'activity'],
    enabled: !!leagueId,
  });

  // Owner Mappings (Members) Query
  const { data: membersData, isLoading: membersLoading } = useQuery<{ members: Member[] }>({
    queryKey: ['/api/leagues', leagueId, 'members'],
    enabled: !!leagueId,
  });

  // Reminders Query
  const { data: remindersData, isLoading: remindersLoading } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ['/api/leagues', leagueId, 'reminders'],
    enabled: !!leagueId,
  });

  // Create Member Mutation
  const createMemberMutation = useMutation({
    mutationFn: async (memberData: any) => {
      const response = await apiRequest('POST', `/api/leagues/${leagueId}/members`, memberData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'members'] });
      toast.success('Owner mapped successfully', {
        description: `Mapped ${discordUsername} to team`,
      });
      setIsOwnerDialogOpen(false);
      resetOwnerForm();
    },
    onError: (error: any) => {
      toast.error('Failed to map owner', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Create Reminder Mutation
  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const response = await apiRequest('POST', `/api/leagues/${leagueId}/reminders`, reminderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'reminders'] });
      toast.success('Reminder created', {
        description: 'New reminder has been added',
      });
      setIsReminderDialogOpen(false);
      resetReminderForm();
    },
    onError: (error: any) => {
      toast.error('Failed to create reminder', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Update Reminder Mutation
  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/reminders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'reminders'] });
      toast.success('Reminder updated', {
        description: 'Reminder has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update reminder', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Delete Reminder Mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/reminders/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId, 'reminders'] });
      toast.success('Reminder deleted', {
        description: 'Reminder has been removed',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to delete reminder', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Update League Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const response = await apiRequest('PATCH', `/api/leagues/${leagueId}/settings`, settingsData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo/leagues', leagueId] });
      toast.success('Settings updated', {
        description: 'League settings have been saved',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update settings', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 2: Disputes Query
  const { data: disputesData, isLoading: disputesLoading } = useQuery<{ disputes: Dispute[] }>({
    queryKey: ['/api/v2/disputes', leagueId, disputeStatusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/v2/disputes?leagueId=${leagueId}&status=${disputeStatusFilter}`);
      if (!res.ok) throw new Error('Failed to fetch disputes');
      return res.json();
    },
    enabled: !!leagueId,
  });

  // Phase 2: Update Dispute Mutation
  const updateDisputeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/v2/disputes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/disputes', leagueId] });
      toast.success('Dispute updated', {
        description: 'Dispute status has been updated',
      });
      setIsDisputeDialogOpen(false);
      setSelectedDispute(null);
      setDisputeResolutionNotes('');
    },
    onError: (error: any) => {
      toast.error('Failed to update dispute', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 2: Freeze Thread Mutation
  const freezeThreadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/v2/mod/freeze', data);
      return response.json();
    },
    onSuccess: () => {
      toast.success('Thread frozen', {
        description: `Thread will be frozen for ${freezeMinutes} minutes`,
      });
      setFreezeChannelId('');
      setFreezeMinutes(60);
      setFreezeReason('');
    },
    onError: (error: any) => {
      toast.error('Failed to freeze thread', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 2: Clarify Rule Mutation
  const clarifyRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/v2/mod/clarify-rule', data);
      return response.json();
    },
    onSuccess: () => {
      toast.success('Rule clarification sent', {
        description: 'AI response has been posted to the channel',
      });
      setClarifyChannelId('');
      setClarifyQuestion('');
    },
    onError: (error: any) => {
      toast.error('Failed to clarify rule', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 3: Highlights Query
  const { data: highlightsData, isLoading: highlightsLoading, refetch: refetchHighlights } = useQuery<{ highlights: Highlight[] }>({
    queryKey: ['/api/v2/highlights', leagueId, highlightsWeek],
    queryFn: async () => {
      const res = await fetch(`/api/v2/highlights?leagueId=${leagueId}&week=${highlightsWeek}`);
      if (!res.ok) throw new Error('Failed to fetch highlights');
      return res.json();
    },
    enabled: !!leagueId && highlightsWeek > 0,
  });

  // Phase 3: Compute Highlights Mutation
  const computeHighlightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v2/highlights/compute', {
        leagueId,
        week: highlightsWeek,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/highlights', leagueId] });
      refetchHighlights();
      toast.success('Highlights computed', {
        description: `Highlights for week ${highlightsWeek} have been generated`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to compute highlights', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 3: Rivalries Query
  const { data: rivalriesData, isLoading: rivalriesLoading } = useQuery<{ rivalries: Rivalry[] }>({
    queryKey: ['/api/v2/rivalries', leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/rivalries?leagueId=${leagueId}`);
      if (!res.ok) throw new Error('Failed to fetch rivalries');
      return res.json();
    },
    enabled: !!leagueId,
  });

  // Phase 3: Update Rivalries Mutation
  const updateRivalriesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v2/rivalries/update', {
        leagueId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/rivalries', leagueId] });
      toast.success('Rivalries updated', {
        description: 'Rivalry records have been refreshed',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update rivalries', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 3: Content Queue Query
  const { data: contentQueueData, isLoading: contentQueueLoading } = useQuery<{ queue: ContentQueueItem[] }>({
    queryKey: ['/api/v2/content/queue', leagueId, contentQueueStatusFilter],
    queryFn: async () => {
      const statusParam = contentQueueStatusFilter !== 'all' ? `&status=${contentQueueStatusFilter}` : '';
      const res = await fetch(`/api/v2/content/queue?leagueId=${leagueId}${statusParam}`);
      if (!res.ok) throw new Error('Failed to fetch content queue');
      return res.json();
    },
    enabled: !!leagueId,
  });

  // Phase 3: Re-enqueue Content Mutation
  const reenqueueContentMutation = useMutation({
    mutationFn: async (item: ContentQueueItem) => {
      const response = await apiRequest('POST', '/api/v2/content/enqueue', {
        leagueId: item.leagueId,
        channelId: item.channelId,
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        template: item.template,
        payload: item.payload,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/content/queue', leagueId] });
      toast.success('Content re-enqueued', {
        description: 'Content has been added back to the queue',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to re-enqueue content', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Commissioner v2: Fetch league config from v2 API
  const { data: v2LeagueData, isLoading: v2LeagueLoading } = useQuery<{ ok: boolean; data: League }>({
    queryKey: ['/api/v2/leagues', leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/leagues/${leagueId}`);
      if (!res.ok) throw new Error('Failed to fetch league');
      return res.json();
    },
    enabled: !!leagueId,
  });

  const v2League = v2LeagueData?.data;

  // Initialize personality style from league data
  useEffect(() => {
    if (v2League?.personality) {
      const style = (v2League.personality as any)?.style || 'neutral';
      setPersonalityStyle(style);
    }
  }, [v2League]);

  // Commissioner v2: Fetch Discord channels
  const { data: v2DiscordChannels, isLoading: v2ChannelsLoading } = useQuery<{ ok: boolean; data: any[] }>({
    queryKey: ['/api/v2/discord/channels', v2League?.guildId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/discord/channels?guildId=${v2League?.guildId}`);
      if (!res.ok) throw new Error('Failed to fetch channels');
      return res.json();
    },
    enabled: !!v2League?.guildId,
  });

  // Commissioner v2: Personality preview
  const { data: personalityPreview, isLoading: previewLoading } = useQuery<{ ok: boolean; data: { preview: string } }>({
    queryKey: ['/api/v2/personality/preview', personalityStyle, customTemplate, previewText],
    queryFn: async () => {
      const style = personalityStyle === 'custom' ? customTemplate : personalityStyle;
      const res = await fetch(`/api/v2/personality/preview?style=${encodeURIComponent(style)}&text=${encodeURIComponent(previewText)}`);
      if (!res.ok) throw new Error('Failed to fetch preview');
      return res.json();
    },
    enabled: !!previewText && (personalityStyle !== 'custom' || !!customTemplate),
  });

  // Commissioner v2: Update league config
  const updateV2LeagueMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest('PATCH', `/api/v2/leagues/${leagueId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/leagues', leagueId] });
      toast.success('League updated', {
        description: 'Settings have been saved successfully',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update league', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Commissioner v2: Preview digest
  const previewDigestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/v2/digest/preview?leagueId=${leagueId}`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      setDigestPreviewData(data?.data || data);
      setIsDigestPreviewOpen(true);
      toast.success('Digest preview generated', {
        description: 'Review the digest content below',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to preview digest', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Commissioner v2: Run digest now
  const runDigestMutation = useMutation({
    mutationFn: async () => {
      const adminKey = import.meta.env.VITE_ADMIN_KEY || 'dev-key';
      const response = await fetch(`/api/digest/run-now?leagueId=${leagueId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run digest');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Digest posted!', {
        description: 'The weekly digest has been sent to Discord',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to run digest', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 6: Rules Library Query
  const { data: documentsData, isLoading: documentsLoading } = useQuery<{ documents: Array<{ id: string; title: string; version: string; contentType: string; chunksCount: number; lastIndexed: string; }> }>({
    queryKey: ['/api/v2/rag/docs', leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/rag/docs?leagueId=${leagueId}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
    enabled: !!leagueId,
  });

  // Phase 6: Reindex Document Mutation
  const reindexDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest('POST', `/api/v2/rag/reindex/${docId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/rag/docs', leagueId] });
      toast.success('Document reindexed', {
        description: 'Document has been reindexed successfully',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to reindex document', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  // Phase 6: Add Document Mutation
  const addDocumentMutation = useMutation({
    mutationFn: async ({ title, version, content }: { title: string; version: string; content: string }) => {
      const response = await apiRequest('POST', `/api/rag/index/${leagueId}`, {
        title,
        version,
        content,
        type: 'NORMALIZED',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/rag/docs', leagueId] });
      toast.success('Document added', {
        description: 'Document has been indexed successfully',
      });
      setIsRulesModalOpen(false);
      setDocumentTitle('');
      setDocumentVersion('v1.0');
      setDocumentContent('');
    },
    onError: (error: any) => {
      toast.error('Failed to add document', {
        description: error?.message || 'An error occurred',
      });
    },
  });

  const handleManageDiscord = () => {
    toast.info('Opening Discord settings...', {
      description: 'Manage bot permissions, slash commands, and webhook configuration.',
    });
  };

  const handleForceSyncSleeper = async () => {
    if (!selectedLeagueId) {
      toast.error('No league selected');
      return;
    }
    
    try {
      const response = await apiRequest('POST', `/api/v2/sleeper/sync/${selectedLeagueId}`, {});
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/v2/sleeper/integration', selectedLeagueId] });
      
      toast.success('Sleeper sync complete', {
        description: 'Latest league data has been fetched',
      });
    } catch (error: any) {
      toast.error('Sync failed', {
        description: error?.message || 'Failed to sync with Sleeper',
      });
    }
  };

  const handleReindexConstitution = () => {
    toast.info('Reindexing constitution...', {
      description: 'Regenerating embeddings and updating vector database.',
    });
  };

  const handleViewLogs = () => {
    toast.info('Opening full activity log...', {
      description: 'View detailed system events and audit trail.',
    });
  };

  const resetOwnerForm = () => {
    setDiscordUsername('');
    setDiscordUserId('');
    setSleeperOwnerId('');
    setSleeperTeamName('');
  };

  const resetReminderForm = () => {
    setEditingReminder(null);
    setReminderType('');
    setReminderCron('');
    setReminderTimezone('UTC');
    setReminderEnabled(true);
  };

  const handleAddOwner = () => {
    setIsOwnerDialogOpen(true);
  };

  const handleSaveOwner = () => {
    if (!discordUserId) {
      toast.error('Validation error', {
        description: 'Discord User ID is required',
      });
      return;
    }

    createMemberMutation.mutate({
      discordUserId,
      discordUsername: discordUsername || undefined,
      sleeperOwnerId: sleeperOwnerId || undefined,
      sleeperTeamName: sleeperTeamName || undefined,
      role: 'MANAGER',
    });
  };

  const handleAddReminder = () => {
    resetReminderForm();
    setIsReminderDialogOpen(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setReminderType(reminder.type);
    setReminderCron(reminder.cron);
    setReminderTimezone(reminder.timezone);
    setReminderEnabled(reminder.enabled);
    setIsReminderDialogOpen(true);
  };

  const handleSaveReminder = () => {
    if (!reminderType || !reminderCron) {
      toast.error('Validation error', {
        description: 'Type and schedule are required',
      });
      return;
    }

    if (editingReminder) {
      updateReminderMutation.mutate({
        id: editingReminder.id,
        data: {
          type: reminderType,
          cron: reminderCron,
          timezone: reminderTimezone,
          enabled: reminderEnabled,
        },
      });
      setIsReminderDialogOpen(false);
      resetReminderForm();
    } else {
      createReminderMutation.mutate({
        type: reminderType,
        cron: reminderCron,
        timezone: reminderTimezone,
        enabled: reminderEnabled,
      });
    }
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      deleteReminderMutation.mutate(id);
    }
  };

  const handleToggleReminder = (reminder: Reminder) => {
    updateReminderMutation.mutate({
      id: reminder.id,
      data: { enabled: !reminder.enabled },
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      tone: settingsTone,
      timezone: settingsTimezone,
      featureFlags: {
        digest: autoDigest,
        polls: pollsEnabled,
        trade_helper: tradeInsights,
        creativeTrashTalk: creativeTrashTalk,
        deepStats: deepStats,
        highlights: highlightsEnabled,
        rivalries: rivalriesEnabled,
      },
    });
  };

  const handleSaveVibesSettings = () => {
    const existingFlags = leagueData?.league?.featureFlags || {};
    updateSettingsMutation.mutate({
      featureFlags: {
        ...existingFlags,
        vibesMonitor: vibesMonitorEnabled,
        vibesThreshold: vibesThreshold,
        vibesAlertDm: vibesAlertDm,
      },
    });
  };

  const handleOpenDisputeDialog = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDisputeNewStatus(dispute.status);
    setDisputeResolutionNotes('');
    setIsDisputeDialogOpen(true);
  };

  const handleSaveDispute = () => {
    if (!selectedDispute) return;

    updateDisputeMutation.mutate({
      id: selectedDispute.id,
      data: {
        status: disputeNewStatus,
        resolution: { notes: disputeResolutionNotes },
      },
    });
  };

  const handleSearchTrade = async () => {
    if (!tradeId.trim() || !leagueId) {
      toast.error('Validation error', {
        description: 'Trade ID is required',
      });
      return;
    }

    setIsEvaluatingTrade(true);
    setTradeEvaluation(null);

    try {
      const response = await fetch(`/api/v2/trades/evaluate/${leagueId}/${tradeId}`);
      
      if (!response.ok) {
        throw new Error('Trade evaluation not found');
      }

      const data = await response.json();
      setTradeEvaluation(data);
    } catch (error: any) {
      toast.error('Trade not found', {
        description: error?.message || 'This trade has not been evaluated yet',
      });
    } finally {
      setIsEvaluatingTrade(false);
    }
  };

  const handleFreezeThread = () => {
    if (!freezeChannelId.trim() || !leagueId) {
      toast.error('Validation error', {
        description: 'Channel ID is required',
      });
      return;
    }

    freezeThreadMutation.mutate({
      leagueId,
      channelId: freezeChannelId,
      minutes: freezeMinutes,
      reason: freezeReason,
    });
  };

  const handleClarifyRule = () => {
    if (!clarifyChannelId.trim() || !clarifyQuestion.trim() || !leagueId) {
      toast.error('Validation error', {
        description: 'Channel ID and question are required',
      });
      return;
    }

    clarifyRuleMutation.mutate({
      leagueId,
      channelId: clarifyChannelId,
      question: clarifyQuestion,
    });
  };

  const statsCards = [
    { label: 'Rules Documents', value: statsResp?.stats?.rulesDocs ?? 0, icon: FileText, color: 'text-brand-teal' },
    { label: 'Owner Mappings', value: statsResp?.stats?.ownersCount ?? 0, icon: UserPlus, color: 'text-brand-teal' },
    { label: 'Activity (24h)', value: statsResp?.stats?.activityLast24h ?? 0, icon: Activity, color: 'text-brand-gold' },
    { label: 'RAG Embeddings', value: ragResp?.rag?.embeddedCount ?? 0, icon: Database, color: 'text-brand-pink' },
  ];

  const formatCronToHuman = (cron: string): string => {
    // Simple cron to human readable converter
    if (cron === '0 0 * * 0') return 'Weekly on Sunday at midnight';
    if (cron === '0 12 * * *') return 'Daily at noon';
    return cron;
  };

  return (
    <div className="space-y-6" data-testid="dashboard-root">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
            {isDemoMode ? <ModeBadge mode="demo" /> : null}
          </div>
          <p className="text-text-secondary">League management and bot system status</p>
        </div>
      </div>

      {isDemoMode ? (
        <FinishSetupBanner 
          message="You're in demo mode. Activate beta to connect your real Discord and Sleeper league."
          actionLabel="Activate Beta"
          actionPath="/"
        />
      ) : null}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, i) => (
          <Card 
            key={i} 
            className="bg-surface-card border-border-subtle shadow-depth1"
            data-testid={`stat-card-${i}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commissioner Control Cards */}
      {leagueId && !v2LeagueLoading && v2League && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Toggles Card */}
          <Card className="bg-surface-card border-border-subtle shadow-depth2" data-testid="card-feature-toggles">
            <CardHeader>
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Settings className="w-5 h-5" />
                League Features
              </CardTitle>
              <p className="text-sm text-text-secondary mt-1">Enable or disable features for your league</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-meme" className="text-text-primary cursor-pointer">Auto-Meme</Label>
                <Switch
                  id="auto-meme"
                  data-testid="switch-auto-meme"
                  checked={(v2League.featureFlags as any)?.autoMeme ?? false}
                  onCheckedChange={(checked) => updateV2LeagueMutation.mutate({ featureFlags: { autoMeme: checked } })}
                  disabled={updateV2LeagueMutation.isPending}
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="digest" className="text-text-primary cursor-pointer">Digest</Label>
                <Switch
                  id="digest"
                  data-testid="switch-digest"
                  checked={(v2League.featureFlags as any)?.digest ?? false}
                  onCheckedChange={(checked) => updateV2LeagueMutation.mutate({ featureFlags: { digest: checked } })}
                  disabled={updateV2LeagueMutation.isPending}
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="reminders" className="text-text-primary cursor-pointer">Reminders</Label>
                <Switch
                  id="reminders"
                  data-testid="switch-reminders"
                  checked={(v2League.featureFlags as any)?.reminders ?? false}
                  onCheckedChange={(checked) => updateV2LeagueMutation.mutate({ featureFlags: { reminders: checked } })}
                  disabled={updateV2LeagueMutation.isPending}
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="polls" className="text-text-primary cursor-pointer">Polls</Label>
                <Switch
                  id="polls"
                  data-testid="switch-polls"
                  checked={(v2League.featureFlags as any)?.polls ?? false}
                  onCheckedChange={(checked) => updateV2LeagueMutation.mutate({ featureFlags: { polls: checked } })}
                  disabled={updateV2LeagueMutation.isPending}
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="highlights" className="text-text-primary cursor-pointer">Highlights</Label>
                <Switch
                  id="highlights"
                  data-testid="switch-highlights"
                  checked={(v2League.featureFlags as any)?.highlights ?? false}
                  onCheckedChange={(checked) => updateV2LeagueMutation.mutate({ featureFlags: { highlights: checked } })}
                  disabled={updateV2LeagueMutation.isPending}
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="rivalries" className="text-text-primary cursor-pointer">Rivalries</Label>
                <Switch
                  id="rivalries"
                  data-testid="switch-rivalries"
                  checked={(v2League.featureFlags as any)?.rivalries ?? false}
                  onCheckedChange={(checked) => updateV2LeagueMutation.mutate({ featureFlags: { rivalries: checked } })}
                  disabled={updateV2LeagueMutation.isPending}
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>
            </CardContent>
          </Card>

          {/* Channel Routing Card */}
          <Card className="bg-surface-card border-border-subtle shadow-depth2" data-testid="card-channel-routing">
            <CardHeader>
              <CardTitle className="text-text-primary flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Channel Configuration
              </CardTitle>
              <p className="text-sm text-text-secondary mt-1">Choose where features should post</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {v2ChannelsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full bg-surface-hover" />
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="digests-channel" className="text-text-secondary mb-2 block">Digests Channel</Label>
                    <Select
                      value={(v2League.channels as any)?.digests || ""}
                      onValueChange={(value) => updateV2LeagueMutation.mutate({ channels: { digests: value } })}
                      disabled={updateV2LeagueMutation.isPending}
                    >
                      <SelectTrigger id="digests-channel" data-testid="select-digests-channel" className="bg-surface-elevated border-border-default text-text-primary">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-default">
                        {v2DiscordChannels?.data?.map((ch: any) => (
                          <SelectItem key={ch.id} value={ch.id} className="text-text-primary hover:bg-surface-hover">#{ch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reminders-channel" className="text-text-secondary mb-2 block">Reminders Channel</Label>
                    <Select
                      value={(v2League.channels as any)?.reminders || ""}
                      onValueChange={(value) => updateV2LeagueMutation.mutate({ channels: { reminders: value } })}
                      disabled={updateV2LeagueMutation.isPending}
                    >
                      <SelectTrigger id="reminders-channel" data-testid="select-reminders-channel" className="bg-surface-elevated border-border-default text-text-primary">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-default">
                        {v2DiscordChannels?.data?.map((ch: any) => (
                          <SelectItem key={ch.id} value={ch.id} className="text-text-primary hover:bg-surface-hover">#{ch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="polls-channel" className="text-text-secondary mb-2 block">Polls Channel</Label>
                    <Select
                      value={(v2League.channels as any)?.polls || ""}
                      onValueChange={(value) => updateV2LeagueMutation.mutate({ channels: { polls: value } })}
                      disabled={updateV2LeagueMutation.isPending}
                    >
                      <SelectTrigger id="polls-channel" data-testid="select-polls-channel" className="bg-surface-elevated border-border-default text-text-primary">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-default">
                        {v2DiscordChannels?.data?.map((ch: any) => (
                          <SelectItem key={ch.id} value={ch.id} className="text-text-primary hover:bg-surface-hover">#{ch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="highlights-channel" className="text-text-secondary mb-2 block">Highlights Channel</Label>
                    <Select
                      value={(v2League.channels as any)?.highlights || ""}
                      onValueChange={(value) => updateV2LeagueMutation.mutate({ channels: { highlights: value } })}
                      disabled={updateV2LeagueMutation.isPending}
                    >
                      <SelectTrigger id="highlights-channel" data-testid="select-highlights-channel" className="bg-surface-elevated border-border-default text-text-primary">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-default">
                        {v2DiscordChannels?.data?.map((ch: any) => (
                          <SelectItem key={ch.id} value={ch.id} className="text-text-primary hover:bg-surface-hover">#{ch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Owner Mapping Section */}
      {leagueId && <OwnerMapping leagueId={leagueId} />}

      {/* Bot Personality & Digest Controls */}
      {leagueId && !v2LeagueLoading && v2League && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bot Personality Card */}
          <Card className="bg-surface-card border-border-subtle shadow-depth2" data-testid="card-bot-personality">
            <CardHeader>
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Bot Personality
              </CardTitle>
              <p className="text-sm text-text-secondary mt-1">Choose how the bot communicates</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={personalityStyle}
                onValueChange={setPersonalityStyle}
                className="space-y-3"
                data-testid="radio-group-personality"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="neutral" id="personality-neutral" data-testid="radio-personality-neutral" />
                    <Label htmlFor="personality-neutral" className="text-text-primary cursor-pointer">Neutral</Label>
                  </div>
                  <span className="text-xs text-text-secondary italic">Your team scored 150 points this week!</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sassy" id="personality-sassy" data-testid="radio-personality-sassy" />
                    <Label htmlFor="personality-sassy" className="text-text-primary cursor-pointer">Sassy</Label>
                  </div>
                  <span className="text-xs text-text-secondary italic">💅 Your team scored 150 points (impressive...)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="formal" id="personality-formal" data-testid="radio-personality-formal" />
                    <Label htmlFor="personality-formal" className="text-text-primary cursor-pointer">Formal</Label>
                  </div>
                  <span className="text-xs text-text-secondary italic">Please be advised: Your team scored 150 points</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="meme" id="personality-meme" data-testid="radio-personality-meme" />
                    <Label htmlFor="personality-meme" className="text-text-primary cursor-pointer">Meme</Label>
                  </div>
                  <span className="text-xs text-text-secondary italic">Your team scored 150 points 🔥💯 no cap fr fr</span>
                </div>
              </RadioGroup>

              <Button
                onClick={() => {
                  updateV2LeagueMutation.mutate({ personality: { style: personalityStyle } });
                }}
                data-testid="button-save-personality"
                disabled={updateV2LeagueMutation.isPending}
                className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateV2LeagueMutation.isPending ? 'Saving...' : 'Save Personality'}
              </Button>
            </CardContent>
          </Card>

          {/* Digest Controls Card */}
          <Card className="bg-surface-card border-border-subtle shadow-depth2" data-testid="card-digest-controls">
            <CardHeader>
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Digest Controls
              </CardTitle>
              <p className="text-sm text-text-secondary mt-1">Manage automatic digest scheduling</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="digest-frequency" className="text-text-secondary mb-2 block">Digest Frequency</Label>
                <Select
                  value={v2League.digestFrequency || "off"}
                  onValueChange={(value) => updateV2LeagueMutation.mutate({ digestFrequency: value })}
                  disabled={updateV2LeagueMutation.isPending}
                >
                  <SelectTrigger id="digest-frequency" data-testid="select-digest-frequency" className="bg-surface-elevated border-border-default text-text-primary">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-card border-border-default">
                    <SelectItem value="off" className="text-text-primary hover:bg-surface-hover">Off</SelectItem>
                    <SelectItem value="daily" className="text-text-primary hover:bg-surface-hover">Daily</SelectItem>
                    <SelectItem value="weekly" className="text-text-primary hover:bg-surface-hover">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isDemoMode ? (
                <div className="space-y-3">
                  <div className="text-xs text-text-muted">
                    <p>🔧 Dev Mode: Run digest manually</p>
                  </div>
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to post the digest to Discord now?')) {
                        runDigestMutation.mutate();
                      }
                    }}
                    data-testid="button-run-digest-now"
                    disabled={runDigestMutation.isPending}
                    className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white"
                  >
                    {runDigestMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {!runDigestMutation.isPending ? <Zap className="w-4 h-4 mr-2" /> : null}
                    {runDigestMutation.isPending ? 'Posting...' : 'Run Now'}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase 6: Rules Library Card */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2" data-testid="card-rules-library">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-text-primary flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Rules Library
                </CardTitle>
                <p className="text-sm text-text-secondary mt-1">Manage and reindex your league constitution documents</p>
              </div>
              <Button
                onClick={() => setIsRulesModalOpen(true)}
                data-testid="button-add-rules-document"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Rules Document
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !documentsData?.documents || documentsData.documents.length === 0 ? (
              <div className="text-center py-8 text-text-secondary" data-testid="empty-rules-library">
                <FileText className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                <p>No documents indexed yet</p>
                <p className="text-sm mt-1">Add your league constitution to enable AI-powered rules search</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border-subtle hover:bg-transparent">
                    <TableHead className="text-text-secondary">Title</TableHead>
                    <TableHead className="text-text-secondary">Version</TableHead>
                    <TableHead className="text-text-secondary">Chunks</TableHead>
                    <TableHead className="text-text-secondary">Last Indexed</TableHead>
                    <TableHead className="text-text-secondary text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentsData.documents.map((doc) => (
                    <TableRow key={doc.id} className="border-border-subtle" data-testid={`row-document-${doc.id}`}>
                      <TableCell className="font-medium text-text-primary" data-testid={`text-title-${doc.id}`}>
                        {doc.title}
                      </TableCell>
                      <TableCell className="text-text-secondary" data-testid={`text-version-${doc.id}`}>
                        {doc.version}
                      </TableCell>
                      <TableCell className="text-text-secondary" data-testid={`text-chunks-${doc.id}`}>
                        {doc.chunksCount}
                      </TableCell>
                      <TableCell className="text-text-secondary" data-testid={`text-indexed-${doc.id}`}>
                        {new Date(doc.lastIndexed).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (confirm('Reindex this document? This will regenerate all embeddings.')) {
                              reindexDocumentMutation.mutate(doc.id);
                            }
                          }}
                          disabled={reindexDocumentMutation.isPending}
                          data-testid={`button-reindex-${doc.id}`}
                          className="text-brand-teal hover:text-brand-teal/80"
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${reindexDocumentMutation.isPending ? 'animate-spin' : ''}`} />
                          Re-index
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* League Settings Card */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Settings className="w-5 h-5" />
                League Settings
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Tone Preference</label>
                  <Select value={settingsTone} onValueChange={setSettingsTone}>
                    <SelectTrigger data-testid="select-tone" className="bg-surface-elevated border-border-default text-text-primary">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-default">
                      {TONE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-text-primary hover:bg-surface-hover">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Timezone</label>
                  <Select value={settingsTimezone} onValueChange={setSettingsTimezone}>
                    <SelectTrigger data-testid="select-timezone" className="bg-surface-elevated border-border-default text-text-primary">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-default">
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz} className="text-text-primary hover:bg-surface-hover">
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-text-secondary block mb-2">Feature Flags</label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Auto Digest</span>
                  <Switch
                    checked={autoDigest}
                    onCheckedChange={setAutoDigest}
                    data-testid="switch-auto-digest"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Polls</span>
                  <Switch
                    checked={pollsEnabled}
                    onCheckedChange={setPollsEnabled}
                    data-testid="switch-polls"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Trade Insights</span>
                  <Switch
                    checked={tradeInsights}
                    onCheckedChange={setTradeInsights}
                    data-testid="switch-trade-insights"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Creative Trash Talk</span>
                  <Switch
                    checked={creativeTrashTalk}
                    onCheckedChange={setCreativeTrashTalk}
                    data-testid="switch-creative-trash-talk"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Deep Statistics</span>
                  <Switch
                    checked={deepStats}
                    onCheckedChange={setDeepStats}
                    data-testid="switch-deep-stats"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Weekly Highlights</span>
                  <Switch
                    checked={highlightsEnabled}
                    onCheckedChange={setHighlightsEnabled}
                    data-testid="switch-highlights"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Rivalry Tracking</span>
                  <Switch
                    checked={rivalriesEnabled}
                    onCheckedChange={setRivalriesEnabled}
                    data-testid="switch-rivalries"
                    className="data-[state=checked]:bg-brand-teal"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleSaveSettings}
                data-testid="button-save-settings"
                disabled={updateSettingsMutation.isPending}
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discord & Sleeper Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Discord Integration</CardTitle>
              <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {discordLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Circle className={`w-3 h-3 ${discord?.online ? 'fill-brand-teal text-brand-teal' : 'fill-text-muted text-text-muted'}`} />
                  <div>
                    <div className="font-medium text-text-primary">{discord?.botName}</div>
                    <div className="text-sm text-text-secondary">{discord?.server}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Bot permissions</span>
                    <Badge className="text-brand-teal border-brand-teal/30 border bg-brand-teal/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {discord?.permissions}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Slash commands</span>
                    <Badge className="text-brand-teal border-brand-teal/30 border bg-brand-teal/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {discord?.slashCommands}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Webhook verification</span>
                    <Badge className="text-brand-teal border-brand-teal/30 border bg-brand-teal/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {discord?.webhookVerification}
                    </Badge>
                  </div>
                </div>

                <Button 
                  onClick={handleManageDiscord}
                  data-testid="button-manage-discord"
                  variant="secondary" 
                  size="sm" 
                  className="w-full text-text-primary border border-border-default hover:bg-surface-hover"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage Discord Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Sleeper Integration</CardTitle>
              <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30">Synced</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sleeperLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : sleeperData?.integration ? (
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-text-primary">
                    {sleeperData.integration.username}'s League
                  </div>
                  <div className="text-sm text-text-secondary">
                    ID: {sleeperData.integration.sleeperLeagueId}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-muted">Season</div>
                    <div className="text-sm font-medium text-text-primary">
                      {sleeperData.integration.season}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Sport</div>
                    <div className="text-sm font-medium text-text-primary">
                      {sleeperData.integration.sport.toUpperCase()}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleForceSyncSleeper}
                  data-testid="button-force-sync"
                  variant="secondary" 
                  size="sm" 
                  className="w-full text-text-primary border border-border-default hover:bg-surface-hover"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Force Sync Now
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-secondary mb-3">No Sleeper league linked</p>
                <Button 
                  onClick={() => window.location.href = '/app/sleeper/link'}
                  variant="outline"
                  size="sm"
                >
                  Link Sleeper League
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Owner Mapping Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Team Owner Mapping</CardTitle>
              <Button
                onClick={handleAddOwner}
                data-testid="button-add-owner"
                size="sm"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Map Owner
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discord User</TableHead>
                    <TableHead>Sleeper Team</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersData?.members && membersData.members.length > 0 ? (
                    membersData.members.map((member) => (
                      <TableRow key={member.id} data-testid={`member-row-${member.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-text-primary">
                              {member.discordUsername || 'Unknown User'}
                            </div>
                            <div className="text-xs text-text-muted">{member.discordUserId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-text-primary">{member.sleeperTeamName || 'Not mapped'}</div>
                            {member.sleeperOwnerId && (
                              <div className="text-xs text-text-muted">ID: {member.sleeperOwnerId}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={member.role === 'COMMISH' ? 'bg-brand-gold/20 text-brand-gold border-brand-gold/30' : 'bg-brand-teal/20 text-brand-teal border-brand-teal/30'}>
                            {member.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-text-muted py-8">
                        No owner mappings yet. Click "Map Owner" to add one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reminder Management Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary">Automated Reminders</CardTitle>
              <Button
                onClick={handleAddReminder}
                data-testid="button-add-reminder"
                size="sm"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <Bell className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {remindersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {remindersData?.reminders && remindersData.reminders.length > 0 ? (
                  remindersData.reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="p-4 border border-border-subtle rounded-lg bg-surface-elevated"
                      data-testid={`reminder-card-${reminder.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-text-primary capitalize">
                            {reminder.type.replace('_', ' ')}
                          </h4>
                          <p className="text-xs text-text-muted mt-1">
                            {formatCronToHuman(reminder.cron)}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">{reminder.timezone}</p>
                        </div>
                        <Switch
                          checked={reminder.enabled}
                          onCheckedChange={() => handleToggleReminder(reminder)}
                          data-testid={`switch-reminder-${reminder.id}`}
                          className="data-[state=checked]:bg-brand-teal"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditReminder(reminder)}
                          data-testid={`button-edit-reminder-${reminder.id}`}
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-text-primary hover:bg-surface-hover"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          data-testid={`button-delete-reminder-${reminder.id}`}
                          variant="secondary"
                          size="sm"
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-text-muted py-8">
                    No reminders configured. Click "Add Reminder" to create one.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Slash Commands */}
      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Available Slash Commands</CardTitle>
        </CardHeader>
        <CardContent>
          {commandsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commands?.map((cmd, i) => (
                <div 
                  key={i} 
                  className="p-4 border border-border-subtle rounded-lg bg-surface-elevated"
                  data-testid={`command-card-${i}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-semibold text-brand-teal">{cmd.command}</code>
                    {cmd.access === 'Commish Only' && (
                      <Badge className="text-xs bg-brand-gold/20 text-brand-gold border-brand-gold/30">
                        {cmd.access}
                      </Badge>
                    )}
                    {cmd.access === 'Public' && (
                      <Badge className="text-xs bg-brand-teal/20 text-brand-teal border-brand-teal/30">
                        {cmd.access}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-2">{cmd.description}</p>
                  <ul className="text-xs text-text-muted space-y-1">
                    {cmd.features.map((f, j) => (
                      <li key={j}>• {f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RAG System & AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Database className="w-5 h-5" />
              RAG System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ragLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-primary">RAG Status</span>
                    <Badge className={ragResp?.rag?.indexed ? "bg-brand-teal/20 text-brand-teal border-brand-teal/30" : "bg-gray-500/20 text-gray-500 border-gray-500/30"}>
                      {ragResp?.rag?.indexed ? 'Indexed' : 'Not Indexed'}
                    </Badge>
                  </div>
                  <div className="text-sm text-text-secondary">
                    {ragResp?.rag?.indexed ? `${ragResp.rag.embeddedCount} embeddings ready` : 'Upload documents to index'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-muted">Documents</div>
                    <div className="text-lg font-semibold text-text-primary">{ragResp?.rag?.recentDocs?.length ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Embeddings</div>
                    <div className="text-lg font-semibold text-text-primary">{ragResp?.rag?.embeddedCount ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Vector dim</div>
                    <div className="text-lg font-semibold text-text-primary">1536</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Status</div>
                    <div className="text-lg font-semibold text-text-primary">{ragResp?.rag?.indexed ? 'Ready' : 'Pending'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-muted mb-2">Recent Documents</div>
                  <div className="space-y-1">
                    {ragResp?.rag?.recentDocs && ragResp.rag.recentDocs.length > 0 ? (
                      ragResp.rag.recentDocs.slice(0, 5).map((doc: any, i: number) => (
                        <div key={i} className="text-xs text-text-secondary">
                          {doc.title} ({doc.chars} chars)
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-text-muted">No documents yet</div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleReindexConstitution}
                  data-testid="button-reindex"
                  variant="secondary" 
                  size="sm" 
                  className="w-full text-text-primary border border-border-default hover:bg-surface-hover"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reindex Constitution
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Assistant (DeepSeek)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-muted">Model</div>
                    <div className="text-sm font-medium text-text-primary">{ai?.model}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Function calling</div>
                    <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30">
                      {ai?.functionCalling}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Requests today</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.requestsToday}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Avg response</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.avgResponse}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Cache hit %</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.cacheHit}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Tokens used</div>
                    <div className="text-lg font-semibold text-text-primary">{ai?.tokensUsed.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-muted mb-2">Token usage (bar graph)</div>
                  <div className="w-full bg-surface-elevated border border-border-subtle rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-brand-teal to-brand-pink h-full rounded-full transition-all"
                      style={{ width: `${ai?.tokenUsagePercent}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-text-muted mt-1">{ai?.tokenUsagePercent}% used</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <Button 
              onClick={handleViewLogs}
              data-testid="button-view-logs"
              variant="ghost" 
              size="sm" 
              className="text-brand-teal hover:bg-surface-hover"
            >
              View All Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {activityResp?.activity && activityResp.activity.length > 0 ? (
                activityResp.activity.slice(0, 10).map((log: any, idx: number) => {
                  const icon = log.kind === 'slash' ? '🎮' 
                    : log.kind === 'COMMAND_EXECUTED' ? '✅'
                    : log.kind === 'ERROR_OCCURRED' ? '❌'
                    : '📊';
                  const text = log.key ? `/${log.key}` : log.kind.replace(/_/g, ' ').toLowerCase();
                  const details = log.status === 'success' ? 'Completed successfully' : log.status;
                  const timestamp = log.at ? new Date(log.at).toLocaleString() : 'N/A';
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 p-3 bg-surface-elevated border border-border-subtle rounded-lg"
                      data-testid={`activity-${idx}`}
                    >
                      <div className="text-2xl">{icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-text-primary">{text}</div>
                        <div className="text-sm text-text-secondary">{details}</div>
                      </div>
                      <div className="text-xs text-text-muted whitespace-nowrap">{timestamp}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-text-muted text-center py-4">No recent activity</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PHASE 2 SECTIONS */}

      {/* Phase 2: Vibes Monitor */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Vibes Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">Enable Vibes Monitor</span>
                <Switch
                  checked={vibesMonitorEnabled}
                  onCheckedChange={setVibesMonitorEnabled}
                  data-testid="switch-vibes-monitor"
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Toxicity Threshold: {vibesThreshold.toFixed(2)}
                </label>
                <Slider
                  value={[vibesThreshold]}
                  onValueChange={(values) => setVibesThreshold(values[0])}
                  min={0.6}
                  max={0.9}
                  step={0.05}
                  data-testid="slider-vibes-threshold"
                  className="w-full"
                />
                <p className="text-xs text-text-muted">
                  Messages scoring above this threshold will trigger alerts
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">DM me on toxicity spikes</span>
                <Switch
                  checked={vibesAlertDm}
                  onCheckedChange={setVibesAlertDm}
                  data-testid="switch-vibes-alert-dm"
                  className="data-[state=checked]:bg-brand-teal"
                />
              </div>

              <Button
                onClick={handleSaveVibesSettings}
                data-testid="button-save-vibes"
                disabled={updateSettingsMutation.isPending}
                className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Vibes Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Disputes List */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={disputeStatusFilter} onValueChange={setDisputeStatusFilter}>
              <TabsList className="grid w-full grid-cols-4 bg-surface-elevated">
                <TabsTrigger value="open" data-testid="tab-disputes-open">Open</TabsTrigger>
                <TabsTrigger value="under_review" data-testid="tab-disputes-under-review">Under Review</TabsTrigger>
                <TabsTrigger value="resolved" data-testid="tab-disputes-resolved">Resolved</TabsTrigger>
                <TabsTrigger value="dismissed" data-testid="tab-disputes-dismissed">Dismissed</TabsTrigger>
              </TabsList>

              <TabsContent value={disputeStatusFilter} className="mt-4">
                {disputesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full bg-surface-hover" />
                    ))}
                  </div>
                ) : disputesData?.disputes && disputesData.disputes.length > 0 ? (
                  <div className="border border-border-subtle rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-surface-elevated border-border-subtle hover:bg-surface-elevated">
                          <TableHead className="text-text-secondary">Kind</TableHead>
                          <TableHead className="text-text-secondary">Subject ID</TableHead>
                          <TableHead className="text-text-secondary">Opened By</TableHead>
                          <TableHead className="text-text-secondary">Status</TableHead>
                          <TableHead className="text-text-secondary">Created</TableHead>
                          <TableHead className="text-text-secondary">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disputesData.disputes.map((dispute) => (
                          <TableRow key={dispute.id} className="border-border-subtle hover:bg-surface-hover" data-testid={`dispute-row-${dispute.id}`}>
                            <TableCell className="text-text-primary capitalize">{dispute.kind}</TableCell>
                            <TableCell className="text-text-primary font-mono text-xs">
                              {dispute.subjectId?.substring(0, 8) || 'N/A'}
                            </TableCell>
                            <TableCell className="text-text-primary">{dispute.openedBy}</TableCell>
                            <TableCell>
                              <Badge
                                className={`${
                                  dispute.status === 'resolved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                  dispute.status === 'dismissed' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                                  dispute.status === 'under_review' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                  'bg-red-500/20 text-red-400 border-red-500/30'
                                } border`}
                                data-testid={`badge-dispute-status-${dispute.id}`}
                              >
                                {dispute.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-text-secondary text-xs">
                              {new Date(dispute.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handleOpenDisputeDialog(dispute)}
                                data-testid={`button-resolve-dispute-${dispute.id}`}
                                size="sm"
                                variant="secondary"
                                className="text-text-primary border border-border-default hover:bg-surface-hover"
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-text-secondary" data-testid="empty-disputes">
                    <Scale className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                    <p>No disputes found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Trade Fairness Snapshot */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Trade Fairness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={tradeId}
                  onChange={(e) => setTradeId(e.target.value)}
                  placeholder="Enter Trade ID"
                  data-testid="input-trade-id"
                  className="flex-1 bg-surface-elevated border-border-default text-text-primary"
                />
                <Button
                  onClick={handleSearchTrade}
                  data-testid="button-search-trade"
                  disabled={isEvaluatingTrade}
                  className="bg-brand-teal hover:bg-brand-teal/90 text-white"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isEvaluatingTrade ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {tradeEvaluation ? (
                <div className="p-4 bg-surface-elevated border border-border-subtle rounded-lg space-y-3" data-testid="trade-evaluation-result">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-secondary">Fairness Score</span>
                    <Badge
                      className={`text-lg font-bold ${
                        tradeEvaluation.fairness >= 70 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        tradeEvaluation.fairness >= 40 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-red-500/20 text-red-400 border-red-500/30'
                      } border`}
                      data-testid="badge-fairness-score"
                    >
                      {tradeEvaluation.fairness}/100
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-text-secondary block mb-1">Rationale</span>
                    <p className="text-sm text-text-primary" data-testid="text-fairness-rationale">
                      {tradeEvaluation.rationale}
                    </p>
                  </div>

                  <div className="text-xs text-text-muted">
                    Evaluated: {new Date(tradeEvaluation.timestamp).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary" data-testid="empty-trade-evaluation">
                  <Search className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                  <p>Enter trade ID to evaluate</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Moderation Tools */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Moderation Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Freeze Thread Form */}
              <div className="space-y-4 p-4 bg-surface-elevated border border-border-subtle rounded-lg">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Freeze Thread
                </h3>

                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-2">Channel ID</label>
                  <Input
                    value={freezeChannelId}
                    onChange={(e) => setFreezeChannelId(e.target.value)}
                    placeholder="123456789012345678"
                    data-testid="input-freeze-channel-id"
                    className="bg-surface-card border-border-default text-text-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-2">Minutes (1-1440)</label>
                  <Input
                    type="number"
                    value={freezeMinutes}
                    onChange={(e) => setFreezeMinutes(parseInt(e.target.value) || 60)}
                    min={1}
                    max={1440}
                    data-testid="input-freeze-minutes"
                    className="bg-surface-card border-border-default text-text-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-2">Reason</label>
                  <textarea
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Reason for freezing thread..."
                    data-testid="textarea-freeze-reason"
                    className="w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent min-h-[80px]"
                  />
                </div>

                <Button
                  onClick={handleFreezeThread}
                  data-testid="button-freeze-thread"
                  disabled={freezeThreadMutation.isPending}
                  className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {freezeThreadMutation.isPending ? 'Freezing...' : 'Freeze Thread'}
                </Button>
              </div>

              {/* Clarify Rule Form */}
              <div className="space-y-4 p-4 bg-surface-elevated border border-border-subtle rounded-lg">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Clarify Rule
                </h3>

                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-2">Channel ID</label>
                  <Input
                    value={clarifyChannelId}
                    onChange={(e) => setClarifyChannelId(e.target.value)}
                    placeholder="123456789012345678"
                    data-testid="input-clarify-channel-id"
                    className="bg-surface-card border-border-default text-text-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-2">Question</label>
                  <textarea
                    value={clarifyQuestion}
                    onChange={(e) => setClarifyQuestion(e.target.value)}
                    placeholder="What rule question should the AI clarify?"
                    data-testid="textarea-clarify-question"
                    className="w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent min-h-[140px]"
                  />
                </div>

                <Button
                  onClick={handleClarifyRule}
                  data-testid="button-clarify-rule"
                  disabled={clarifyRuleMutation.isPending}
                  className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {clarifyRuleMutation.isPending ? 'Clarifying...' : 'Clarify Rule'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 3: Highlights Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={highlightsWeek.toString()} onValueChange={(val) => setHighlightsWeek(parseInt(val))}>
                  <SelectTrigger className="w-32 bg-surface-elevated border-border-default text-text-primary" data-testid="select-highlights-week">
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                      <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => refetchHighlights()}
                  data-testid="button-fetch-highlights"
                  disabled={highlightsLoading}
                  className="bg-brand-teal hover:bg-brand-teal/90 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Fetch
                </Button>
                <Button
                  onClick={() => computeHighlightsMutation.mutate()}
                  data-testid="button-compute-highlights"
                  disabled={computeHighlightsMutation.isPending}
                  className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {computeHighlightsMutation.isPending ? 'Computing...' : 'Compute'}
                </Button>
              </div>

              {highlightsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : highlightsData?.highlights && highlightsData.highlights.length > 0 ? (
                <div className="space-y-3">
                  {highlightsData.highlights.map((highlight) => (
                    <div 
                      key={highlight.id} 
                      className="p-4 bg-surface-elevated border border-border-subtle rounded-lg space-y-2"
                      data-testid={`highlight-card-${highlight.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`${
                            highlight.kind === 'comeback' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            highlight.kind === 'blowout' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            highlight.kind === 'bench_tragedy' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-brand-teal/20 text-brand-teal border-brand-teal/30'
                          } border`}
                          data-testid={`badge-highlight-kind-${highlight.id}`}
                        >
                          {highlight.kind.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-text-muted">
                          {new Date(highlight.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-text-primary">
                        <pre className="whitespace-pre-wrap font-sans">
                          {JSON.stringify(highlight.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary" data-testid="empty-highlights">
                  <Trophy className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                  <p>No highlights for this week</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 3: Rivalries Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Swords className="w-5 h-5" />
                Rivalries
              </CardTitle>
              <Button
                onClick={() => updateRivalriesMutation.mutate()}
                data-testid="button-update-rivalries"
                disabled={updateRivalriesMutation.isPending}
                className="bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {updateRivalriesMutation.isPending ? 'Updating...' : 'Update Rivalries'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rivalriesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : rivalriesData?.rivalries && rivalriesData.rivalries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matchup</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Last Meeting</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rivalriesData.rivalries.map((rivalry) => (
                    <TableRow key={rivalry.id} data-testid={`rivalry-row-${rivalry.id}`}>
                      <TableCell className="font-medium">
                        {rivalry.teamA} vs {rivalry.teamB}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{rivalry.aWins}-{rivalry.bWins}</span>
                      </TableCell>
                      <TableCell>
                        {rivalry.lastMeetingWeek ? `Week ${rivalry.lastMeetingWeek}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {rivalry.aWins === rivalry.bWins && rivalry.aWins > 0 ? (
                          <Badge className="bg-brand-pink/20 text-brand-pink border-brand-pink/30 border">
                            Rubber Match!
                          </Badge>
                        ) : Math.abs(rivalry.aWins - rivalry.bWins) === 1 ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
                            Close
                          </Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-text-secondary" data-testid="empty-rivalries">
                <Swords className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                <p>No rivalries tracked yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase 3: Content Queue Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Content Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={contentQueueStatusFilter} onValueChange={setContentQueueStatusFilter}>
              <TabsList className="grid w-full grid-cols-4 bg-surface-elevated">
                <TabsTrigger value="all" data-testid="tab-queue-all">All</TabsTrigger>
                <TabsTrigger value="queued" data-testid="tab-queue-queued">Queued</TabsTrigger>
                <TabsTrigger value="posted" data-testid="tab-queue-posted">Posted</TabsTrigger>
                <TabsTrigger value="skipped" data-testid="tab-queue-skipped">Skipped</TabsTrigger>
              </TabsList>

              <TabsContent value={contentQueueStatusFilter} className="mt-4">
                {contentQueueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : contentQueueData?.queue && contentQueueData.queue.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message ID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contentQueueData.queue.map((item) => (
                        <TableRow key={item.id} data-testid={`queue-row-${item.id}`}>
                          <TableCell className="text-sm">
                            {new Date(item.scheduledAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-brand-teal/20 text-brand-teal border-brand-teal/30 border">
                              {item.template}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${
                                item.status === 'posted' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                item.status === 'queued' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              } border`}
                              data-testid={`badge-queue-status-${item.id}`}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-text-muted">
                            {item.postedMessageId || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {(item.status === 'skipped' || item.status === 'posted') && (
                              <Button
                                onClick={() => reenqueueContentMutation.mutate(item)}
                                data-testid={`button-reenqueue-${item.id}`}
                                disabled={reenqueueContentMutation.isPending}
                                variant="secondary"
                                className="text-xs"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Re-enqueue
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-text-secondary" data-testid="empty-content-queue">
                    <Clock className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                    <p>No content in queue</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Phase 5: Reminders Section */}
      {leagueId && (
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Toggles Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Preset Reminders</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border-subtle">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-teal" />
                      <span className="font-medium text-text-primary">Lineup Lock Reminder</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">Sunday 12:30 PM ET</p>
                  </div>
                  <Switch
                    data-testid="switch-reminder-lineup-lock"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border-subtle">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-brand-pink" />
                      <span className="font-medium text-text-primary">Waivers Reminder</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">Wednesday 9:00 AM local</p>
                  </div>
                  <Switch
                    data-testid="switch-reminder-waivers"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border-subtle">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="font-medium text-text-primary">Trade Deadline Reminder</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">Daily at noon (checks deadline proximity)</p>
                  </div>
                  <Switch
                    data-testid="switch-reminder-trade-deadline"
                  />
                </div>
              </div>
            </div>

            {/* Custom Reminders Section */}
            <div className="space-y-4 border-t border-border-subtle pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Custom Reminders</h3>
                <Button
                  size="sm"
                  data-testid="button-add-custom-reminder"
                  className="bg-brand-teal hover:bg-brand-teal/90 text-white"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Add Custom
                </Button>
              </div>

              {/* Custom reminders list will go here */}
              <div className="text-center py-8 text-text-secondary" data-testid="empty-custom-reminders">
                <Bell className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                <p>No custom reminders yet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owner Mapping Dialog */}
      <Dialog
        open={isOwnerDialogOpen}
        onClose={() => {
          setIsOwnerDialogOpen(false);
          resetOwnerForm();
        }}
        title="Map Owner"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Discord Username</label>
            <Input
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
              placeholder="JohnDoe#1234"
              data-testid="input-discord-username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Discord User ID <span className="text-red-400">*</span>
            </label>
            <Input
              value={discordUserId}
              onChange={(e) => setDiscordUserId(e.target.value)}
              placeholder="123456789012345678"
              data-testid="input-discord-userid"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Sleeper Owner ID</label>
            <Input
              value={sleeperOwnerId}
              onChange={(e) => setSleeperOwnerId(e.target.value)}
              placeholder="optional"
              data-testid="input-sleeper-ownerid"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Sleeper Team Name</label>
            <Input
              value={sleeperTeamName}
              onChange={(e) => setSleeperTeamName(e.target.value)}
              placeholder="Team Name"
              data-testid="input-sleeper-teamname"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setIsOwnerDialogOpen(false);
                resetOwnerForm();
              }}
              data-testid="button-cancel-owner"
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOwner}
              data-testid="button-save-owner"
              disabled={createMemberMutation.isPending}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
            >
              {createMemberMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog
        open={isReminderDialogOpen}
        onClose={() => {
          setIsReminderDialogOpen(false);
          resetReminderForm();
        }}
        title={editingReminder ? 'Edit Reminder' : 'Add Reminder'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Type <span className="text-red-400">*</span>
            </label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger data-testid="select-reminder-type" className="bg-surface-elevated border-border-default text-text-primary">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-default">
                {REMINDER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value} className="text-text-primary hover:bg-surface-hover">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Cron Schedule <span className="text-red-400">*</span>
            </label>
            <Input
              value={reminderCron}
              onChange={(e) => setReminderCron(e.target.value)}
              placeholder="0 12 * * *"
              data-testid="input-reminder-cron"
            />
            <p className="text-xs text-text-muted mt-1">Example: "0 12 * * *" = Daily at noon</p>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">Timezone</label>
            <Select value={reminderTimezone} onValueChange={setReminderTimezone}>
              <SelectTrigger data-testid="select-reminder-timezone" className="bg-surface-elevated border-border-default text-text-primary">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-default">
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz} className="text-text-primary hover:bg-surface-hover">
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">Enabled</label>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={setReminderEnabled}
              data-testid="switch-reminder-enabled"
              className="data-[state=checked]:bg-brand-teal"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setIsReminderDialogOpen(false);
                resetReminderForm();
              }}
              data-testid="button-cancel-reminder"
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveReminder}
              data-testid="button-save-reminder"
              disabled={createReminderMutation.isPending || updateReminderMutation.isPending}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
            >
              {(createReminderMutation.isPending || updateReminderMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog
        open={isDisputeDialogOpen}
        onClose={() => {
          setIsDisputeDialogOpen(false);
          setSelectedDispute(null);
          setDisputeResolutionNotes('');
        }}
        title="Manage Dispute"
        size="md"
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-elevated border border-border-subtle rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-text-muted">Kind:</span>
                  <span className="text-text-primary ml-2 capitalize">{selectedDispute.kind}</span>
                </div>
                <div>
                  <span className="text-text-muted">Opened by:</span>
                  <span className="text-text-primary ml-2">{selectedDispute.openedBy}</span>
                </div>
                {selectedDispute.subjectId && (
                  <div className="col-span-2">
                    <span className="text-text-muted">Subject ID:</span>
                    <span className="text-text-primary ml-2 font-mono text-xs">{selectedDispute.subjectId}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">
                Status <span className="text-red-400">*</span>
              </label>
              <Select value={disputeNewStatus} onValueChange={setDisputeNewStatus}>
                <SelectTrigger data-testid="select-dispute-status" className="bg-surface-elevated border-border-default text-text-primary">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-surface-card border-border-default">
                  <SelectItem value="open" className="text-text-primary hover:bg-surface-hover">Open</SelectItem>
                  <SelectItem value="under_review" className="text-text-primary hover:bg-surface-hover">Under Review</SelectItem>
                  <SelectItem value="resolved" className="text-text-primary hover:bg-surface-hover">Resolved</SelectItem>
                  <SelectItem value="dismissed" className="text-text-primary hover:bg-surface-hover">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">Resolution Notes</label>
              <textarea
                value={disputeResolutionNotes}
                onChange={(e) => setDisputeResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes..."
                data-testid="textarea-dispute-resolution"
                className="w-full rounded-md border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent min-h-[120px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setIsDisputeDialogOpen(false);
                  setSelectedDispute(null);
                  setDisputeResolutionNotes('');
                }}
                data-testid="button-cancel-dispute"
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDispute}
                data-testid="button-save-dispute"
                disabled={updateDisputeMutation.isPending}
                className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
              >
                {updateDisputeMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Digest Preview Dialog */}
      <Dialog
        open={isDigestPreviewOpen}
        onClose={() => {
          setIsDigestPreviewOpen(false);
          setDigestPreviewData(null);
        }}
        title="Digest Preview"
        size="lg"
      >
        <div className="space-y-4">
          {digestPreviewData ? (
            <div className="max-h-[500px] overflow-y-auto">
              <div className="p-4 bg-surface-elevated border border-border-subtle rounded-lg">
                <pre className="text-xs text-text-primary whitespace-pre-wrap font-mono">
                  {JSON.stringify(digestPreviewData, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center text-text-muted py-8">
              No digest preview available
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setIsDigestPreviewOpen(false);
                setDigestPreviewData(null);
              }}
              data-testid="button-close-digest-preview"
              variant="secondary"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Phase 6: Add Rules Document Dialog */}
      <Dialog
        open={isRulesModalOpen}
        onClose={() => {
          setIsRulesModalOpen(false);
          setDocumentTitle('');
          setDocumentVersion('v1.0');
          setDocumentContent('');
        }}
        title="Add Rules Document"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <Input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="League Constitution 2024"
              data-testid="input-document-title"
              className="bg-surface-elevated border-border-default text-text-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Version
            </label>
            <Input
              value={documentVersion}
              onChange={(e) => setDocumentVersion(e.target.value)}
              placeholder="v1.0"
              data-testid="input-document-version"
              className="bg-surface-elevated border-border-default text-text-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary block mb-2">
              Content <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              placeholder="Paste your league constitution here..."
              rows={12}
              data-testid="textarea-document-content"
              className="bg-surface-elevated border-border-default text-text-primary font-mono text-sm"
            />
            <p className="text-xs text-text-muted mt-1">
              Paste your league rules or constitution. The system will automatically parse and index it.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setIsRulesModalOpen(false);
                setDocumentTitle('');
                setDocumentVersion('v1.0');
                setDocumentContent('');
              }}
              data-testid="button-cancel-document"
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!documentTitle.trim() || !documentContent.trim()) {
                  toast.error('Validation error', {
                    description: 'Title and content are required',
                  });
                  return;
                }
                addDocumentMutation.mutate({
                  title: documentTitle,
                  version: documentVersion,
                  content: documentContent,
                });
              }}
              data-testid="button-save-document"
              disabled={addDocumentMutation.isPending}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
            >
              {addDocumentMutation.isPending ? 'Indexing...' : 'Add Document'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
