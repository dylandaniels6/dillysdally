import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Base client for public usage (no auth) - NEVER use this for user data!
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// SIMPLIFIED: No caching - always create fresh client with current token
// This eliminates all token expiry issues
export const createAuthenticatedSupabaseClient = (token: string, userId?: string) => {
  if (!token) {
    throw new Error('No authentication token provided');
  }

  // Always create a fresh client with the current token
  // This ensures we never have stale/expired tokens
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

// Helper function for Clerk integration - this is what you should use!
export const createClerkSupabaseClient = async (session: any, userId?: string) => {
  if (!session) {
    throw new Error('No session provided');
  }

  // Always get fresh token to avoid expiry issues
  const supabaseToken = await session.getToken({ 
    template: 'supabase',
    skipCache: true  // Force fresh token
  });
  
  if (!supabaseToken) {
    throw new Error('Failed to get Supabase token from session');
  }

  return createAuthenticatedSupabaseClient(supabaseToken, userId);
};