import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase environment variables are missing. Check server/.env"
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export function createUserSupabaseClient(accessToken: string) {
  return createClient(
    supabaseUrl!,
    supabaseKey!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}