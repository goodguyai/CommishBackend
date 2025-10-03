import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { AlertCircle, Sparkles, X, Trash2 } from "lucide-react";
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

interface Suggestion {
  teamId: string;
  teamName: string;
  discordUserId: string;
  discordUsername: string;
  confidence: number;
}

export function OwnerMapping({ leagueId }: OwnerMappingProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
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

  const suggestMutation = useMutation<{ ok: boolean; data: Suggestion[] }, Error>({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/v2/owners/suggest", { leagueId });
      return result as unknown as { ok: boolean; data: Suggestion[] };
    },
    onSuccess: () => {
      setShowSuggestions(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate suggestions",
        description: error.message || "An error occurred while generating suggestions.",
        variant: "destructive",
      });
    },
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

  const unmapMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/v2/owners/${memberId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/owners", leagueId] });
      toast({
        title: "Owner unmapped",
        description: "The team owner has been successfully unmapped.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unmap owner",
        description: error.message || "An error occurred while unmapping the owner.",
        variant: "destructive",
      });
    },
  });
  
  const members = membersData || [];
  const guildMembers = guildMembersResponse?.data || [];
  
  const filteredGuildMembers = guildMembers.filter((gm) =>
    gm.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const unmappedTeams = members.filter((m) => !m.discordUserId);
  const mappedTeams = members.filter((m) => m.discordUserId);
  
  const suggestions: Suggestion[] = suggestMutation.data?.data || [];
  
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
      <CardContent className="space-y-6">
        {members.length === 0 ? (
          <Alert>
            <AlertDescription>
              No teams found. Make sure your league is properly configured.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Mapped Owners Section */}
            {mappedTeams.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Mapped Owners ({mappedTeams.length})</h3>
                <div className="space-y-2">
                  {mappedTeams.map((member) => (
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
                          Mapped to: {member.discordUsername || "Unknown User"}
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-unmap-${member.teamId}`}
                            disabled={unmapMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Unmap
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Unmapping</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unmap {member.teamName} from {member.discordUsername}? 
                              This will remove the Discord link for this team.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-unmap">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => unmapMutation.mutate(member.id)}
                              data-testid="button-confirm-unmap"
                            >
                              Unmap
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmapped Teams Section */}
            {unmappedTeams.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Unmapped Teams ({unmappedTeams.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => suggestMutation.mutate()}
                    disabled={suggestMutation.isPending}
                    data-testid="button-auto-suggest"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {suggestMutation.isPending ? "Generating..." : "Auto-Map Suggestions"}
                  </Button>
                </div>

                {unmappedTeams.length > 0 && (
                  <Alert variant="destructive" data-testid="alert-unmapped-teams">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {unmappedTeams.length} team(s) not mapped. Mentions and personalization won't work for unmapped teams.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Auto-Map Suggestions Table */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="border rounded-lg p-4 bg-primary/5" data-testid="suggestions-container">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Auto-Map Suggestions</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSuggestions(false)}
                        data-testid="button-close-suggestions"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Name</TableHead>
                          <TableHead>Suggested User</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suggestions.map((suggestion) => (
                          <TableRow key={suggestion.teamId} data-testid={`suggestion-row-${suggestion.teamId}`}>
                            <TableCell className="font-medium">{suggestion.teamName}</TableCell>
                            <TableCell>{suggestion.discordUsername}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={suggestion.confidence >= 0.7 ? "success" : "warning"}
                                data-testid={`badge-confidence-${suggestion.teamId}`}
                              >
                                {Math.round(suggestion.confidence * 100)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  mapMutation.mutate({
                                    teamId: suggestion.teamId,
                                    discordUserId: suggestion.discordUserId,
                                    teamName: suggestion.teamName,
                                    discordUsername: suggestion.discordUsername,
                                  });
                                  setShowSuggestions(false);
                                }}
                                disabled={mapMutation.isPending}
                                data-testid={`button-apply-suggestion-${suggestion.teamId}`}
                              >
                                Apply
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {showSuggestions && suggestions.length === 0 && (
                  <Alert data-testid="alert-no-suggestions">
                    <AlertDescription>
                      No auto-mapping suggestions found. Try mapping teams manually.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Manual Mapping for Unmapped Teams */}
                <div className="space-y-2">
                  {/* Search Box */}
                  <div className="relative">
                    <Input
                      placeholder="Search Discord users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-discord-users"
                      className="pr-8"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setSearchQuery("")}
                        data-testid="button-clear-search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {searchQuery && (
                    <p className="text-xs text-muted-foreground" data-testid="text-search-results">
                      {filteredGuildMembers.length} user(s) found
                    </p>
                  )}

                  {unmappedTeams.map((member) => (
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
                          {filteredGuildMembers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              {searchQuery ? "No users found" : "No Discord members available"}
                            </div>
                          ) : (
                            filteredGuildMembers.map((gm) => (
                              <SelectItem key={gm.id} value={gm.id}>
                                {gm.username}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
