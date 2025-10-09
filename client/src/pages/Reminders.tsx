import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Calendar,
  Trash2,
  Edit,
  Plus,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAppStore } from '@/store/useAppStore';
import type { Reminder } from '@shared/schema';

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

export function RemindersPage() {
  const { selectedLeagueId } = useAppStore();

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderType, setReminderType] = useState('');
  const [reminderCron, setReminderCron] = useState('');
  const [reminderTimezone, setReminderTimezone] = useState('UTC');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // Fetch reminders
  const { data: remindersData, isLoading: remindersLoading } = useQuery<{ reminders: Reminder[] }>({
    queryKey: ['/api/leagues', selectedLeagueId, 'reminders'],
    enabled: !!selectedLeagueId,
  });

  // Create Reminder Mutation
  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const response = await apiRequest('POST', `/api/leagues/${selectedLeagueId}/reminders`, reminderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leagues', selectedLeagueId, 'reminders'] });
      toast.success('Reminder created', {
        description: 'New reminder has been added',
      });
      setIsDialogOpen(false);
      resetForm();
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
      queryClient.invalidateQueries({ queryKey: ['/api/leagues', selectedLeagueId, 'reminders'] });
      toast.success('Reminder updated', {
        description: 'Reminder has been updated successfully',
      });
      setIsDialogOpen(false);
      setEditingReminder(null);
      resetForm();
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
      queryClient.invalidateQueries({ queryKey: ['/api/leagues', selectedLeagueId, 'reminders'] });
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

  const resetForm = () => {
    setReminderType('');
    setReminderCron('');
    setReminderTimezone('UTC');
    setReminderEnabled(true);
  };

  const handleCreateReminder = () => {
    setEditingReminder(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setReminderType(reminder.type);
    setReminderCron(reminder.cron);
    setReminderTimezone(reminder.timezone);
    setReminderEnabled(reminder.enabled);
    setIsDialogOpen(true);
  };

  const handleToggleReminder = async (reminder: Reminder) => {
    await updateReminderMutation.mutateAsync({
      id: reminder.id,
      data: { enabled: !reminder.enabled },
    });
  };

  const handleSaveReminder = () => {
    if (!reminderType || !reminderCron) {
      toast.error('Missing fields', {
        description: 'Please fill in all required fields',
      });
      return;
    }

    const reminderData = {
      type: reminderType,
      cron: reminderCron,
      timezone: reminderTimezone,
      enabled: reminderEnabled,
    };

    if (editingReminder) {
      updateReminderMutation.mutate({
        id: editingReminder.id,
        data: reminderData,
      });
    } else {
      createReminderMutation.mutate(reminderData);
    }
  };

  if (remindersLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary" data-testid="reminders-title">
            Reminders
          </h1>
          <p className="text-text-secondary mt-1">
            Manage automated reminders for your league
          </p>
        </div>
        <Button onClick={handleCreateReminder} data-testid="button-create-reminder">
          <Plus className="h-4 w-4 mr-2" />
          New Reminder
        </Button>
      </div>

      <Card className="bg-surface-card border-border-default shadow-depth1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Bell className="h-5 w-5 text-brand-teal" />
            Active Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {remindersData?.reminders && remindersData.reminders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remindersData.reminders.map((reminder) => (
                  <TableRow key={reminder.id} data-testid={`reminder-row-${reminder.id}`}>
                    <TableCell>
                      <Badge variant="default">{reminder.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{reminder.cron}</TableCell>
                    <TableCell>{reminder.timezone}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleReminder(reminder)}
                        className="flex items-center gap-2"
                        data-testid={`button-toggle-${reminder.id}`}
                      >
                        {reminder.enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-text-muted" />
                        )}
                        <span className={reminder.enabled ? 'text-green-500' : 'text-text-muted'}>
                          {reminder.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditReminder(reminder)}
                          data-testid={`button-edit-${reminder.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReminderMutation.mutate(reminder.id)}
                          data-testid={`button-delete-${reminder.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">No reminders configured yet</p>
              <Button onClick={handleCreateReminder} className="mt-4" data-testid="button-create-first-reminder">
                <Plus className="h-4 w-4 mr-2" />
                Create First Reminder
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        title={editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
      >
        <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-type">Reminder Type</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger id="reminder-type" data-testid="select-reminder-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-cron">Cron Schedule</Label>
              <Input
                id="reminder-cron"
                value={reminderCron}
                onChange={(e) => setReminderCron(e.target.value)}
                placeholder="0 9 * * *"
                data-testid="input-cron-schedule"
              />
              <p className="text-xs text-text-muted">
                Example: "0 9 * * *" runs daily at 9 AM
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-timezone">Timezone</Label>
              <Select value={reminderTimezone} onValueChange={setReminderTimezone}>
                <SelectTrigger id="reminder-timezone" data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="reminder-enabled"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
                data-testid="switch-enabled"
              />
              <Label htmlFor="reminder-enabled">Enabled</Label>
            </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSaveReminder} data-testid="button-save-reminder">
              <Calendar className="h-4 w-4 mr-2" />
              {editingReminder ? 'Update' : 'Create'} Reminder
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
