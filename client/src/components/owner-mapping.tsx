import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface OwnerMappingProps {
  leagueId: string;
}

interface TeamOwner {
  id: string;
  leagueId: string;
  teamId: string;
  teamName: string;
  discordUserId: string | null;
  discordUsername: string | null;
  role: string;
}

interface DiscordMember {
  id: string;
  username: string;
  avatar?: string;
}

export function OwnerMapping({ leagueId }: OwnerMappingProps) {
  const { toast } = useToast();
  
  const { data: membersData, isLoading: membersLoading } = useQuery<TeamOwner[]>({
    queryKey: ["/api/v2/owners", leagueId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/owners?leagueId=${leagueId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch team owners");
      }
      return response.json();
    },
    enabled: !!leagueId,
  });
  
  const { data: guildMembersResponse, isLoading: guildMembersLoading } = useQuery<{ ok: boolean; data: DiscordMember[] }>({
    queryKey: ["/api/discord/guild-members", leagueId],
    queryFn: async () => {
      const response = await fetch(`/api/discord/guild-members?leagueId=${leagueId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Discord members");
      }
      return response.json();
    },
    enabled: !!leagueId,
  });
  
  const mapMutation = useMutation({
    mutationFn: async (data: { teamId: string; discordUserId: string; teamName?: string; discordUsername?: string }) => {
      return await apiRequest("POST", "/api/v2/owners/map", {
        leagueId,
        teamId: data.teamId,
        discordUserId: data.discordUserId,
        teamName: data.teamName,
        discordUsername: data.discordUsername,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/owners", leagueId] });
      toast({
        title: "Owner mapping updated",
        description: "The team owner has been successfully linked to Discord user.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update mapping",
        description: error.message || "An error occurred while updating the mapping.",
        variant: "destructive",
      });
    },
  });
  
  const members = membersData || [];
  const guildMembers = guildMembersResponse?.data || [];
  const unmappedCount = members.filter((m) => !m.discordUserId).length;
  const isLoading = membersLoading || guildMembersLoading;
  
  if (isLoading) {
    return (
      <Card data-testid="card-owner-mapping">
        <CardHeader>
          <CardTitle>Team Owners</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Link Discord members to their fantasy teams</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card data-testid="card-owner-mapping">
      <CardHeader>
        <CardTitle>Team Owners</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Link Discord members to their fantasy teams</p>
      </CardHeader>
      <CardContent>
        {unmappedCount > 0 && (
          <Alert variant="destructive" className="mb-4" data-testid="alert-unmapped-teams">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {unmappedCount} team(s) not mapped. Mentions and personalization won't work for unmapped teams.
            </AlertDescription>
          </Alert>
        )}
        
        {members.length === 0 ? (
          <Alert>
            <AlertDescription>
              No teams found. Make sure your league is properly configured.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const currentDiscordMember = guildMembers.find(gm => gm.id === member.discordUserId);
              
              return (
                <div 
                  key={member.teamId} 
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-secondary/20" 
                  data-testid={`row-team-${member.teamId}`}
                >
                  <div className="flex-1">
                    <div className="font-medium" data-testid={`text-team-name-${member.teamId}`}>
                      {member.teamName || "Unknown Team"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Team ID: {member.teamId}
                    </div>
                  </div>
                  
                  <Select
                    value={member.discordUserId || ""}
                    onValueChange={(value) => {
                      const selectedMember = guildMembers.find(gm => gm.id === value);
                      mapMutation.mutate({
                        teamId: member.teamId,
                        discordUserId: value,
                        teamName: member.teamName,
                        discordUsername: selectedMember?.username,
                      });
                    }}
                    disabled={mapMutation.isPending}
                  >
                    <SelectTrigger className="w-[200px]" data-testid={`select-discord-user-${member.teamId}`}>
                      <SelectValue placeholder="Select Discord user" />
                    </SelectTrigger>
                    <SelectContent>
                      {guildMembers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No Discord members available
                        </div>
                      ) : (
                        guildMembers.map((gm) => (
                          <SelectItem key={gm.id} value={gm.id}>
                            {gm.username}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
