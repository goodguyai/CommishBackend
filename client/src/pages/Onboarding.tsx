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
    <div className="min-h-screen bg-[#f9fafb] py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to THE COMMISH</h1>
          <p className="text-gray-600">Let's set up your league in a few quick steps</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      s.completed
                        ? 'bg-green-500'
                        : step === s.id
                        ? 'bg-[#009898]'
                        : 'bg-gray-300'
                    }`}
                  >
                    {s.completed ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-sm font-medium text-white">{s.id}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{s.name}</span>
                </div>
                {i < steps.length - 1 && <div className="w-12 h-px bg-gray-300 mx-2" />}
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
                <button className="w-full p-4 border-2 border-[#009898] rounded-lg bg-[#009898]/5 hover:bg-[#009898]/10 transition-colors text-left">
                  <div className="font-medium">Sleeper</div>
                  <div className="text-sm text-gray-600">Connect your Sleeper league</div>
                </button>
                <button className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left" disabled>
                  <div className="font-medium text-gray-400">ESPN (Coming Soon)</div>
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <Input placeholder="Enter your Sleeper League ID" className="mb-2" />
                <p className="text-sm text-gray-500">
                  Find this in your Sleeper league settings or URL
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Scoring:</span>
                  <span className="font-medium">Half-PPR</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Teams:</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Playoffs:</span>
                  <span className="font-medium">6 teams, Weeks 15-17</span>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Set!</h3>
                <p className="text-gray-600 mb-4">Your league is ready to go</p>
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
