import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create base client (for unauthenticated requests)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// UPDATED: New Clerk-native Supabase client helper
export const createClerkSupabaseClient = (session: any) => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      accessToken: async () => {
        return session?.getToken() ?? null;
      }
    }
  });
};

// Alias for backward compatibility
export const createAuthenticatedSupabaseClient = createClerkSupabaseClient;