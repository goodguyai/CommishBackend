import { z } from "zod";

const envSchema = z.object({
  // AI/LLM Configuration
  DEEPSEEK_API_KEY: z.string().min(1, "DEEPSEEK_API_KEY is required"),
  DEEPSEEK_BASE_URL: z.string().url().optional().default("https://api.deepseek.com"),
  LLM_MODEL: z.string().optional().default("deepseek-chat"),
  
  // Embeddings Configuration
  EMBEDDINGS_PROVIDER: z.enum(["openai"]).optional().default("openai"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required when EMBEDDINGS_PROVIDER=openai"),
  EMBED_MODEL: z.string().optional().default("text-embedding-3-small"),
  EMBED_DIM: z.coerce.number().int().positive().refine(
    val => val === 1536,
    { message: "EMBED_DIM must be 1536 to match the vector schema" }
  ).optional().default(1536),
  
  // Database Configuration
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required - PostgreSQL connection string")
    .refine((url) => {
      try {
        const parsed = new URL(url);
        // Validate it's a PostgreSQL connection string
        if (!parsed.protocol.startsWith('postgres')) {
          return false;
        }
        // Validate Supabase hostname format if it's a Supabase URL
        if (parsed.hostname.includes('supabase.co')) {
          const hostPattern = /^(db|aws|gcp)\.[^.]+\.supabase\.co$/;
          return hostPattern.test(parsed.hostname);
        }
        return true;
      } catch {
        return false;
      }
    }, {
      message: "DATABASE_URL must be a valid PostgreSQL connection string. For Supabase, use format: postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres?sslmode=require"
    }),
  
  // Discord Configuration
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET is required"),
  DISCORD_PUBLIC_KEY: z.string().min(1, "DISCORD_PUBLIC_KEY is required for signature verification"),
  DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
  
  // Application Configuration
  APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL (e.g., https://your-replit-domain)"),
  
  // Admin Configuration
  ADMIN_KEY: z.string().min(16, "ADMIN_KEY must be at least 16 characters for security"),
  
  // Node Environment
  NODE_ENV: z.enum(["development", "production"]).optional().default("development"),
  
  // Session Configuration
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let validatedEnv: EnvConfig;

export function validateEnvironment(): EnvConfig {
  try {
    // Use Supabase as primary database URL if available, fallback to DATABASE_URL
    const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    
    const envWithSupabase = {
      ...process.env,
      DATABASE_URL: databaseUrl
    };
    
    validatedEnv = envSchema.parse(envWithSupabase);
    
    // Additional validation for conditional requirements
    if (validatedEnv.EMBEDDINGS_PROVIDER === "openai" && !validatedEnv.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required when EMBEDDINGS_PROVIDER=openai");
    }
    
    console.log("✅ Environment validation passed");
    console.log(`🤖 LLM: ${validatedEnv.LLM_MODEL} via ${validatedEnv.DEEPSEEK_BASE_URL}`);
    console.log(`🔍 Embeddings: ${validatedEnv.EMBED_MODEL} (${validatedEnv.EMBED_DIM}D) via ${validatedEnv.EMBEDDINGS_PROVIDER}`);
    console.log(`💾 Database: ${validatedEnv.DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured'}`);
    console.log(`🎮 Discord: Client ${validatedEnv.DISCORD_CLIENT_ID} ready`);
    console.log(`🌐 App URL: ${validatedEnv.APP_BASE_URL}`);
    
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      error.errors.forEach((err) => {
        console.error(`  • ${err.path.join('.')}: ${err.message}`);
      });
      console.error("\n📋 Required environment variables:");
      console.error("  • DEEPSEEK_API_KEY - Your DeepSeek API key");
      console.error("  • OPENAI_API_KEY - Your OpenAI API key for embeddings");
      console.error("  • DATABASE_URL - PostgreSQL connection string with sslmode=require");
      console.error("  • DISCORD_CLIENT_ID - Discord application client ID");
      console.error("  • DISCORD_CLIENT_SECRET - Discord application secret");
      console.error("  • DISCORD_PUBLIC_KEY - Discord application public key for verification");
      console.error("  • DISCORD_BOT_TOKEN - Discord bot token with permissions");
      console.error("  • APP_BASE_URL - Your application's public URL");
      console.error("  • ADMIN_KEY - Strong random string for admin endpoints");
      console.error("  • SESSION_SECRET - Session encryption secret");
    } else {
      console.error("❌ Environment validation error:", error);
    }
    
    console.error("\n🔧 Set these in your Replit Secrets tab or .env file");
    process.exit(1);
  }
}

export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    throw new Error("Environment not validated. Call validateEnvironment() first.");
  }
  return validatedEnv;
}

// Export individual getters for convenience
export const env = {
  get deepseek() {
    return {
      apiKey: getEnv().DEEPSEEK_API_KEY,
      baseUrl: getEnv().DEEPSEEK_BASE_URL,
      model: getEnv().LLM_MODEL,
    };
  },
  get openai() {
    return {
      apiKey: getEnv().OPENAI_API_KEY,
      embedModel: getEnv().EMBED_MODEL,
      embedDim: getEnv().EMBED_DIM,
    };
  },
  get database() {
    return {
      url: getEnv().DATABASE_URL,
    };
  },
  get discord() {
    return {
      clientId: getEnv().DISCORD_CLIENT_ID,
      clientSecret: getEnv().DISCORD_CLIENT_SECRET,
      publicKey: getEnv().DISCORD_PUBLIC_KEY,
      botToken: getEnv().DISCORD_BOT_TOKEN,
    };
  },
  get app() {
    return {
      baseUrl: getEnv().APP_BASE_URL,
      adminKey: getEnv().ADMIN_KEY,
      nodeEnv: getEnv().NODE_ENV,
      sessionSecret: getEnv().SESSION_SECRET,
    };
  },
};