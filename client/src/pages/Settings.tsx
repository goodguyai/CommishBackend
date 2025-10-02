import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export function SettingsPage() {
  const { userPersona, setUserPersona } = useAppStore();

  const personas = [
    { id: 'neutral', name: 'Neutral', desc: 'Plain, concise updates' },
    { id: 'sassy', name: 'Sassy', desc: 'Playful with light sarcasm' },
    { id: 'batman', name: 'Batman', desc: 'Terse vigilante metaphors' },
    { id: 'yoda', name: 'Yoda', desc: 'Inverted syntax wisdom' },
  ] as const;

  const handlePersonaChange = (personaId: 'neutral' | 'sassy' | 'batman' | 'yoda') => {
    setUserPersona(personaId);
    const persona = personas.find(p => p.id === personaId);
    toast.success(`Bot personality updated`, {
      description: `Now using ${persona?.name} style: ${persona?.desc}`,
    });
  };

  const handleNotificationToggle = (notificationType: string, checked: boolean) => {
    toast.info(`${notificationType} ${checked ? 'enabled' : 'disabled'}`, {
      description: `You will ${checked ? 'now receive' : 'no longer receive'} ${notificationType.toLowerCase()}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Settings</h1>
        <p className="text-text-secondary">Personalize your experience</p>
      </div>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Bot Personality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePersonaChange(p.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  userPersona === p.id
                    ? 'border-brand-teal bg-brand-teal/10 shadow-glow'
                    : 'border-border-subtle bg-surface-elevated hover:border-border-default hover:bg-surface-hover'
                }`}
                data-testid={`persona-${p.id}`}
              >
                <div className="font-medium text-text-primary">{p.name}</div>
                <div className="text-sm text-text-secondary mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Waiver alerts', 'Trade proposals', 'Lineup warnings', 'Weekly reports'].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-text-primary">{item}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  onChange={(e) => handleNotificationToggle(item, e.target.checked)}
                  data-testid={`notification-${i}`}
                  className="w-4 h-4 rounded border-border-default bg-surface-elevated text-brand-teal"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
