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
        // Store the demo league ID so Dashboard can use it
        if (result.leagueId) {
          localStorage.setItem('selectedLeagueId', result.leagueId);
        }
        
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
      // Check if user is already logged in
      try {
        const user = await api<{ accountId: string; leagues?: any[] }>('/api/app/me');
        
        if (user.accountId) {
          // User is logged in - send them to complete setup
          if (user.leagues && user.leagues.length > 0) {
            // Has incomplete leagues - go to onboarding
            setLocation('/onboarding');
          } else {
            // No leagues - start fresh onboarding
            setLocation('/onboarding');
          }
          return;
        }
      } catch (e) {
        // Not logged in, continue with OAuth
      }
      
      // Get Discord OAuth URL for new users
      const result = await api<{ url: string }>('/api/v2/discord/auth-url', {
        method: 'GET',
      });
      
      if (result.url) {
        // Redirect to Discord OAuth
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error('Failed to start beta activation');
      console.error(error);
      setIsActivatingBeta(false);
    }
  };

  return (
    <div className="space-y-6">
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
      
      <div className="text-center">
        <p className="text-[#9CA3AF] text-sm">
          Already have an account?{' '}
          <a 
            href="/login" 
            className="text-[#009898] hover:text-[#00b8b8] font-medium transition-colors"
            data-testid="link-login"
          >
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
