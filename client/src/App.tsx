import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Switch, Route, useLocation } from 'wouter';
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
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import Setup from './pages/Setup';
import StyleGuide from './pages/StyleGuide';
import PreviewDashboard from './pages/PreviewDashboard';
import { SleeperLinkPage } from './pages/SleeperLinkPage';
import { LeagueSettingsPage } from './pages/LeagueSettingsPage';
import { ConstitutionTemplatesPage } from './pages/ConstitutionTemplatesPage';
import { CommissionerDashboard } from './pages/CommissionerDashboard';
import { AIAsk } from './pages/AIAsk';
import { AIRecaps } from './pages/AIRecaps';
import { AutomationAnnouncements } from './pages/AutomationAnnouncements';
import { AutomationReactions } from './pages/AutomationReactions';
import { ConstitutionDrafts } from './pages/ConstitutionDrafts';
import { Constitution } from './pages/Constitution';
import { Switchboard } from './pages/Switchboard';
import { RemindersPage } from './pages/Reminders';
import { ModerationPage } from './pages/Moderation';
import { ContentStudioPage } from './pages/ContentStudio';

function AppRouter() {
  const [location] = useLocation();
  const isAppRoute = location.startsWith('/app');

  if (isAppRoute) {
    return (
      <AppShell>
        <Switch>
          <Route path="/app" component={DashboardPage} />
          <Route path="/app/commissioner" component={CommissionerDashboard} />
          <Route path="/app/waivers" component={WaiversPage} />
          <Route path="/app/trades" component={TradesPage} />
          <Route path="/app/matchups" component={MatchupsPage} />
          <Route path="/app/reports" component={ReportsPage} />
          <Route path="/app/rules" component={RulesPage} />
          <Route path="/app/chat" component={ChatPage} />
          <Route path="/app/settings" component={SettingsPage} />
          <Route path="/app/terminal" component={TerminalPage} />
          <Route path="/app/sleeper/link" component={SleeperLinkPage} />
          <Route path="/app/settings/:leagueId" component={LeagueSettingsPage} />
          <Route path="/app/constitution/:leagueId" component={ConstitutionTemplatesPage} />
          <Route path="/app/ai/ask" component={AIAsk} />
          <Route path="/app/ai/recaps" component={AIRecaps} />
          <Route path="/app/automation/announcements" component={AutomationAnnouncements} />
          <Route path="/app/automation/reactions" component={AutomationReactions} />
          <Route path="/app/constitution/drafts" component={ConstitutionDrafts} />
          <Route path="/app/constitution" component={Constitution} />
          <Route path="/app/switchboard" component={Switchboard} />
          <Route path="/app/reminders" component={RemindersPage} />
          <Route path="/app/moderation" component={ModerationPage} />
          <Route path="/app/content-studio" component={ContentStudioPage} />
          <Route>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-text-primary mb-2">404</h1>
              <p className="text-text-secondary">Page not found</p>
            </div>
          </Route>
        </Switch>
      </AppShell>
    );
  }

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/landing" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/setup" component={Setup} />
      <Route path="/style-guide" component={StyleGuide} />
      <Route path="/preview-dashboard" component={PreviewDashboard} />
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-surface-base">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-text-primary mb-2">404</h1>
            <p className="text-text-secondary">Page not found</p>
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
