import { storage } from "../storage";
import { DiscordService } from "./discord";
import type { ContentQueue, InsertContentQueue } from "@shared/schema";

interface EnqueueParams {
  leagueId: string;
  channelId: string;
  scheduledAt: Date;
  template: string;
  payload: Record<string, any>;
}

export class ContentService {
  private discord: DiscordService;
  private rateLimitQueue: number[] = [];
  private readonly MAX_POSTS_PER_MINUTE = 5;

  constructor() {
    this.discord = new DiscordService();
  }

  async enqueue({ leagueId, channelId, scheduledAt, template, payload }: EnqueueParams): Promise<ContentQueue> {
    try {
      const itemData: InsertContentQueue = {
        leagueId,
        channelId,
        scheduledAt,
        template,
        payload: payload as any,
        status: "queued",
        postedMessageId: null,
      };

      const id = await storage.createContentQueueItem(itemData);

      const result: ContentQueue = {
        id,
        leagueId,
        channelId,
        scheduledAt,
        template,
        payload: payload as any,
        status: "queued",
        postedMessageId: null,
        createdAt: new Date(),
      };

      return result;
    } catch (error) {
      console.error("Error enqueuing content:", error);
      throw error;
    }
  }

  async postQueued(now: Date = new Date()): Promise<number> {
    try {
      const queuedItems = await storage.getQueuedContent(now);
      let posted = 0;

      for (const item of queuedItems) {
        if (!this.canPost()) {
          console.log("Rate limit reached, waiting before posting more content");
          await this.waitForRateLimit();
        }

        try {
          const message = this.formatMessage(item.template, item.payload as Record<string, any>);
          const messageId = await this.discord.postMessage(item.channelId, {
            content: message,
          });

          await storage.updateContentQueueStatus(item.id, "posted", messageId);
          this.recordPost();
          posted++;
        } catch (error) {
          console.error(`Failed to post content item ${item.id}:`, error);
          await storage.updateContentQueueStatus(item.id, "skipped");
        }
      }

      return posted;
    } catch (error) {
      console.error("Error posting queued content:", error);
      throw error;
    }
  }

  private canPost(): boolean {
    const oneMinuteAgo = Date.now() - 60000;
    this.rateLimitQueue = this.rateLimitQueue.filter((time) => time > oneMinuteAgo);
    return this.rateLimitQueue.length < this.MAX_POSTS_PER_MINUTE;
  }

  private recordPost(): void {
    this.rateLimitQueue.push(Date.now());
  }

  private async waitForRateLimit(): Promise<void> {
    if (this.rateLimitQueue.length === 0) return;

    const oldestPost = Math.min(...this.rateLimitQueue);
    const waitTime = 60000 - (Date.now() - oldestPost);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  private formatMessage(template: string, payload: Record<string, any>): string {
    let message = template;

    for (const [key, value] of Object.entries(payload)) {
      message = message.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }

    return message;
  }
}
