import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Switch, Route } from 'wouter';
import { TooltipProvider } from './components/ui/Tooltip';
import { Toaster } from './components/ui/Toast';

import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/Dashboard';
import { WaiversPage } from './pages/Waivers';
import { TradesPage } from './pages/Trades';
import { MatchupsPage } from './pages/Matchups';
import { ReportsPage } from './pages/Reports';
import { RulesPage } from './pages/Rules';
import { ChatPage } from './pages/Chat';
import { SettingsPage } from './pages/Settings';
import { TerminalPage } from './pages/Terminal';
import { OnboardingPage } from './pages/Onboarding';
import { LandingPage } from './pages/Landing';

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/app">
        <AppShell>
          <Switch>
            <Route path="/app" component={DashboardPage} />
            <Route path="/app/waivers" component={WaiversPage} />
            <Route path="/app/trades" component={TradesPage} />
            <Route path="/app/matchups" component={MatchupsPage} />
            <Route path="/app/reports" component={ReportsPage} />
            <Route path="/app/rules" component={RulesPage} />
            <Route path="/app/chat" component={ChatPage} />
            <Route path="/app/settings" component={SettingsPage} />
            <Route path="/app/terminal" component={TerminalPage} />
          </Switch>
        </AppShell>
      </Route>
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
            <p className="text-gray-600">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRouter />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
