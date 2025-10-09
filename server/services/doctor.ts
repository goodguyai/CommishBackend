import { discordService } from "./discord.js";
import { sleeperService } from "./sleeper.js";
import { scheduler } from "../lib/scheduler.js";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { getEnv } from "./env.js";

export interface HealthCheckResult {
  ok: boolean;
  status: "healthy" | "degraded" | "down";
  details: Record<string, any>;
  warnings: string[];
  errors: string[];
  elapsed_ms: number;
}

interface CheckDiscordOpts {
  guildId?: string;
  channelId?: string;
  probe?: string;
}

interface CheckSleeperOpts {
  leagueId?: string;
}

function maskSecret(value: string): string {
  if (!value || value.length <= 4) {
    return "***";
  }
  return "***" + value.slice(-4);
}

export async function checkDiscord(opts: CheckDiscordOpts = {}): Promise<HealthCheckResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const details: Record<string, any> = {
    bot_configured: false,
    guild_accessible: false,
    channel_accessible: false,
  };

  try {
    const env = getEnv();
    
    if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CLIENT_ID) {
      errors.push("Discord bot credentials missing");
      return {
        ok: false,
        status: "down",
        details,
        warnings,
        errors,
        elapsed_ms: Date.now() - start,
      };
    }

    details.bot_configured = true;
    details.client_id = env.DISCORD_CLIENT_ID;

    if (opts.guildId) {
      try {
        const channels = await discordService.getGuildChannels(opts.guildId);
        details.guild_accessible = true;
        details.guild_id = opts.guildId;
        details.channels_found = channels.length;

        if (opts.channelId) {
          const channel = channels.find(ch => ch.id === opts.channelId);
          if (channel) {
            details.channel_accessible = true;
            details.channel_name = channel.name;
          } else {
            warnings.push(`Channel ${opts.channelId} not found in guild`);
          }
        }
      } catch (err) {
        errors.push(`Failed to access guild ${opts.guildId}: ${err instanceof Error ? err.message : String(err)}`);
        details.guild_accessible = false;
      }
    }


    const ok = errors.length === 0;
    const status = ok ? (warnings.length > 0 ? "degraded" : "healthy") : "down";

    return {
      ok,
      status,
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  } catch (err) {
    errors.push(`Discord check failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ok: false,
      status: "down",
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  }
}

export async function checkSleeper(opts: CheckSleeperOpts = {}): Promise<HealthCheckResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const details: Record<string, any> = {
    api_reachable: false,
    league_accessible: false,
  };

  try {
    const currentWeek = await sleeperService.getCurrentWeek();
    details.api_reachable = true;
    details.current_week = currentWeek;

    if (opts.leagueId) {
      try {
        const league = await sleeperService.getLeague(opts.leagueId);
        details.league_accessible = true;
        details.league_name = league.name;
        details.league_status = league.status;
        details.season = league.season;
      } catch (err) {
        errors.push(`Failed to access league ${opts.leagueId}: ${err instanceof Error ? err.message : String(err)}`);
        details.league_accessible = false;
      }
    }

    const ok = errors.length === 0;
    const status = ok ? (warnings.length > 0 ? "degraded" : "healthy") : "down";

    return {
      ok,
      status,
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  } catch (err) {
    errors.push(`Sleeper check failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ok: false,
      status: "down",
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  }
}

export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const details: Record<string, any> = {
    connection_ok: false,
    tables_verified: [],
    tables_missing: [],
  };

  const requiredTables = [
    "accounts",
    "leagues", 
    "members",
    "constitution_drafts",
    "bot_activity",
    "documents",
    "embeddings"
  ];

  try {
    const result = await db.execute(sql`SELECT 1 as health`);
    details.connection_ok = true;

    for (const table of requiredTables) {
      try {
        const tableCheck = await db.execute<{ exists: boolean }>(
          sql`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists`
        );
        
        const exists = tableCheck[0]?.exists;
        if (exists) {
          details.tables_verified.push(table);
        } else {
          details.tables_missing.push(table);
          errors.push(`Table '${table}' not found`);
        }
      } catch (err) {
        details.tables_missing.push(table);
        errors.push(`Failed to verify table '${table}': ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const ok = errors.length === 0 && details.connection_ok;
    const status = ok ? (warnings.length > 0 ? "degraded" : "healthy") : "down";

    return {
      ok,
      status,
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  } catch (err) {
    errors.push(`Database check failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ok: false,
      status: "down",
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  }
}

export async function checkCron(): Promise<HealthCheckResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const details: Record<string, any> = {
    total_jobs: 0,
    jobs: [],
  };

  try {
    const tasksWithMetadata = scheduler.getTasksWithMetadata();
    details.total_jobs = tasksWithMetadata.size;

    const jobsList: Array<{ key: string; status: string; cronExpression?: string; timezone?: string; description?: string }> = [];
    
    tasksWithMetadata.forEach((data, key) => {
      jobsList.push({
        key,
        status: "scheduled",
        cronExpression: data.meta.cronExpression,
        timezone: data.meta.timezone,
        description: data.meta.description
      });
    });

    details.jobs = jobsList;

    const ok = true;
    const status = "healthy";

    return {
      ok,
      status,
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  } catch (err) {
    errors.push(`Cron check failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ok: false,
      status: "down",
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  }
}

export async function checkSecrets(env: ReturnType<typeof getEnv>): Promise<HealthCheckResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const details: Record<string, any> = {
    secrets_verified: [],
    secrets_missing: [],
    secrets_invalid: [],
  };

  const requiredSecrets = [
    { key: "DEEPSEEK_API_KEY", value: env.DEEPSEEK_API_KEY, minLength: 16 },
    { key: "OPENAI_API_KEY", value: env.OPENAI_API_KEY, minLength: 16 },
    { key: "DATABASE_URL", value: env.DATABASE_URL, minLength: 20 },
    { key: "DISCORD_CLIENT_ID", value: env.DISCORD_CLIENT_ID, minLength: 10 },
    { key: "DISCORD_CLIENT_SECRET", value: env.DISCORD_CLIENT_SECRET, minLength: 16 },
    { key: "DISCORD_PUBLIC_KEY", value: env.DISCORD_PUBLIC_KEY, minLength: 16 },
    { key: "DISCORD_BOT_TOKEN", value: env.DISCORD_BOT_TOKEN, minLength: 16 },
    { key: "ADMIN_API_KEY", value: env.ADMIN_API_KEY || env.ADMIN_KEY, minLength: 16 },
    { key: "SESSION_SECRET", value: env.SESSION_SECRET, minLength: 16 },
  ];

  for (const secret of requiredSecrets) {
    if (!secret.value) {
      details.secrets_missing.push(secret.key);
      errors.push(`Secret '${secret.key}' is missing`);
    } else if (secret.value.length < secret.minLength) {
      details.secrets_invalid.push(secret.key);
      errors.push(`Secret '${secret.key}' is too short (min ${secret.minLength} chars)`);
    } else {
      details.secrets_verified.push({
        key: secret.key,
        masked_value: maskSecret(secret.value),
        length: secret.value.length,
      });
    }
  }

  const ok = errors.length === 0;
  const status = ok ? (warnings.length > 0 ? "degraded" : "healthy") : "down";

  return {
    ok,
    status,
    details,
    warnings,
    errors,
    elapsed_ms: Date.now() - start,
  };
}

export async function checkStatus(): Promise<HealthCheckResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const details: Record<string, any> = {
    checks: {},
  };

  try {
    const env = getEnv();

    const [discordCheck, sleeperCheck, dbCheck, cronCheck, secretsCheck] = await Promise.all([
      checkDiscord(),
      checkSleeper(),
      checkDatabase(),
      checkCron(),
      checkSecrets(env),
    ]);

    details.checks = {
      discord: {
        status: discordCheck.status,
        ok: discordCheck.ok,
        errors: discordCheck.errors,
      },
      sleeper: {
        status: sleeperCheck.status,
        ok: sleeperCheck.ok,
        errors: sleeperCheck.errors,
      },
      database: {
        status: dbCheck.status,
        ok: dbCheck.ok,
        errors: dbCheck.errors,
      },
      cron: {
        status: cronCheck.status,
        ok: cronCheck.ok,
        errors: cronCheck.errors,
      },
      secrets: {
        status: secretsCheck.status,
        ok: secretsCheck.ok,
        errors: secretsCheck.errors,
      },
    };

    if (!discordCheck.ok) errors.push(...discordCheck.errors.map(e => `Discord: ${e}`));
    if (!sleeperCheck.ok) errors.push(...sleeperCheck.errors.map(e => `Sleeper: ${e}`));
    if (!dbCheck.ok) errors.push(...dbCheck.errors.map(e => `Database: ${e}`));
    if (!cronCheck.ok) errors.push(...cronCheck.errors.map(e => `Cron: ${e}`));
    if (!secretsCheck.ok) errors.push(...secretsCheck.errors.map(e => `Secrets: ${e}`));

    if (discordCheck.warnings.length > 0) warnings.push(...discordCheck.warnings.map(w => `Discord: ${w}`));
    if (sleeperCheck.warnings.length > 0) warnings.push(...sleeperCheck.warnings.map(w => `Sleeper: ${w}`));
    if (dbCheck.warnings.length > 0) warnings.push(...dbCheck.warnings.map(w => `Database: ${w}`));
    if (cronCheck.warnings.length > 0) warnings.push(...cronCheck.warnings.map(w => `Cron: ${w}`));
    if (secretsCheck.warnings.length > 0) warnings.push(...secretsCheck.warnings.map(w => `Secrets: ${w}`));

    const allOk = discordCheck.ok && sleeperCheck.ok && dbCheck.ok && cronCheck.ok && secretsCheck.ok;
    const anyDegraded = [discordCheck, sleeperCheck, dbCheck, cronCheck, secretsCheck].some(c => c.status === "degraded");
    
    const ok = allOk;
    const status = ok ? (anyDegraded || warnings.length > 0 ? "degraded" : "healthy") : "down";

    return {
      ok,
      status,
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  } catch (err) {
    errors.push(`Status check failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ok: false,
      status: "down",
      details,
      warnings,
      errors,
      elapsed_ms: Date.now() - start,
    };
  }
}
