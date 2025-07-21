import { createAuthenticatedSupabaseClient } from '../../../../lib/supabase';

interface Message {
  id?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp?: Date;
}

interface UserData {
  journalEntries: any[];
  expenses: any[];
  climbingSessions: any[];
  habits: any[];
}

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute
const RATE_LIMIT_STORAGE_KEY = 'ai_chat_rate_limit';

// Client-side rate limiting
const checkClientRateLimit = (): { allowed: boolean; resetTime?: number } => {
  try {
    const now = Date.now();
    const storedData = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    
    if (!storedData) {
      // First request
      const newData = {
        requests: [now],
        windowStart: now
      };
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(newData));
      return { allowed: true };
    }

    const data = JSON.parse(storedData);
    const { requests, windowStart } = data;

    // Clean old requests outside the current window
    const validRequests = requests.filter((time: number) => now - time < RATE_LIMIT_WINDOW_MS);

    if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      // Rate limit exceeded
      const oldestRequest = Math.min(...validRequests);
      const resetTime = oldestRequest + RATE_LIMIT_WINDOW_MS;
      return { allowed: false, resetTime };
    }

    // Add current request
    validRequests.push(now);
    
    const updatedData = {
      requests: validRequests,
      windowStart: validRequests[0] || now
    };
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(updatedData));
    
    return { allowed: true };
  } catch (error) {
    console.error('Client rate limit check failed:', error);
    // If rate limiting fails, allow the request (fail open)
    return { allowed: true };
  }
};

// Input validation
const validateInput = (input: string): { valid: boolean; error?: string } => {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Message is required' };
  }

  if (input.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (input.length > 2000) {
    return { valid: false, error: 'Message is too long (max 2000 characters)' };
  }

  // Check for potentially harmful content patterns
  const harmfulPatterns = [
    /(<script[^>]*>.*?<\/script>)/gi,
    /javascript:/gi,
    /data:text\/html/gi
  ];

  for (const pattern of harmfulPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: 'Invalid message content' };
    }
  }

  return { valid: true };
};

export const sendChatMessage = async (
  input: string,
  previousMessages: Message[],
  userData: UserData
): Promise<string> => {
  try {
    // 🔒 CLIENT-SIDE VALIDATION: Validate input
    const inputValidation = validateInput(input);
    if (!inputValidation.valid) {
      throw new Error(inputValidation.error);
    }

    // 🔒 CLIENT-SIDE RATE LIMITING: Check rate limit
    const rateLimitCheck = checkClientRateLimit();
    if (!rateLimitCheck.allowed) {
      const resetTime = rateLimitCheck.resetTime;
      const waitTime = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
      throw new Error(`Too many requests. Please wait ${waitTime} seconds before sending another message.`);
    }

    // Get fresh token with skipCache to avoid expired JWT
    const token = await (window as any).Clerk?.session?.getToken({ 
      template: 'supabase',
      skipCache: true
    });

    // 🔧 FALLBACK: Try multiple ways to get user ID
    let userId = (window as any).Clerk?.user?.id;
    
    if (!userId) {
      // Try alternative ways to get user ID
      userId = (window as any).Clerk?.session?.userId;
    }
    
    if (!userId) {
      // Last resort - extract from token (if it's a JWT)
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload.sub || tokenPayload.user_id;
      } catch (e) {
        console.warn('Could not extract user ID from token');
      }
    }

    if (!token) {
      throw new Error('Authentication required. Please sign in to use AI chat.');
    }

    // 🔧 BYPASS: If we still don't have userId, create client without it
    let supabase;
    if (userId) {
      supabase = createAuthenticatedSupabaseClient(token, userId);
    } else {
      // Create client with just token, no user ID validation
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      supabase = (await import('@supabase/supabase-js')).createClient(
        supabaseUrl, 
        supabaseAnonKey, 
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      );
    }

    // Validate previous messages
    const validatedMessages = previousMessages.filter(msg => {
      const validation = validateInput(msg.content);
      return validation.valid;
    });

    const messages = [
      ...validatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content.trim()
      })),
      {
        role: 'user' as const,
        content: input.trim()
      }
    ];

    // Call edge function with authenticated client
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        messages,
        userData
      }
    });

    if (error) {
      console.error('Chat API Error:', error);
      
      // Handle specific error types
      if (error.message?.includes('Rate limit')) {
        throw new Error('Too many requests. Please wait a moment before sending another message.');
      }
      
      throw new Error(error.message || 'Failed to get AI response');
    }

    if (data?.data?.message) {
      return data.data.message;
    } else if (data?.message) {
      return data.message;
    } else {
      throw new Error('Invalid response from AI service');
    }

  } catch (error: any) {
    console.error('Error in sendChatMessage:', error);

    // Handle specific error types with user-friendly messages
    if (error?.message?.includes('Authentication') || 
        error?.message?.includes('401') || 
        error?.message?.includes('JWT expired')) {
      throw new Error('Please sign in to use the AI chat feature.');
    } else if (error?.message?.includes('rate limit') || 
               error?.message?.includes('Too many requests')) {
      throw new Error(error.message);
    } else if (error?.message?.includes('Invalid message')) {
      throw new Error(error.message);
    } else if (error?.message?.includes('Message is required') ||
               error?.message?.includes('Message cannot be empty') ||
               error?.message?.includes('Message is too long')) {
      throw new Error(error.message);
    } else {
      throw new Error('AI service temporarily unavailable. Please try again.');
    }
  }
};

// Utility function to check current rate limit status
export const getRateLimitStatus = (): { remainingRequests: number; resetTime?: number } => {
  try {
    const now = Date.now();
    const storedData = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    
    if (!storedData) {
      return { remainingRequests: MAX_REQUESTS_PER_WINDOW };
    }

    const data = JSON.parse(storedData);
    const { requests } = data;

    // Count valid requests in current window
    const validRequests = requests.filter((time: number) => now - time < RATE_LIMIT_WINDOW_MS);
    const remainingRequests = Math.max(0, MAX_REQUESTS_PER_WINDOW - validRequests.length);
    
    let resetTime;
    if (validRequests.length > 0) {
      const oldestRequest = Math.min(...validRequests);
      resetTime = oldestRequest + RATE_LIMIT_WINDOW_MS;
    }

    return { remainingRequests, resetTime };
  } catch (error) {
    console.error('Rate limit status check failed:', error);
    return { remainingRequests: MAX_REQUESTS_PER_WINDOW };
  }
};

export const AI_PROVIDER = 'supabase-edge-functions' as const;

export const setAIProvider = (provider: string) => {
  console.log(`AI provider is: ${provider}`);
};