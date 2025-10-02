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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-gray-600">Personalize your experience</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bot Personality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => setUserPersona(p.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  userPersona === p.id
                    ? 'border-[#009898] bg-[#009898]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                data-testid={`persona-${p.id}`}
              >
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-sm text-gray-600 mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Waiver alerts', 'Trade proposals', 'Lineup warnings', 'Weekly reports'].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-gray-900">{item}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-gray-300 text-[#009898]"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
