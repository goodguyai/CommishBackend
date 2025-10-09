import { db } from "../db";
import { eq, and, desc, gte } from "drizzle-orm";
import { diffSleeperToConstitution, applyChanges } from "./sleeperMapping";
import { withRetry } from "../lib/retry";
import { constitutionDrafts, leagues } from "@shared/schema";
import { createHash } from "crypto";

export async function buildDraftFromSleeper(leagueId: string, sleeperSettings: any) {
  // Compute hash of Sleeper settings for idempotency
  const settingsJson = JSON.stringify(sleeperSettings, Object.keys(sleeperSettings).sort());
  const settingsHash = createHash('sha256').update(settingsJson).digest('hex');
  
  // Check if this exact settings hash was already processed in last 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingDrafts = await db.select()
    .from(constitutionDrafts)
    .where(
      and(
        eq(constitutionDrafts.leagueId, leagueId),
        gte(constitutionDrafts.createdAt, twentyFourHoursAgo)
      )
    )
    .limit(1);
  
  const leagueRecords = await db.select({ 
    constitution: leagues.constitution,
    settingsHash: leagues.settingsHash 
  })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  
  // Skip if settings hash matches current stored hash
  if (leagueRecords[0]?.settingsHash === settingsHash) {
    console.log(`[Draft] Skipped duplicate due to idempotency - settings unchanged`);
    return { 
      skipped: true, 
      reason: "DRAFT_DUPLICATE", 
      message: "Settings unchanged from last sync" 
    };
  }
  
  const constitution = leagueRecords[0]?.constitution ?? {};
  const proposed = diffSleeperToConstitution(sleeperSettings, constitution);
  
  const inserted = await db.insert(constitutionDrafts)
    .values({
      leagueId,
      source: 'sleeper-sync',
      proposed,
      status: 'PENDING',
    })
    .returning({
      id: constitutionDrafts.id,
      proposed: constitutionDrafts.proposed,
      status: constitutionDrafts.status,
      createdAt: constitutionDrafts.createdAt,
    });
  
  // Store the settings hash for future deduplication
  await db.update(leagues)
    .set({ settingsHash })
    .where(eq(leagues.id, leagueId));
  
  return {
    ...inserted[0],
    changes: inserted[0].proposed,
  };
}

export async function listDrafts(leagueId: string) {
  const drafts = await db.select({
      id: constitutionDrafts.id,
      source: constitutionDrafts.source,
      proposed: constitutionDrafts.proposed,
      status: constitutionDrafts.status,
      createdAt: constitutionDrafts.createdAt,
      decidedAt: constitutionDrafts.decidedAt,
    })
    .from(constitutionDrafts)
    .where(eq(constitutionDrafts.leagueId, leagueId))
    .orderBy(desc(constitutionDrafts.createdAt));
  
  return drafts.map(draft => ({
    ...draft,
    changes: draft.proposed,
  }));
}

export async function applyDraft(draftId: string) {
  const draftRecords = await db.select({
      id: constitutionDrafts.id,
      leagueId: constitutionDrafts.leagueId,
      source: constitutionDrafts.source,
      proposed: constitutionDrafts.proposed,
      status: constitutionDrafts.status,
      createdAt: constitutionDrafts.createdAt,
    })
    .from(constitutionDrafts)
    .where(
      and(
        eq(constitutionDrafts.id, draftId),
        eq(constitutionDrafts.status, 'PENDING')
      )
    );
  
  if (!draftRecords || draftRecords.length === 0) {
    throw new Error("DRAFT_NOT_FOUND");
  }
  
  const draft = draftRecords[0];
  const leagueId = draft.leagueId;
  const proposed = draft.proposed;

  const leagueRecords = await db.select({ constitution: leagues.constitution })
    .from(leagues)
    .where(eq(leagues.id, leagueId));
  
  const constitution = leagueRecords[0]?.constitution ?? {};
  const updated = applyChanges(constitution, proposed);
  
  await withRetry(() => 
    db.update(leagues)
      .set({ constitution: updated })
      .where(eq(leagues.id, leagueId))
  );

  const updatedDrafts = await db.update(constitutionDrafts)
    .set({ 
      status: 'APPLIED', 
      decidedAt: new Date() 
    })
    .where(eq(constitutionDrafts.id, draftId))
    .returning({
      id: constitutionDrafts.id,
      source: constitutionDrafts.source,
      proposed: constitutionDrafts.proposed,
      status: constitutionDrafts.status,
      createdAt: constitutionDrafts.createdAt,
      decidedAt: constitutionDrafts.decidedAt,
    });
  
  return {
    ...updatedDrafts[0],
    changes: updatedDrafts[0].proposed,
  };
}

export async function rejectDraft(draftId: string) {
  const draftRecords = await db.select()
    .from(constitutionDrafts)
    .where(
      and(
        eq(constitutionDrafts.id, draftId),
        eq(constitutionDrafts.status, 'PENDING')
      )
    );
  
  if (!draftRecords || draftRecords.length === 0) {
    throw new Error("DRAFT_NOT_FOUND");
  }

  const updatedDrafts = await db.update(constitutionDrafts)
    .set({ 
      status: 'REJECTED', 
      decidedAt: new Date() 
    })
    .where(eq(constitutionDrafts.id, draftId))
    .returning({
      id: constitutionDrafts.id,
      source: constitutionDrafts.source,
      proposed: constitutionDrafts.proposed,
      status: constitutionDrafts.status,
      createdAt: constitutionDrafts.createdAt,
      decidedAt: constitutionDrafts.decidedAt,
    });
  
  return {
    ...updatedDrafts[0],
    changes: updatedDrafts[0].proposed,
  };
}
