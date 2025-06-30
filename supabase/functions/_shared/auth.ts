import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from './cors.ts';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export const getSupabaseClient = (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const authHeader = req.headers.get('Authorization') ?? '';
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
};

export const getAuthUser = async (req: Request): Promise<AuthUser> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Decode the Clerk JWT to get user info
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(atob(base64Payload));
    
    // Validate that this looks like a Clerk JWT
    if (!payload.sub && !payload.user_id) {
      throw new Error('Invalid JWT claims - missing user identifier');
    }
    
    // Check token expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('JWT token has expired');
    }
    
    return {
      id: payload.sub || payload.user_id,
      email: payload.email || payload.user_metadata?.email,
      user_metadata: payload.user_metadata || {}
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT validation failed: ${error.message}`);
    }
    throw new Error('Invalid JWT token format');
  }
};

export const requireAuth = async (req: Request): Promise<AuthUser> => {
  try {
    return await getAuthUser(req);
  } catch (error) {
    throw new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};