import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

export const useAdminStatus = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check if user is admin based on email
    const adminEmail = 'dylandaniels226@gmail.com';
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const isUserAdmin = userEmail === adminEmail;
    
    setIsAdmin(isUserAdmin);
    setLoading(false);
  }, [user]);

  return { isAdmin, loading };
};