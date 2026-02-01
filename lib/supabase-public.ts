import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Client-side client with anon key for reads only
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase public credentials');
  }

  return createClient(url, key);
}

// Server-side read client (lazy initialization)
let _supabasePublic: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient {
  if (!_supabasePublic) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    
    _supabasePublic = createClient(url, key);
  }
  return _supabasePublic;
}

// Legacy export for backward compatibility
export const supabasePublic = {
  from: (table: string) => getSupabasePublic().from(table),
};
