import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Base client for public usage (no auth) - NEVER use this for user data!
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Create an authenticated Supabase client with proper Clerk token
export const createAuthenticatedSupabaseClient = (token: string, userId: string) => {
  if (!token) {
    throw new Error('No authentication token provided');
  }
  
  if (!userId) {
    throw new Error('No user ID provided');
  }

  // 🔧 FIXED: Removed the X-User-Id header that was causing CORS issues
  // The user ID is already embedded in the JWT token from Clerk
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
        // 🔧 REMOVED: 'X-User-Id': userId - this caused CORS errors
      }
    },
    auth: {
      persistSession: false, // Don't persist auth session since we're using Clerk
      autoRefreshToken: false, // Clerk handles token refresh
    }
  });
};

// Helper function for Clerk integration - this is what you should use!
export const createClerkSupabaseClient = async (getToken: any, userId: string) => {
  if (!getToken) {
    throw new Error('No getToken function provided');
  }
  
  if (!userId) {
    throw new Error('No user ID provided');
  }

  try {
    // Always get fresh token to avoid expiry issues
    const supabaseToken = await getToken({ 
      template: 'supabase',
      skipCache: true  // Force fresh token
    });
    
    if (!supabaseToken) {
      throw new Error('Failed to get Supabase token from Clerk');
    }

    return createAuthenticatedSupabaseClient(supabaseToken, userId);
  } catch (error) {
    console.error('Error creating Clerk Supabase client:', error);
    throw error;
  }
};

// Utility function to ensure user_id is included in all queries
export const ensureUserId = (data: any, userId: string) => {
  if (Array.isArray(data)) {
    return data.map(item => ({ ...item, user_id: userId }));
  }
  return { ...data, user_id: userId };
};