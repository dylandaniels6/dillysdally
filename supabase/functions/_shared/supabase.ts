import { corsHeaders } from './cors.ts';
import { getSupabaseClient } from './supabase.ts';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export const getAuthUser = async (req: Request): Promise<AuthUser> => {
  const supabase = getSupabaseClient(req.headers.get('Authorization'));
  
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new Error('No authorization token provided');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid authentication token');
  }

  return user;
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