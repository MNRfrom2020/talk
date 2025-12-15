import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // During build time (server-side), these might be undefined.
  // We handle this gracefully to allow the build to succeed.
  // A warning will be shown on the client-side if they are still missing.
  if (typeof window !== "undefined") {
    console.warn(
      "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. This may cause issues with Supabase functionality.",
    );
  }
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
