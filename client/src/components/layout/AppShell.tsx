import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Trophy, 
  FileText, 
  MessageSquare, 
  Settings, 
  Terminal as TerminalIcon,
  Menu,
  ChevronDown,
  Bell,
  Check,
  BookOpen,
  Zap,
  Shield,
  Palette,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Reminders', href: '/app/reminders', icon: Bell },
  { name: 'Moderation', href: '/app/moderation', icon: Shield },
  { name: 'Content Studio', href: '/app/content-studio', icon: Palette },
  { name: 'Waivers', href: '/app/waivers', icon: Users },
  { name: 'Trades', href: '/app/trades', icon: TrendingUp },
  { name: 'Matchups', href: '/app/matchups', icon: Trophy },
  { name: 'Reports', href: '/app/reports', icon: FileText },
  { name: 'Rules', href: '/app/rules', icon: FileText },
  { name: 'Constitution', href: '/app/constitution', icon: BookOpen },
  { name: 'Switchboard', href: '/app/switchboard', icon: Zap },
  { name: 'Chat', href: '/app/chat', icon: MessageSquare },
  { name: 'Settings', href: '/app/settings', icon: Settings },
  { name: 'Terminal', href: '/app/terminal', icon: TerminalIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { selectedLeagueId, notifications, setSelectedLeague } = useAppStore();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch user data
  const { data: userData } = useQuery<{ 
    email: string; 
    accountId: string;
    leagues: Array<{ id: string; name: string; isDemo: boolean; isBeta: boolean; }>;
  }>({
    queryKey: ['/api/app/me'],
  });

  // Fetch league to determine if demo or beta mode
  const { data: leagueData } = useQuery<{ league: any }>({
    queryKey: ['/api/leagues', selectedLeagueId],
    enabled: !!selectedLeagueId,
  });

  // Auto-select valid league when user data loads
  useEffect(() => {
    if (userData?.leagues && userData.leagues.length > 0) {
      // Check if current selectedLeagueId is valid for this user
      const isValidLeague = userData.leagues.some(l => l.id === selectedLeagueId);
      
      if (!isValidLeague) {
        // Auto-select first league (most recent is first in array)
        const firstLeague = userData.leagues[0];
        console.log('[AppShell] Invalid league selected, auto-selecting:', firstLeague.id);
        setSelectedLeague(firstLeague.id);
      }
    }
  }, [userData?.leagues, selectedLeagueId, setSelectedLeague]);

  const isDemoMode = leagueData?.league?.featureFlags && (leagueData.league.featureFlags as any)?.demo === true;
  const mode = isDemoMode ? 'Demo' : 'Beta';

  // Derive user display values
  const userInitials = userData?.email ? userData.email.substring(0, 2).toUpperCase() : 'DU';
  const userName = userData?.email?.split('@')[0] || 'Demo User';

  // Derive league display value
  const leagueName = leagueData?.league?.name || 'Select League';

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col bg-surface-elevated">
      <div className="flex h-16 items-center px-6 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-teal rounded-lg flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-sm">TC</span>
          </div>
          <span className="font-semibold text-text-primary">THE COMMISH</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || 
              (item.href !== '/app' && location.startsWith(item.href));
            
            return (
              <Link key={item.name} href={item.href}>
                <a
                  onClick={onNavigate}
                  className={clsx(
                    'group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand-teal text-white shadow-glow'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border-subtle p-4">
        <div className="text-xs text-text-muted">
          Mode: <span className="font-medium text-brand-teal">{mode}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-surface-elevated border-r border-border-subtle shadow-depth1">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} position="left">
        <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
      </Drawer>

      <div className="lg:pl-64">
        {/* Topbar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border-subtle bg-surface-elevated px-4 shadow-depth1 sm:gap-x-6 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-text-primary hover:bg-surface-hover"
            onClick={() => setMobileMenuOpen(true)}
            data-testid="mobile-menu-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch items-center">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="flex items-center gap-2 rounded-md border border-border-default bg-surface-card px-3 py-1.5 text-sm hover:bg-surface-hover transition-colors max-w-xs shadow-depth1"
                    data-testid="league-selector"
                  >
                    <span className="truncate font-medium text-text-primary">{leagueName}</span>
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {userData?.leagues && userData.leagues.length > 0 ? (
                    userData.leagues.map((league) => (
                      <DropdownMenuItem
                        key={league.id}
                        onClick={() => setSelectedLeague(league.id)}
                        className="flex items-center justify-between"
                        data-testid={`league-option-${league.id}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{league.name}</span>
                          <span className="text-xs text-text-muted">
                            {league.isDemo ? 'Demo' : 'Beta'}
                          </span>
                        </div>
                        {selectedLeagueId === league.id && (
                          <Check className="h-4 w-4 text-brand-teal" />
                        )}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      No leagues available
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-x-4">
              <button className="relative p-2 text-text-muted hover:text-text-primary transition-colors" data-testid="notifications-button">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-brand-teal text-xs text-white flex items-center justify-center shadow-glow">
                    {unreadCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center shadow-glow">
                  <span className="text-sm font-semibold text-white" data-testid="user-initials">{userInitials}</span>
                </div>
                <span className="text-sm font-medium text-text-primary hidden sm:block" data-testid="user-name">{userName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
