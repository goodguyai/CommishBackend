import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Zap, Trophy } from 'lucide-react';
import { api } from '@/lib/apiApp';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export function HomeCTAs() {
  const [isActivatingDemo, setIsActivatingDemo] = useState(false);
  const [isActivatingBeta, setIsActivatingBeta] = useState(false);
  const [, setLocation] = useLocation();

  const handleDemoActivation = async () => {
    setIsActivatingDemo(true);
    try {
      const result = await api<{ ok: boolean; leagueId: string }>('/api/app/demo/activate', {
        method: 'POST',
      });
      
      if (result.ok) {
        toast.success('Demo activated! Redirecting to dashboard...');
        setTimeout(() => setLocation('/app'), 1000);
      }
    } catch (error) {
      toast.error('Failed to activate demo');
      console.error(error);
    } finally {
      setIsActivatingDemo(false);
    }
  };

  const handleBetaActivation = async () => {
    setIsActivatingBeta(true);
    try {
      const result = await api<{ ok: boolean; next: string }>('/api/app/beta/activate', {
        method: 'POST',
      });
      
      if (result.ok) {
        toast.success('Beta activated! Redirecting to setup...');
        setTimeout(() => setLocation(result.next || '/onboarding'), 1000);
      }
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('401')) {
        toast.error('Authentication required for beta access');
      } else {
        toast.error('Failed to activate beta');
      }
      console.error(error);
    } finally {
      setIsActivatingBeta(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <Card className="bg-[#111820] border-[#1f2937]" data-testid="card-demo">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>
            <CardTitle className="text-[#F5F7FA]">Try Demo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[#9CA3AF] text-sm">
            Explore THE COMMISH instantly with sample league data. No signup required.
          </p>
          <ul className="text-[#9CA3AF] text-sm space-y-2">
            <li>• Instant access</li>
            <li>• Sample fantasy data</li>
            <li>• All features unlocked</li>
            <li>• No Discord/Sleeper needed</li>
          </ul>
          <Button
            onClick={handleDemoActivation}
            disabled={isActivatingDemo}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            data-testid="cta-try-demo"
          >
            {isActivatingDemo ? 'Activating...' : 'Try Demo Now'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#111820] border-[#1f2937]" data-testid="card-beta">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Trophy className="w-6 h-6 text-green-500" />
            </div>
            <CardTitle className="text-[#F5F7FA]">Activate Beta</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[#9CA3AF] text-sm">
            Connect your real Discord server and Sleeper league for full power.
          </p>
          <ul className="text-[#9CA3AF] text-sm space-y-2">
            <li>• Live Discord integration</li>
            <li>• Real Sleeper data sync</li>
            <li>• Full bot capabilities</li>
            <li>• Setup wizard included</li>
          </ul>
          <Button
            onClick={handleBetaActivation}
            disabled={isActivatingBeta}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            data-testid="cta-activate-beta"
          >
            {isActivatingBeta ? 'Activating...' : 'Activate Beta'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
