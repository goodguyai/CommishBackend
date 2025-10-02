import { ReactNode, useState } from 'react';
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
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Waivers', href: '/app/waivers', icon: Users },
  { name: 'Trades', href: '/app/trades', icon: TrendingUp },
  { name: 'Matchups', href: '/app/matchups', icon: Trophy },
  { name: 'Reports', href: '/app/reports', icon: FileText },
  { name: 'Rules', href: '/app/rules', icon: FileText },
  { name: 'Chat', href: '/app/chat', icon: MessageSquare },
  { name: 'Settings', href: '/app/settings', icon: Settings },
  { name: 'Terminal', href: '/app/terminal', icon: TerminalIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { selectedLeagueId, notifications } = useAppStore();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const SidebarContent = () => (
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
          Mode: <span className="font-medium text-brand-teal">Demo</span>
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
        <SidebarContent />
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
              <button className="flex items-center gap-2 rounded-md border border-border-default bg-surface-card px-3 py-1.5 text-sm hover:bg-surface-hover transition-colors max-w-xs shadow-depth1">
                <span className="truncate font-medium text-text-primary">Demo League One</span>
                <ChevronDown className="h-4 w-4 text-text-muted" />
              </button>
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
                  <span className="text-sm font-semibold text-white">DU</span>
                </div>
                <span className="text-sm font-medium text-text-primary hidden sm:block">Demo User</span>
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
