import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { RefreshCw, Save, Edit, X, AlertCircle } from 'lucide-react';

interface LeagueSettings {
  base: {
    scoring?: Record<string, number>;
    roster?: {
      positions?: string[];
      taxi?: boolean;
      ir_slots?: number;
      max_keep?: number | null;
    };
    waivers?: {
      type?: string;
      budget?: number;
      run_day?: string;
      clear_day?: string;
      tiebreaker?: string;
    };
    playoffs?: {
      teams?: number;
      start_week?: number;
      bye_weeks?: number;
    };
    trades?: {
      deadline_week?: number | null;
      veto?: string;
      review_period_hours?: number;
    };
    misc?: {
      divisions?: number;
      schedule_weeks?: number;
    };
  };
  overrides: Record<string, any>;
  merged: Record<string, any>;
}

export function LeagueSettingsPage() {
  const params = useParams<{ leagueId: string }>();
  const leagueId = params.leagueId || localStorage.getItem('selectedLeagueId') || '';
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedOverrides, setEditedOverrides] = useState<Record<string, any>>({});

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ ok: boolean } & LeagueSettings>({
    queryKey: ['/api/v2/settings', leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/settings/${leagueId}`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
    enabled: !!leagueId,
  });

  // Fetch integration for last sync time
  const { data: integrationData } = useQuery<{ ok: boolean; integration: { lastSync?: string } | null }>({
    queryKey: ['/api/v2/sleeper/integration', leagueId],
    queryFn: async () => {
      const res = await fetch(`/api/v2/sleeper/integration/${leagueId}`);
      if (res.status === 404) return { ok: true, integration: null };
      if (!res.ok) throw new Error('Failed to fetch integration');
      return res.json();
    },
    enabled: !!leagueId,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v2/sleeper/sync', {
        leagueId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/settings', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/sleeper/integration', leagueId] });
      toast.success('Settings synced', {
        description: 'League settings have been updated from Sleeper',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to sync', {
        description: error.message || 'An error occurred',
      });
    },
  });

  // Save overrides mutation
  const saveOverridesMutation = useMutation({
    mutationFn: async (overrides: Record<string, any>) => {
      const response = await apiRequest('PUT', `/api/v2/settings/${leagueId}/overrides`, {
        overrides,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/settings', leagueId] });
      toast.success('Overrides saved', {
        description: 'Commissioner overrides have been updated',
      });
      setIsEditMode(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to save overrides', {
        description: error.message || 'An error occurred',
      });
    },
  });

  const handleEditMode = () => {
    setEditedOverrides(settingsData?.overrides || {});
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedOverrides({});
  };

  const handleSaveOverrides = () => {
    saveOverridesMutation.mutate(editedOverrides);
  };

  const updateOverride = (category: string, key: string, value: any) => {
    setEditedOverrides((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value,
      },
    }));
  };

  const hasOverride = (category: string, key: string) => {
    return settingsData?.overrides?.[category]?.[key] !== undefined;
  };

  const getDisplayValue = (category: string, key: string) => {
    if (isEditMode) {
      return editedOverrides?.[category]?.[key] ?? settingsData?.merged?.[category]?.[key] ?? '';
    }
    return settingsData?.merged?.[category]?.[key] ?? '';
  };

  const lastSync = integrationData?.integration?.lastSync;

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">League Settings</h1>
          <p className="text-text-secondary">
            View and override settings synced from Sleeper
            {lastSync && (
              <span className="ml-2 text-xs">
                Last synced: {new Date(lastSync).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveOverrides}
                disabled={saveOverridesMutation.isPending}
                data-testid="button-save-overrides"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveOverridesMutation.isPending ? 'Saving...' : 'Save Overrides'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleEditMode}
                data-testid="button-edit-overrides"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Overrides
              </Button>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                data-testid="button-sync-settings"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditMode && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-600 dark:text-yellow-400">Edit Mode Active</div>
              <div className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
                Changes won't be saved until you click "Save Overrides"
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="scoring" className="space-y-4">
        <TabsList className="bg-surface-elevated">
          <TabsTrigger value="scoring" data-testid="tab-scoring">Scoring</TabsTrigger>
          <TabsTrigger value="roster" data-testid="tab-roster">Roster</TabsTrigger>
          <TabsTrigger value="waivers" data-testid="tab-waivers">Waivers</TabsTrigger>
          <TabsTrigger value="playoffs" data-testid="tab-playoffs">Playoffs</TabsTrigger>
          <TabsTrigger value="trades" data-testid="tab-trades">Trades</TabsTrigger>
          <TabsTrigger value="misc" data-testid="tab-misc">Misc</TabsTrigger>
        </TabsList>

        {/* Scoring Tab */}
        <TabsContent value="scoring">
          <Card className="bg-surface-card border-border-subtle">
            <CardHeader>
              <CardTitle className="text-text-primary">Scoring Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settingsData?.merged?.scoring || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid={`setting-scoring-${key}`}>
                  <div className="flex items-center gap-2">
                    <Label className="text-text-primary capitalize">
                      {key.replace(/_/g, ' ')}
                    </Label>
                    {hasOverride('scoring', key) && (
                      <Badge variant="warning" className="text-xs">Override</Badge>
                    )}
                  </div>
                  {isEditMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={getDisplayValue('scoring', key)}
                      onChange={(e) => updateOverride('scoring', key, parseFloat(e.target.value))}
                      className="w-24 bg-surface-base border-border-default text-text-primary"
                      data-testid={`input-scoring-${key}`}
                    />
                  ) : (
                    <span className="font-medium text-text-primary">{String(value)}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roster Tab */}
        <TabsContent value="roster">
          <Card className="bg-surface-card border-border-subtle">
            <CardHeader>
              <CardTitle className="text-text-primary">Roster Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-roster-positions">
                <Label className="text-text-primary">Positions</Label>
                <span className="font-medium text-text-primary">
                  {settingsData?.merged?.roster?.positions?.join(', ') || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-roster-taxi">
                <div className="flex items-center gap-2">
                  <Label className="text-text-primary">Taxi Squad</Label>
                  {hasOverride('roster', 'taxi') && (
                    <Badge variant="warning" className="text-xs">Override</Badge>
                  )}
                </div>
                {isEditMode ? (
                  <Switch
                    checked={getDisplayValue('roster', 'taxi')}
                    onCheckedChange={(checked) => updateOverride('roster', 'taxi', checked)}
                    data-testid="input-roster-taxi"
                  />
                ) : (
                  <span className="font-medium text-text-primary">
                    {settingsData?.merged?.roster?.taxi ? 'Yes' : 'No'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-roster-ir">
                <div className="flex items-center gap-2">
                  <Label className="text-text-primary">IR Slots</Label>
                  {hasOverride('roster', 'ir_slots') && (
                    <Badge variant="warning" className="text-xs">Override</Badge>
                  )}
                </div>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={getDisplayValue('roster', 'ir_slots')}
                    onChange={(e) => updateOverride('roster', 'ir_slots', parseInt(e.target.value))}
                    className="w-24 bg-surface-base border-border-default text-text-primary"
                    data-testid="input-roster-ir"
                  />
                ) : (
                  <span className="font-medium text-text-primary">
                    {settingsData?.merged?.roster?.ir_slots || 0}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Waivers Tab */}
        <TabsContent value="waivers">
          <Card className="bg-surface-card border-border-subtle">
            <CardHeader>
              <CardTitle className="text-text-primary">Waiver Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-waivers-type">
                <Label className="text-text-primary">Type</Label>
                <span className="font-medium text-text-primary">
                  {settingsData?.merged?.waivers?.type || 'N/A'}
                </span>
              </div>
              {settingsData?.merged?.waivers?.budget && (
                <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-waivers-budget">
                  <div className="flex items-center gap-2">
                    <Label className="text-text-primary">Budget</Label>
                    {hasOverride('waivers', 'budget') && (
                      <Badge variant="warning" className="text-xs">Override</Badge>
                    )}
                  </div>
                  {isEditMode ? (
                    <Input
                      type="number"
                      value={getDisplayValue('waivers', 'budget')}
                      onChange={(e) => updateOverride('waivers', 'budget', parseInt(e.target.value))}
                      className="w-24 bg-surface-base border-border-default text-text-primary"
                      data-testid="input-waivers-budget"
                    />
                  ) : (
                    <span className="font-medium text-text-primary">
                      ${settingsData?.merged?.waivers?.budget}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playoffs Tab */}
        <TabsContent value="playoffs">
          <Card className="bg-surface-card border-border-subtle">
            <CardHeader>
              <CardTitle className="text-text-primary">Playoff Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-playoffs-teams">
                <div className="flex items-center gap-2">
                  <Label className="text-text-primary">Teams</Label>
                  {hasOverride('playoffs', 'teams') && (
                    <Badge variant="warning" className="text-xs">Override</Badge>
                  )}
                </div>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={getDisplayValue('playoffs', 'teams')}
                    onChange={(e) => updateOverride('playoffs', 'teams', parseInt(e.target.value))}
                    className="w-24 bg-surface-base border-border-default text-text-primary"
                    data-testid="input-playoffs-teams"
                  />
                ) : (
                  <span className="font-medium text-text-primary">
                    {settingsData?.merged?.playoffs?.teams || 'N/A'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-playoffs-start">
                <div className="flex items-center gap-2">
                  <Label className="text-text-primary">Start Week</Label>
                  {hasOverride('playoffs', 'start_week') && (
                    <Badge variant="warning" className="text-xs">Override</Badge>
                  )}
                </div>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={getDisplayValue('playoffs', 'start_week')}
                    onChange={(e) => updateOverride('playoffs', 'start_week', parseInt(e.target.value))}
                    className="w-24 bg-surface-base border-border-default text-text-primary"
                    data-testid="input-playoffs-start"
                  />
                ) : (
                  <span className="font-medium text-text-primary">
                    Week {settingsData?.merged?.playoffs?.start_week || 'N/A'}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades">
          <Card className="bg-surface-card border-border-subtle">
            <CardHeader>
              <CardTitle className="text-text-primary">Trade Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-trades-deadline">
                <Label className="text-text-primary">Deadline Week</Label>
                <span className="font-medium text-text-primary">
                  {settingsData?.merged?.trades?.deadline_week 
                    ? `Week ${settingsData.merged.trades.deadline_week}`
                    : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-trades-veto">
                <Label className="text-text-primary">Veto Type</Label>
                <span className="font-medium text-text-primary">
                  {settingsData?.merged?.trades?.veto || 'None'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Misc Tab */}
        <TabsContent value="misc">
          <Card className="bg-surface-card border-border-subtle">
            <CardHeader>
              <CardTitle className="text-text-primary">Miscellaneous Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-misc-divisions">
                <Label className="text-text-primary">Divisions</Label>
                <span className="font-medium text-text-primary">
                  {settingsData?.merged?.misc?.divisions || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg" data-testid="setting-misc-schedule">
                <Label className="text-text-primary">Schedule Weeks</Label>
                <span className="font-medium text-text-primary">
                  {settingsData?.merged?.misc?.schedule_weeks || 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
