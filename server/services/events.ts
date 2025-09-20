import { EventEmitter } from "events";
import { IStorage } from "../storage";
import { InsertEvent } from "@shared/schema";

export class EventBus extends EventEmitter {
  constructor(private storage: IStorage) {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.on("INSTALL_COMPLETED", (data) => this.logEvent("INSTALL_COMPLETED", data));
    this.on("RULES_UPDATED", (data) => this.logEvent("RULES_UPDATED", data));
    this.on("SLEEPER_SYNCED", (data) => this.logEvent("SLEEPER_SYNCED", data));
    this.on("DIGEST_DUE", (data) => this.logEvent("DIGEST_DUE", data));
    this.on("COMMAND_EXECUTED", (data) => this.logEvent("COMMAND_EXECUTED", data));
    this.on("ERROR_OCCURRED", (data) => this.logEvent("ERROR_OCCURRED", data));
  }

  private async logEvent(type: string, data: any) {
    try {
      const event: InsertEvent = {
        leagueId: data.leagueId || null,
        type: type as any,
        payload: data,
        requestId: data.requestId || null,
        latency: data.latency || null,
      };

      await this.storage.createEvent(event);
      
      console.log(`[${new Date().toISOString()}] Event logged: ${type}`, {
        leagueId: data.leagueId,
        requestId: data.requestId,
        latency: data.latency,
      });
    } catch (error) {
      console.error("Failed to log event:", error);
    }
  }

  emitInstallCompleted(leagueId: string, guildId: string, channelId: string) {
    this.emit("INSTALL_COMPLETED", { leagueId, guildId, channelId });
  }

  emitRulesUpdated(leagueId: string, version: string, sections: number) {
    this.emit("RULES_UPDATED", { leagueId, version, sections });
  }

  emitSleeperSynced(leagueId: string, latency: number) {
    this.emit("SLEEPER_SYNCED", { leagueId, latency });
  }

  emitCommandExecuted(
    commandName: string,
    leagueId: string,
    userId: string,
    latency: number,
    tokensUsed?: number,
    requestId?: string
  ) {
    this.emit("COMMAND_EXECUTED", {
      commandName,
      leagueId,
      userId,
      latency,
      tokensUsed,
      requestId,
    });
  }

  emitError(error: string, context: any) {
    this.emit("ERROR_OCCURRED", { error, context });
  }
}
