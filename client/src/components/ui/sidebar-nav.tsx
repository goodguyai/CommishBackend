import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Crown, Home, Users, Bot, Settings, HelpCircle } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Leagues", href: "/leagues", icon: Users },
  { name: "Setup Wizard", href: "/setup", icon: Bot },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export function SidebarNav() {
  const [location] = useLocation();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col" data-testid="sidebar-nav">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r border-border px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center" data-testid="sidebar-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Crown className="text-primary-foreground w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-foreground">THE COMMISH</h1>
          </div>
        </div>
        
        <nav className="flex flex-1 flex-col" data-testid="sidebar-nav-content">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold",
                          isActive
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                        data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            
            <li className="mt-auto">
              <ul role="list" className="-mx-2 space-y-1">
                {secondaryNavigation.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold",
                          isActive
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                        data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
