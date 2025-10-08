const asrt = (cond: any, msg: string) => { 
  if (!cond) { 
    console.error(`❌ ${msg}`); 
    process.exit(1); 
  } 
};

const must = (k: string, v?: string) => {
  asrt(v && v.trim().length > 0, `Missing env var: ${k}`);
  // Only validate HTTP URLs for Supabase and app URLs, not DATABASE_URL (which uses postgresql://)
  if (k.includes("URL") && k !== "DATABASE_URL") {
    asrt(v!.startsWith("http"), `Invalid ${k}: expected HTTP(S) URL, got "${v!.slice(0,20)}..."`);
  }
};

[
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_PUBLIC_KEY",
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "APP_BASE_URL",
  "SESSION_SECRET",
  "DATABASE_URL"
].forEach(k => must(k, process.env[k]));

// Check for at least one admin key (ADMIN_API_KEY or ADMIN_KEY for backwards compatibility)
const adminKey = process.env.ADMIN_API_KEY || process.env.ADMIN_KEY;
asrt(adminKey && adminKey.trim().length > 0, "Missing env var: ADMIN_API_KEY or ADMIN_KEY (at least one required)");

console.log("✅ Environment validation passed");
