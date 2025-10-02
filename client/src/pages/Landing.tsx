import { Link } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Trophy, Zap, MessageSquare, BarChart3 } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#009898] to-[#007070]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
              <span className="text-3xl font-bold text-[#009898]">TC</span>
            </div>
            <h1 className="text-5xl font-bold text-white">THE COMMISH</h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Your AI-powered fantasy football co-commissioner. Smart insights, automated reports, and seamless league management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Trophy, title: 'Weekly Reports', desc: 'Auto-generated recaps' },
            { icon: Zap, title: 'Smart Alerts', desc: 'Lineup & waiver insights' },
            { icon: MessageSquare, title: 'Discord Bot', desc: 'Rules Q&A via chat' },
            { icon: BarChart3, title: 'Trade Analysis', desc: 'Fairness scoring' },
          ].map((feature, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <feature.icon className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-white/80">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/app">
            <Button size="md" className="bg-white text-[#009898] hover:bg-gray-100 text-lg px-8 py-3" data-testid="button-enter-demo">
              Enter Demo Mode
            </Button>
          </Link>
          <p className="mt-4 text-sm text-white/70">
            Explore all features with sample data - no signup required
          </p>
        </div>
      </div>
    </div>
  );
}
