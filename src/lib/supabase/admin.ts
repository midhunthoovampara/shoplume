import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseAdminConfigured = Boolean(
  supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl !== "https://your-project-id.supabase.co" &&
    supabaseServiceKey !== "your-supabase-service-role-key-here"
);

// Service role client bypasses RLS for authoritative server-side operations
export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
