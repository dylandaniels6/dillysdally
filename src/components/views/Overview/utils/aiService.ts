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

export const sendChatMessage = async (
  input: string,
  previousMessages: Message[],
  userData: UserData
): Promise<string> => {
  try {
    // Get fresh token with skipCache to avoid expired JWT
    const token = await (window as any).Clerk?.session?.getToken({ 
      template: 'supabase',
      skipCache: true
    });

    if (!token) {
      throw new Error('Authentication required. Please sign in to use AI chat.');
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(token);

    const messages = [
      ...previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: input
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

    if (error?.message?.includes('Authentication') || 
        error?.message?.includes('401') || 
        error?.message?.includes('JWT expired')) {
      throw new Error('Please sign in to use the AI chat feature.');
    } else if (error?.message?.includes('rate limit')) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else {
      throw new Error('AI service temporarily unavailable. Please try again.');
    }
  }
};

export const AI_PROVIDER = 'supabase-edge-functions' as const;

export const setAIProvider = (provider: string) => {
  console.log(`AI provider is: ${provider}`);
};