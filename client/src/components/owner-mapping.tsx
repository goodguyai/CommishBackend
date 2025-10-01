import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, CheckCircle, AlertCircle, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OwnerMappingProps {
  leagueId: string;
}

interface DiscordMember {
  id: string;
  discordUserId: string;
  discordUsername: string;
  role: string;
}

interface SleeperOwner {
  ownerId: string;
  teamName: string;
}

interface Mapping {
  id: string;
  sleeperOwnerId: string;
  discordUserId: string;
  sleeperTeamName?: string;
  discordUsername?: string;
}

export function OwnerMapping({ leagueId }: OwnerMappingProps) {
  const { toast } = useToast();
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/owners/data", leagueId],
    queryFn: () => fetch(`/api/owners/data?leagueId=${leagueId}`).then(res => {
      if (!res.ok) throw new Error("Failed to load owner data");
      return res.json();
    }),
    enabled: !!leagueId,
    retry: 1
  });

  const saveMappingsMutation = useMutation({
    mutationFn: async (pairs: Array<{ sleeperOwnerId: string; discordUserId: string; sleeperTeamName?: string; discordUsername?: string }>) => {
      return await apiRequest("POST", "/api/owners/map", {
        leagueId,
        pairs
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners/data", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setPendingMappings({});
      toast({
        title: "Mappings Saved",
        description: "Owner mappings have been updated successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save owner mappings",
        variant: "destructive"
      });
    }
  });

  const discordMembers: DiscordMember[] = data?.discordMembers || [];
  const sleeperOwners: SleeperOwner[] = data?.sleeperOwners || [];
  const existingMappings: Mapping[] = data?.mappings || [];

  // Create a map of existing mappings
  const mappingsBySleeperOwner = new Map(
    existingMappings.map(m => [m.sleeperOwnerId, m.discordUserId])
  );

  // Merge existing and pending mappings
  const currentMappings = new Map(mappingsBySleeperOwner);
  Object.entries(pendingMappings).forEach(([sleeperOwnerId, discordUserId]) => {
    if (discordUserId) {
      currentMappings.set(sleeperOwnerId, discordUserId);
    }
  });

  // Get unmapped owners
  const unmappedOwners = sleeperOwners.filter(
    owner => !currentMappings.has(owner.ownerId)
  );

  // Get available Discord members (not already mapped unless in pending)
  const getAvailableMembers = (forSleeperOwner: string) => {
    const usedDiscordIds = new Set(
      Array.from(currentMappings.entries())
        .filter(([ownerId, _]) => ownerId !== forSleeperOwner)
        .map(([_, discordId]) => discordId)
    );
    return discordMembers.filter(m => !usedDiscordIds.has(m.discordUserId));
  };

  const handleMappingChange = (sleeperOwnerId: string, discordUserId: string) => {
    setPendingMappings(prev => ({
      ...prev,
      [sleeperOwnerId]: discordUserId
    }));
  };

  const handleSave = () => {
    const pairs = Object.entries(pendingMappings)
      .filter(([_, discordUserId]) => discordUserId)
      .map(([sleeperOwnerId, discordUserId]) => {
        const sleeperOwner = sleeperOwners.find(o => o.ownerId === sleeperOwnerId);
        const discordMember = discordMembers.find(m => m.discordUserId === discordUserId);
        return {
          sleeperOwnerId,
          discordUserId,
          sleeperTeamName: sleeperOwner?.teamName,
          discordUsername: discordMember?.discordUsername
        };
      });

    if (pairs.length === 0) {
      toast({
        title: "No Changes",
        description: "No new mappings to save",
        variant: "destructive"
      });
      return;
    }

    saveMappingsMutation.mutate(pairs);
  };

  const hasPendingChanges = Object.keys(pendingMappings).length > 0;

  if (isLoading) {
    return (
      <Card data-testid="owner-mapping-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Owner Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-secondary rounded"></div>
            <div className="h-12 bg-secondary rounded"></div>
            <div className="h-12 bg-secondary rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="owner-mapping-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Owner Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Failed to load owner mapping data. Please ensure the league is properly configured.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="owner-mapping-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Owner Mapping
        </CardTitle>
        <Badge variant={unmappedOwners.length === 0 ? "default" : "secondary"}>
          {existingMappings.length}/{sleeperOwners.length} Mapped
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {unmappedOwners.length === 0 && !hasPendingChanges ? (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              All Sleeper owners are mapped to Discord members!
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Map Sleeper team owners to Discord server members so THE COMMISH can personalize interactions.
            </p>

            <div className="space-y-3">
              {sleeperOwners.map(owner => {
                const currentMapping = currentMappings.get(owner.ownerId);
                const mappedMember = discordMembers.find(m => m.discordUserId === currentMapping);
                const isPending = pendingMappings[owner.ownerId] !== undefined;
                const availableMembers = getAvailableMembers(owner.ownerId);

                return (
                  <div
                    key={owner.ownerId}
                    className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                    data-testid={`mapping-${owner.ownerId}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{owner.teamName}</p>
                      <p className="text-xs text-muted-foreground">Sleeper Owner</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">→</span>
                      <Select
                        value={pendingMappings[owner.ownerId] || currentMapping || ""}
                        onValueChange={(value) => handleMappingChange(owner.ownerId, value)}
                        data-testid={`select-mapping-${owner.ownerId}`}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select Discord member..." />
                        </SelectTrigger>
                        <SelectContent>
                          {currentMapping && !isPending && (
                            <SelectItem value={currentMapping}>
                              {mappedMember?.discordUsername || "Unknown"}
                            </SelectItem>
                          )}
                          {availableMembers.map(member => (
                            <SelectItem key={member.discordUserId} value={member.discordUserId}>
                              {member.discordUsername}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentMapping && !isPending && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasPendingChanges && (
              <Button
                onClick={handleSave}
                disabled={saveMappingsMutation.isPending}
                className="w-full"
                data-testid="save-mappings-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMappingsMutation.isPending ? "Saving..." : `Save ${Object.keys(pendingMappings).length} Mapping(s)`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
