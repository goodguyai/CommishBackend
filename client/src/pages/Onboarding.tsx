import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CheckCircle } from 'lucide-react';

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  const steps = [
    { id: 1, name: 'Platform', completed: step > 1 },
    { id: 2, name: 'League ID', completed: step > 2 },
    { id: 3, name: 'Scoring', completed: step > 3 },
    { id: 4, name: 'Review', completed: false },
  ];

  return (
    <div className="min-h-screen bg-surface-base py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to THE COMMISH</h1>
          <p className="text-text-secondary">Let's set up your league in a few quick steps</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      s.completed
                        ? 'bg-brand-teal shadow-glow'
                        : step === s.id
                        ? 'bg-brand-teal shadow-glow'
                        : 'bg-surface-hover'
                    }`}
                  >
                    {s.completed ? (
                      <CheckCircle className="w-5 h-5 text-text-primary" />
                    ) : (
                      <span className="text-sm font-medium text-text-primary">{s.id}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-secondary">{s.name}</span>
                </div>
                {i < steps.length - 1 && <div className="w-12 h-px bg-border-subtle mx-2" />}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Select Your Platform'}
              {step === 2 && 'Enter League ID'}
              {step === 3 && 'Confirm Scoring'}
              {step === 4 && 'Review & Launch'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-3">
                <button className="w-full p-4 border-2 border-brand-teal rounded-lg bg-brand-teal/10 hover:bg-brand-teal/20 transition-colors text-left shadow-depth1">
                  <div className="font-medium text-text-primary">Sleeper</div>
                  <div className="text-sm text-text-secondary">Connect your Sleeper league</div>
                </button>
                <button className="w-full p-4 border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors text-left" disabled>
                  <div className="font-medium text-text-muted">ESPN (Coming Soon)</div>
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <Input placeholder="Enter your Sleeper League ID" className="mb-2" />
                <p className="text-sm text-text-muted">
                  Find this in your Sleeper league settings or URL
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <div className="flex justify-between py-2">
                  <span className="text-text-secondary">Scoring:</span>
                  <span className="font-medium text-text-primary">Half-PPR</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-text-secondary">Teams:</span>
                  <span className="font-medium text-text-primary">12</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-text-secondary">Playoffs:</span>
                  <span className="font-medium text-text-primary">6 teams, Weeks 15-17</span>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-brand-teal mx-auto mb-4 drop-shadow-glow" />
                <h3 className="text-lg font-semibold mb-2 text-text-primary">All Set!</h3>
                <p className="text-text-secondary mb-4">Your league is ready to go</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button variant="secondary" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {step < 4 ? (
                <Button onClick={() => setStep(step + 1)} className="flex-1">
                  Continue
                </Button>
              ) : (
                <Button onClick={() => setLocation('/app')} className="flex-1" data-testid="button-launch">
                  Launch Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
