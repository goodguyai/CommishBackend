import { Link } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Trophy, Zap, MessageSquare, BarChart3 } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-brand-teal rounded-2xl flex items-center justify-center shadow-glow">
              <span className="text-3xl font-bold text-text-primary">TC</span>
            </div>
            <h1 className="text-5xl font-bold text-text-primary">THE COMMISH</h1>
          </div>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Your AI-powered fantasy football co-commissioner. Smart insights, automated reports, and seamless league management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Trophy, title: 'Weekly Reports', desc: 'Auto-generated recaps', color: 'text-brand-gold' },
            { icon: Zap, title: 'Smart Alerts', desc: 'Lineup & waiver insights', color: 'text-brand-coral' },
            { icon: MessageSquare, title: 'Discord Bot', desc: 'Rules Q&A via chat', color: 'text-brand-teal' },
            { icon: BarChart3, title: 'Trade Analysis', desc: 'Fairness scoring', color: 'text-brand-pink' },
          ].map((feature, i) => (
            <div 
              key={i} 
              className="bg-surface-card backdrop-blur-sm rounded-lg p-6 border border-border-subtle shadow-depth2 hover:shadow-glow transition-all"
              data-testid={`feature-${i}`}
            >
              <feature.icon className={`w-8 h-8 mb-3 ${feature.color}`} />
              <h3 className="font-semibold mb-1 text-text-primary">{feature.title}</h3>
              <p className="text-sm text-text-muted">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button 
                size="md" 
                className="bg-[#009898] hover:bg-[#007878] text-text-primary text-lg px-8 py-3 shadow-depth2" 
                data-testid="button-login"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button 
                size="md" 
                className="bg-gradient-to-r from-brand-coral to-brand-pink text-text-primary hover:opacity-90 text-lg px-8 py-3 shadow-depth2" 
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </Link>
          </div>
          <div>
            <Link href="/app">
              <Button 
                variant="ghost"
                size="md" 
                className="text-text-muted hover:text-text-secondary" 
                data-testid="button-enter-demo"
              >
                Or try Demo Mode
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
