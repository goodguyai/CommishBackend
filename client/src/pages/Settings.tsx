import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';

export function SettingsPage() {
  const { userPersona, setUserPersona } = useAppStore();

  const personas = [
    { id: 'neutral', name: 'Neutral', desc: 'Plain, concise updates' },
    { id: 'sassy', name: 'Sassy', desc: 'Playful with light sarcasm' },
    { id: 'batman', name: 'Batman', desc: 'Terse vigilante metaphors' },
    { id: 'yoda', name: 'Yoda', desc: 'Inverted syntax wisdom' },
  ] as const;

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
                onClick={() => setUserPersona(p.id)}
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
