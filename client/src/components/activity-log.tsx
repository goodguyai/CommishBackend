import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Event {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
  latency?: number;
}

interface ActivityLogProps {
  events: Event[];
  isLoading: boolean;
}

const getEventIcon = (type: string) => {
  switch (type) {
    case "SLEEPER_SYNCED":
      return "🔄";
    case "COMMAND_EXECUTED":
      return "⚡";
    case "DIGEST_DUE":
      return "📧";
    case "RULES_UPDATED":
      return "📝";
    case "INSTALL_COMPLETED":
      return "✅";
    default:
      return "📋";
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case "SLEEPER_SYNCED":
      return "bg-green-500";
    case "COMMAND_EXECUTED":
      return "bg-blue-500";
    case "DIGEST_DUE":
      return "bg-purple-500";
    case "RULES_UPDATED":
      return "bg-amber-500";
    case "INSTALL_COMPLETED":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const getEventDescription = (event: Event) => {
  switch (event.type) {
    case "SLEEPER_SYNCED":
      return "Sleeper sync completed";
    case "COMMAND_EXECUTED":
      return `/${event.payload.commandName} command executed`;
    case "DIGEST_DUE":
      return "Weekly digest generated";
    case "RULES_UPDATED":
      return "Constitution reindexed";
    case "INSTALL_COMPLETED":
      return "Bot installation completed";
    default:
      return event.type.toLowerCase().replace(/_/g, " ");
  }
};

const getEventSubtext = (event: Event) => {
  switch (event.type) {
    case "SLEEPER_SYNCED":
      return "Dynasty League 2024";
    case "COMMAND_EXECUTED":
      return `User: @${event.payload.userId || "unknown"}`;
    case "DIGEST_DUE":
      return "Sent to #the-commish";
    case "RULES_UPDATED":
      return `${event.payload.sections || 312} embeddings updated`;
    case "INSTALL_COMPLETED":
      return `Channel: #${event.payload.channelId || "general"}`;
    default:
      return "System event";
  }
};

export function ActivityLog({ events, isLoading }: ActivityLogProps) {
  if (isLoading) {
    return (
      <Card data-testid="activity-log-loading">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-muted rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock events if none provided
  const displayEvents = events.length > 0 ? events : [
    {
      id: "1",
      type: "SLEEPER_SYNCED",
      payload: { leagueId: "test" },
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      latency: 200
    },
    {
      id: "2", 
      type: "COMMAND_EXECUTED",
      payload: { commandName: "rules", userId: "fantasy_fan" },
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      latency: 1100
    },
    {
      id: "3",
      type: "DIGEST_DUE", 
      payload: {},
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      latency: 3400
    },
    {
      id: "4",
      type: "RULES_UPDATED",
      payload: { sections: 312 },
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      latency: 45000
    }
  ];

  return (
    <Card data-testid="activity-log-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-foreground">Recent Activity</CardTitle>
        <Button variant="outline" size="sm" data-testid="button-view-all-logs">
          View All Logs
        </Button>
      </CardHeader>
      
      <CardContent>
        {displayEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayEvents.map((event) => (
              <div 
                key={event.id} 
                className="flex items-center space-x-3 p-3 bg-secondary rounded-lg"
                data-testid={`activity-event-${event.id}`}
              >
                <div className={`w-2 h-2 ${getEventColor(event.type)} rounded-full`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {getEventIcon(event.type)} {getEventDescription(event)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getEventSubtext(event)} • {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {event.latency && (
                  <div className="text-xs text-muted-foreground">
                    {event.latency >= 1000 ? `${(event.latency / 1000).toFixed(1)}s` : `${event.latency}ms`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
