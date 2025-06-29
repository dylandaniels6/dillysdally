import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cache authenticated clients to avoid multiple instances
const clientCache = new Map<string, ReturnType<typeof createClient>>();

// Base client for public usage (no auth) - NEVER use this for user data!
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// When using Clerk integration, we need the Supabase access token, not a JWT
export const createAuthenticatedSupabaseClient = (token: string) => {
  if (!token) {
    throw new Error('No authentication token provided');
  }

  // Return cached client if it exists
  if (clientCache.has(token)) {
    return clientCache.get(token)!;
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  // Cache the client
  clientCache.set(token, client);

  // Clean up old cached clients if too many
  if (clientCache.size > 5) {
    const firstKey = clientCache.keys().next().value;
    clientCache.delete(firstKey);
  }

  return client;
};

// Helper function for Clerk integration - this is what you should use!
export const createClerkSupabaseClient = async (session: any) => {
  if (!session) {
    throw new Error('No session provided');
  }

  // With Clerk integration, just use the standard session token
  const supabaseToken = await session.getToken();
  
  if (!supabaseToken) {
    throw new Error('Failed to get Supabase token from session');
  }

  return createAuthenticatedSupabaseClient(supabaseToken);
};