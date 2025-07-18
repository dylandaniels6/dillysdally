import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createOpenAIClient } from '../_shared/openai.ts';
import { requireAuth, getSupabaseClient } from '../_shared/auth.ts';
import type { APIResponse, ChatMessage } from '../_shared/types.ts';

// Usage tracking functions
const trackUsage = async (
  supabase: any,
  userId: string,
  functionName: string,
  model: string,
  usage: any,
  durationMs: number,
  status: 'success' | 'error' = 'success',
  errorMessage?: string
) => {
  try {
    const cost = calculateCost(model, usage);
    
    await supabase.from('ai_usage').insert({
      user_id: userId,
      function_name: functionName,
      model,
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      cost_estimate: cost,
      duration_ms: durationMs,
      status,
      error_message: errorMessage,
    });
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
};

const calculateCost = (model: string, usage: any): number => {
  // gpt-4.1-mini pricing (per 1M tokens)
  const inputCostPer1M = 0.15;
  const outputCostPer1M = 0.60;
  
  const inputCost = (usage.prompt_tokens || 0) * (inputCostPer1M / 1000000);
  const outputCost = (usage.completion_tokens || 0) * (outputCostPer1M / 1000000);
  
  return inputCost + outputCost;
};

// Retry logic with exponential backoff
const retryWithBackoff = async (fn: Function, maxRetries: number = 3): Promise<any> => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error?.status === 401 || error?.status === 403) {
        throw error;
      }
      
      // Only retry on rate limits and network errors
      if (error?.status === 429 || error?.code === 'NETWORK_ERROR') {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry other errors
      throw error;
    }
  }
  
  throw lastError;
};

serve(async (req: Request) => {
  // 🔍 DEBUG: Log all environment variables
  console.log('=== ENVIRONMENT DEBUG ===');
  console.log('All env vars:', Object.keys(Deno.env.toObject()));
  console.log('OPENAI_API_KEY exists:', !!Deno.env.get('OPENAI_API_KEY'));
  console.log('OPENAI_API_KEY length:', Deno.env.get('OPENAI_API_KEY')?.length || 0);
  console.log('SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'));
  console.log('SUPABASE_ANON_KEY exists:', !!Deno.env.get('SUPABASE_ANON_KEY'));
  console.log('=========================');

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();
  let user: any;
  let supabase: any;

  try {
    user = await requireAuth(req);
    supabase = getSupabaseClient(req);
    
    const { messages, stream = false } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Get user context for personalized responses
    const userContext = await getUserContext(supabase, user.id);
    
    // Build conversation with context
    console.log('🔍 About to create OpenAI client...');
    const openai = createOpenAIClient();
    console.log('✅ OpenAI client created successfully');
    
    const systemMessage = buildSystemMessage(userContext);
    
    const allMessages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...messages,
    ];

    if (stream) {
      // Handle streaming response with retry logic
      const streamResponse = await retryWithBackoff(async () => {
        return await openai.createChatCompletion({
          model: 'gpt-4.1-mini',
          messages: allMessages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        });
      });

      // Note: Usage tracking for streaming is more complex and would need special handling
      // For now, we'll track streaming requests separately or estimate usage

      // Return SSE stream
      return new Response(streamResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Handle regular response with retry logic
      const completion = await retryWithBackoff(async () => {
        return await openai.createChatCompletion({
          model: 'gpt-4.1-mini',
          messages: allMessages,
          temperature: 0.7,
          max_tokens: 1000,
        });
      });

      const assistantMessage = completion.choices[0]?.message?.content;

      // Track usage
      const duration = Date.now() - startTime;
      await trackUsage(
        supabase,
        user.id,
        'ai-chat',
        'gpt-4.1-mini',
        completion.usage || {},
        duration,
        'success'
      );

      // Save conversation to history
      await saveConversation(supabase, user.id, messages, assistantMessage);

      const response: APIResponse = {
        status: 'success',
        data: { 
          message: assistantMessage,
          usage: completion.usage,
        },
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('AI chat error:', error);

    // Track failed usage if we have user info
    if (user && supabase) {
      const duration = Date.now() - startTime;
      await trackUsage(
        supabase,
        user.id,
        'ai-chat',
        'gpt-4.1-mini',
        {},
        duration,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    const response: APIResponse = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Chat service unavailable',
    };

    return new Response(JSON.stringify(response), {
      status: error instanceof Response ? error.status : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserContext(supabase: any, userId: string) {
  // Fetch relevant user data for context
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [journals, expenses, habits, climbing] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('mood, tags, context_data')
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false })
      .limit(10),
    supabase
      .from('expenses')
      .select('category, amount')
      .gte('date', thirtyDaysAgo.toISOString())
      .limit(20),
    supabase
      .from('habits')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString())
      .limit(30),
    supabase
      .from('climbing_sessions')
      .select('location, routes')
      .gte('date', thirtyDaysAgo.toISOString())
      .limit(5),
  ]);

  return {
    recentMoods: journals.data?.map(j => j.mood).filter(Boolean) || [],
    spendingCategories: [...new Set(expenses.data?.map(e => e.category) || [])],
    habitCompletion: calculateHabitCompletion(habits.data || []),
    climbingFrequency: climbing.data?.length || 0,
  };
}

function buildSystemMessage(context: any): string {
  return `You are Cortana, a supportive AI assistant helping the user track and improve their life. 
You have access to their recent data:

- Recent moods: ${context.recentMoods.slice(0, 5).join(', ') || 'No mood data'}
- Spending categories: ${context.spendingCategories.join(', ') || 'No spending data'}
- Habit completion rate: ${context.habitCompletion}%
- Climbing sessions (last 30 days): ${context.climbingFrequency}

Be conversational, supportive, and help them gain insights from their data. Keep responses 
focused and actionable. If they ask about their data, use the context provided.`;
}

function calculateHabitCompletion(habits: any[]): number {
  if (!habits.length) return 0;
  const completed = habits.filter(h => h.completed).length;
  return Math.round((completed / habits.length) * 100);
}

async function saveConversation(supabase: any, userId: string, messages: any[], response: string) {
  try {
    await supabase.from('chat_history').insert({
      user_id: userId,
      messages: [...messages, { role: 'assistant', content: response }],
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
}