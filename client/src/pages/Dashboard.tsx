import { useQuery } from '@tanstack/react-query';
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
  const { data: injuries, isLoading: injuriesLoading } = useQuery<{ entries: InjuryEntry[] }>({
    queryKey: ['/api/mock/injuries'],
  });

  const { data: waivers, isLoading: waiversLoading } = useQuery<WaiverSuggestion[]>({
    queryKey: ['/api/mock/waivers/suggestions'],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<CommissionerTask[]>({
    queryKey: ['/api/mock/commissioner/tasks'],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-midnight mb-1">Dashboard</h1>
        <p className="text-neutral-midnight/60">Week 4 overview and key insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Teams', value: '12', icon: Users, color: 'text-brand-teal' },
          { label: 'Active Trades', value: '3', icon: TrendingUp, color: 'text-brand-teal' },
          { label: 'Waiver Claims', value: '8', icon: Users, color: 'text-brand-gold' },
          { label: 'Start/Sit Alerts', value: '5', icon: AlertTriangle, color: 'text-cta-coral' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-midnight/60">{stat.label}</p>
                  <p className="text-2xl font-bold text-neutral-midnight mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Injury Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {injuriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {injuries?.entries.slice(0, 3).map((injury, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-panel rounded-lg">
                    <div>
                      <div className="font-medium text-neutral-midnight">{injury.player}</div>
                      <div className="text-sm text-neutral-midnight/60">{injury.team} - {injury.status}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        injury.impact === 'High'
                          ? 'bg-cta-coral/10 text-cta-coral'
                          : injury.impact === 'Medium'
                          ? 'bg-brand-gold/10 text-brand-gold'
                          : 'bg-brand-teal/10 text-brand-teal'
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

        <Card>
          <CardHeader>
            <CardTitle>Waiver Radar</CardTitle>
          </CardHeader>
          <CardContent>
            {waiversLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {waivers?.slice(0, 3).map((waiver, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-panel rounded-lg">
                    <div>
                      <div className="font-medium text-neutral-midnight">{waiver.player}</div>
                      <div className="text-sm text-neutral-midnight/60">{waiver.team}</div>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-brand-teal">${waiver.suggestFaab}</span>
                      <span className="text-neutral-midnight/60 ml-1">FAAB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commissioner Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tasks?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.done}
                    className="w-4 h-4 rounded border-neutral-panel text-brand-teal"
                    readOnly
                  />
                  <span className={item.done ? 'text-neutral-midnight/40 line-through' : 'text-neutral-midnight'}>
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
