import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import Dashboard from "@/pages/dashboard";
import Leagues from "@/pages/leagues";
import DiscordSetup from "@/pages/discord-setup";
import Help from "@/pages/help";
import NotFound from "@/pages/not-found";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <SidebarNav />
      
      <div className="lg:pl-72 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="-m-2.5 p-2.5 text-muted-foreground lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              {/* Page title will be set by individual pages */}
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Discord Connection Status */}
              <div className="flex items-center gap-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Discord Connected</span>
              </div>
              
              {/* User Menu */}
              <div className="flex items-center gap-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">JD</span>
                </div>
                <span className="text-sm font-medium text-foreground">John Doe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/leagues" component={Leagues} />
        <Route path="/discord-setup" component={DiscordSetup} />
        <Route path="/help" component={Help} />
        <Route path="/settings" component={DiscordSetup} />
        {/* Add other routes as they're implemented */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
