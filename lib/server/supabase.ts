import "server-only";

import { createClient } from "@supabase/supabase-js";

function configured(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value || value.includes("xxxx") || value.length < 20) {
    throw new Error(`${name} is not configured with a real value`);
  }
  return value;
}

export function getSupabaseAdmin() {
  return createClient(
    configured("SUPABASE_URL"),
    configured("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
