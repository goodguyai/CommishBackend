import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertTriangle, TrendingUp, Users, Trophy } from 'lucide-react';

interface InjuryEntry {
  player: string;
  team: string;
  status: string;
  impact: string;
}

interface WaiverSuggestion {
  id: string;
  player: string;
  team: string;
  suggestFaab: number;
}

interface CommissionerTask {
  id: string;
  text: string;
  done: boolean;
}

export function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data: injuries, isLoading: injuriesLoading } = useQuery<{ entries: InjuryEntry[] }>({
    queryKey: ['/api/mock/injuries'],
  });

  const { data: waivers, isLoading: waiversLoading } = useQuery<WaiverSuggestion[]>({
    queryKey: ['/api/mock/waivers/suggestions'],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<CommissionerTask[]>({
    queryKey: ['/api/mock/commissioner/tasks'],
  });

  const stats = [
    { label: 'Teams', value: '12', icon: Users, color: 'text-brand-teal', href: '/app/matchups' },
    { label: 'Active Trades', value: '3', icon: TrendingUp, color: 'text-brand-teal', href: '/app/trades' },
    { label: 'Waiver Claims', value: '8', icon: Users, color: 'text-brand-gold', href: '/app/waivers' },
    { label: 'Start/Sit Alerts', value: '5', icon: AlertTriangle, color: 'text-brand-coral', href: '/app/matchups' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
        <p className="text-text-secondary">Week 4 overview and key insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            className="bg-surface-card border-border-subtle shadow-depth1 hover:shadow-depth2 transition-all cursor-pointer"
            onClick={() => setLocation(stat.href)}
            data-testid={`stat-card-${i}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary">Injury Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {injuriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {injuries?.entries.slice(0, 3).map((injury, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface-elevated border border-border-subtle rounded-lg">
                    <div>
                      <div className="font-medium text-text-primary">{injury.player}</div>
                      <div className="text-sm text-text-secondary">{injury.team} - {injury.status}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        injury.impact === 'High'
                          ? 'bg-brand-coral/20 text-brand-coral border border-brand-coral/30'
                          : injury.impact === 'Medium'
                          ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                          : 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'
                      }`}
                    >
                      {injury.impact}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-card border-border-subtle shadow-depth2">
          <CardHeader>
            <CardTitle className="text-text-primary">Waiver Radar</CardTitle>
          </CardHeader>
          <CardContent>
            {waiversLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-surface-hover" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {waivers?.slice(0, 3).map((waiver, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 bg-surface-elevated border border-border-subtle rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => setLocation('/app/waivers')}
                  >
                    <div>
                      <div className="font-medium text-text-primary">{waiver.player}</div>
                      <div className="text-sm text-text-secondary">{waiver.team}</div>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-brand-teal">${waiver.suggestFaab}</span>
                      <span className="text-text-muted ml-1">FAAB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface-card border-border-subtle shadow-depth2">
        <CardHeader>
          <CardTitle className="text-text-primary">Commissioner Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tasks?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.done}
                    className="w-4 h-4 rounded border-border-default text-brand-teal bg-surface-elevated"
                    readOnly
                  />
                  <span className={item.done ? 'text-text-muted line-through' : 'text-text-primary'}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
