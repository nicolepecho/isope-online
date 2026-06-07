// src/app/lib/database.ts
import { createClient } from "@supabase/supabase-js";
import { Orgs } from "./definitions";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// supabaseAdmin uses the service role key which is only available server-side.
// The typeof window check prevents this from throwing when client components
// import database.ts — the browser receives null and API routes get the real client.
export const supabaseAdmin = typeof window === 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  : (null as any);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export async function getAllUsernames(): Promise<string[]> {
  const { data, error } = await supabase
    .from("orgs")
    .select("username");

  if (error || !data) return [];
  return data.map((o) => o.username);
}

export async function getUserByUsername(username: string): Promise<Orgs | null> {
  const { data, error } = await supabase
    .from("orgs")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}