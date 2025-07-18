import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';

export const useAdminStatus = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Get fresh token
        const token = await (window as any).Clerk?.session?.getToken({ 
          template: 'supabase',
          skipCache: true
        });

        if (!token) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Check admin status from database
        const supabase = createAuthenticatedSupabaseClient(token);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin || false);
        }
      } catch (error) {
        console.error('Admin check failed:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};