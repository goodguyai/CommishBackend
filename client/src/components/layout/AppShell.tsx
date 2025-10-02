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
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#009898] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TC</span>
          </div>
          <span className="font-semibold text-gray-900">THE COMMISH</span>
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
                    'group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#009898] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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

      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500">
          Mode: <span className="font-medium text-[#009898]">Demo</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} position="left">
        <SidebarContent />
      </Drawer>

      <div className="lg:pl-64">
        {/* Topbar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            data-testid="mobile-menu-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch items-center">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors max-w-xs">
                <span className="truncate font-medium">Demo League One</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors" data-testid="notifications-button">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#009898] text-xs text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#009898] rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">DU</span>
                </div>
                <span className="text-sm font-medium text-gray-900 hidden sm:block">Demo User</span>
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
