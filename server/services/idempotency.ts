import crypto from 'crypto';
import { db } from '../db';
import { botActivity } from '@shared/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

interface IdempotencyKey {
  guildId: string;
  channelId: string;
  operation: string;
  payload: any;
}

export class IdempotencyService {
  /**
   * Compute idempotency key as SHA-256 hash of normalized tuple
   */
  static computeKey(params: IdempotencyKey): string {
    const normalized = `${params.guildId}:${params.channelId}:${params.operation}:${JSON.stringify(params.payload)}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Check if this operation has been performed recently (within 24h)
   * Returns cached response if found, null if new operation
   */
  static async checkDuplicate(
    key: string,
    requestId: string
  ): Promise<{ isDuplicate: boolean; cachedResponse?: any }> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Look for recent successful operation with same key
      const existing = await db
        .select()
        .from(botActivity)
        .where(
          and(
            eq(botActivity.key, key),
            eq(botActivity.status, 'ok'),
            gte(botActivity.createdAt, twentyFourHoursAgo)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`[${requestId}] Idempotency: Duplicate detected for key ${key.substring(0, 12)}...`);
        return {
          isDuplicate: true,
          cachedResponse: existing[0].detail,
        };
      }

      return { isDuplicate: false };
    } catch (e) {
      console.error(`[${requestId}] Idempotency check failed:`, e);
      // On error, allow the operation to proceed
      return { isDuplicate: false };
    }
  }

  /**
   * Record successful operation with idempotency key
   */
  static async recordSuccess(
    key: string,
    params: {
      requestId: string;
      leagueId?: string;
      guildId?: string;
      channelId?: string;
      kind: string;
      response: any;
    }
  ): Promise<void> {
    try {
      await db.insert(botActivity).values({
        requestId: params.requestId,
        leagueId: params.leagueId,
        guildId: params.guildId,
        channelId: params.channelId,
        kind: params.kind,
        key,
        status: 'ok',
        detail: params.response,
      });
      
      console.log(`[${params.requestId}] Idempotency: Recorded success for key ${key.substring(0, 12)}...`);
    } catch (e) {
      console.error(`[${params.requestId}] Failed to record idempotency:`, e);
      // Don't throw - this is non-critical logging
    }
  }

  /**
   * Record failed operation
   */
  static async recordFailure(
    key: string,
    params: {
      requestId: string;
      leagueId?: string;
      guildId?: string;
      channelId?: string;
      kind: string;
      error: any;
    }
  ): Promise<void> {
    try {
      await db.insert(botActivity).values({
        requestId: params.requestId,
        leagueId: params.leagueId,
        guildId: params.guildId,
        channelId: params.channelId,
        kind: params.kind,
        key,
        status: 'fail',
        detail: { error: String(params.error) },
      });
    } catch (e) {
      console.error(`[${params.requestId}] Failed to record failure:`, e);
    }
  }

  /**
   * Clean up old idempotency records (> 48h)
   * This should be called periodically via cron
   */
  static async cleanup(): Promise<number> {
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      // Delete records OLDER than 48h (use lt, not gte)
      await db
        .delete(botActivity)
        .where(sql`${botActivity.createdAt} < ${fortyEightHoursAgo}`);
      
      console.log(`[Idempotency] Cleaned up old records`);
      return 0;
    } catch (e) {
      console.error('[Idempotency] Cleanup failed:', e);
      return 0;
    }
  }
}

// Simplified helpers for Phase 13
type MarkStatus = "PENDING" | "SUCCESS" | "FAILED";

export async function hasSucceeded(key: string): Promise<boolean> {
  try {
    const existing = await db
      .select()
      .from(botActivity)
      .where(
        and(
          eq(botActivity.key, key),
          eq(botActivity.status, 'SUCCESS')
        )
      )
      .limit(1);
    return existing.length > 0;
  } catch (e) {
    console.error('hasSucceeded check failed:', e);
    return false;
  }
}

export async function mark(params: {
  leagueId?: string;
  guildId?: string;
  channelId?: string;
  kind: string;
  key: string;
  status: MarkStatus;
  detail?: any;
  requestId?: string;
}): Promise<void> {
  try {
    await db.insert(botActivity).values({
      leagueId: params.leagueId,
      guildId: params.guildId,
      channelId: params.channelId,
      kind: params.kind,
      key: params.key,
      status: params.status,
      detail: params.detail ?? {},
      requestId: params.requestId,
    });
  } catch (e) {
    console.error('Failed to mark activity:', e);
  }
}
