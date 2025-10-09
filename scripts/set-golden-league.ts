#!/usr/bin/env tsx
/**
 * Golden League Setup Script
 * 
 * This script helps set up and verify a "golden league" for testing
 * content poster jobs and observability features.
 * 
 * Usage:
 *   tsx scripts/set-golden-league.ts [league_uuid]
 * 
 * If no league_uuid is provided, lists all leagues with enabled jobs.
 */

import { db } from "../server/db";
import { leagues, jobs } from "../shared/schema";
import { eq } from "drizzle-orm";

interface ContentPosterConfig {
  enabled: boolean;
  channelId: string | null;
  cron: string;
}

async function main() {
  const leagueUuid = process.argv[2];

  if (!leagueUuid) {
    console.log("🔍 Listing all leagues with enabled content poster jobs...\n");
    await listEnabledLeagues();
    return;
  }

  console.log(`🎯 Checking golden league: ${leagueUuid}\n`);
  await checkGoldenLeague(leagueUuid);
}

async function listEnabledLeagues() {
  try {
    // Get all jobs with enabled content poster
    const allJobs = await db.select().from(jobs);
    
    const enabledJobs = allJobs.filter(job => {
      const config = job.config as any;
      return config?.contentPoster?.enabled === true;
    });

    if (enabledJobs.length === 0) {
      console.log("❌ No leagues have content poster enabled");
      console.log("\nTo enable a league, use:");
      console.log("curl -X POST -H 'Authorization: Bearer $ADMIN_API_KEY' \\");
      console.log("  -H 'Content-Type: application/json' \\");
      console.log("  -d '{\"league_id\":\"<uuid>\",\"contentPoster\":{\"enabled\":true,\"channelId\":\"<channel_id>\",\"cron\":\"*/5 * * * *\"}}' \\");
      console.log("  https://thecommish.replit.app/api/v3/jobs/upsert");
      return;
    }

    console.log(`✅ Found ${enabledJobs.length} league(s) with enabled content poster:\n`);

    for (const job of enabledJobs) {
      const league = await db.select().from(leagues).where(eq(leagues.id, job.leagueId)).limit(1);
      const leagueName = league[0]?.name || "Unknown";
      const config = job.config as any;
      const contentPoster = config?.contentPoster as ContentPosterConfig;

      console.log(`📌 League: ${leagueName}`);
      console.log(`   UUID: ${job.leagueId}`);
      console.log(`   Channel ID: ${contentPoster.channelId || "❌ MISSING"}`);
      console.log(`   Cron: ${contentPoster.cron}`);
      console.log(`   Kind: ${job.kind}`);
      console.log(`   Enabled: ${job.enabled ? "✅" : "❌"}`);
      console.log();
    }
  } catch (error) {
    console.error("❌ Error listing enabled leagues:", error);
    process.exit(1);
  }
}

async function checkGoldenLeague(leagueUuid: string) {
  try {
    // Get the league
    const leagueResult = await db.select().from(leagues).where(eq(leagues.id, leagueUuid)).limit(1);

    if (leagueResult.length === 0) {
      console.log("❌ League not found");
      process.exit(1);
    }

    const league = leagueResult[0];
    console.log(`✅ League found: ${league.name}`);
    console.log(`   Guild ID: ${league.guildId || "❌ Not set"}`);
    console.log(`   Channel ID: ${league.channelId || "❌ Not set"}`);
    console.log();

    // Get jobs for this league
    const leagueJobs = await db.select().from(jobs).where(eq(jobs.leagueId, leagueUuid));

    if (leagueJobs.length === 0) {
      console.log("⚠️  No jobs configured for this league");
      console.log("\nTo enable content poster:");
      console.log("curl -X POST -H 'Authorization: Bearer $ADMIN_API_KEY' \\");
      console.log("  -H 'Content-Type: application/json' \\");
      console.log(`  -d '{"league_id":"${leagueUuid}","contentPoster":{"enabled":true,"channelId":"<channel_id>","cron":"*/5 * * * *"}}' \\`);
      console.log("  https://thecommish.replit.app/api/v3/jobs/upsert");
      return;
    }

    console.log(`📋 Jobs configured: ${leagueJobs.length}\n`);

    let hasEnabledContentPoster = false;
    let hasValidChannel = false;

    for (const job of leagueJobs) {
      const config = job.config as any;
      
      if (job.kind === 'content_post') {
        const contentPoster = config?.contentPoster as ContentPosterConfig;
        
        console.log("📬 Content Poster Job:");
        console.log(`   Enabled: ${job.enabled ? "✅ Yes" : "❌ No"}`);
        console.log(`   Channel ID: ${contentPoster?.channelId || "❌ MISSING"}`);
        console.log(`   Cron: ${contentPoster?.cron || "Not set"}`);
        console.log(`   Next Run: ${job.nextRun?.toISOString() || "Not scheduled"}`);
        console.log();

        if (job.enabled && contentPoster?.enabled) {
          hasEnabledContentPoster = true;
          if (contentPoster.channelId) {
            hasValidChannel = true;
          }
        }
      }
    }

    // Final status
    console.log("🎯 Golden League Status:");
    if (hasEnabledContentPoster && hasValidChannel) {
      console.log("   ✅ Ready for testing!");
      console.log("   ✅ Content poster enabled with valid channel");
    } else if (hasEnabledContentPoster && !hasValidChannel) {
      console.log("   ⚠️  Content poster enabled but missing channel ID");
      console.log("   ❌ Will fail guardrail validation");
    } else {
      console.log("   ❌ Content poster not enabled");
      console.log("   ℹ️  Enable it via /api/v3/jobs/upsert");
    }

  } catch (error) {
    console.error("❌ Error checking golden league:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
