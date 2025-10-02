import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle, TrendingUp, Users, Trophy } from 'lucide-react';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-600">Week 4 overview and key insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Teams', value: '12', icon: Users, color: 'text-blue-600' },
          { label: 'Active Trades', value: '3', icon: TrendingUp, color: 'text-green-600' },
          { label: 'Waiver Claims', value: '8', icon: Users, color: 'text-purple-600' },
          { label: 'Start/Sit Alerts', value: '5', icon: AlertTriangle, color: 'text-orange-600' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
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
            <div className="space-y-3">
              {[
                { player: 'RB J. Veteran', team: 'ARI', status: 'Out', impact: 'High' },
                { player: 'WR M. RookiePhenom', team: 'NYG', status: 'Questionable', impact: 'Medium' },
                { player: 'QB P. Veteran', team: 'LAR', status: 'Probable', impact: 'Low' },
              ].map((injury, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{injury.player}</div>
                    <div className="text-sm text-gray-500">{injury.team} - {injury.status}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      injury.impact === 'High'
                        ? 'bg-red-100 text-red-800'
                        : injury.impact === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {injury.impact}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiver Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { player: 'RB J. Rookie', team: 'BUF', faab: 18 },
                { player: 'WR T. Breakout', team: 'LAC', faab: 12 },
                { player: 'TE R. Sleeper', team: 'KC', faab: 8 },
              ].map((waiver, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{waiver.player}</div>
                    <div className="text-sm text-gray-500">{waiver.team}</div>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-[#009898]">${waiver.faab}</span>
                    <span className="text-gray-500 ml-1">FAAB</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commissioner Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { task: 'Review pending trade between Birds of Prey and Gridiron Geeks', done: false },
              { task: 'Post Week 4 report to league chat', done: true },
              { task: 'Check injury updates for starting lineups', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  className="w-4 h-4 rounded border-gray-300 text-[#009898]"
                  readOnly
                />
                <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-900'}>
                  {item.task}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
