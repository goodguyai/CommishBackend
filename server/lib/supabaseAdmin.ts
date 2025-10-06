import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables are provided via Replit Secrets
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type { SupabaseClient, User, Session } from '@supabase/supabase-js';
