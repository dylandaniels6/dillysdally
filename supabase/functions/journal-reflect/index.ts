import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createOpenAIClient } from '../_shared/openai.ts';
import { requireAuth, getSupabaseClient } from '../_shared/auth.ts';
import { trackFunctionCall } from '../_shared/tracking.ts';
import { ResponseCache } from '../_shared/cache.ts';
import { getServiceSupabaseClient } from '../_shared/supabase.ts';
import type { APIResponse } from '../_shared/types.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();
  let user: any;

  try {
    // Authenticate user
    user = await requireAuth(req);
    const supabase = getSupabaseClient(req);
    const serviceSupabase = getServiceSupabaseClient(); // For cache and tracking

    // Parse request body
    const { entry, mood, date, habits = {} } = await req.json();

    if (!entry) {
      throw new Error('Journal entry content is required');
    }

    // Check cache first
    const cache = new ResponseCache(serviceSupabase);
    const cacheKey = { entry: entry.substring(0, 100), mood, date }; // Use first 100 chars for cache
    const cachedResponse = await cache.get('journal-reflect', cacheKey, user.id);

    if (cachedResponse) {
      const response: APIResponse = {
        status: 'success',
        data: { 
          reflection: cachedResponse.reflection,
          cached: true 
        },
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's recent context for better reflections
    const { data: recentEntries } = await supabase
      .from('journal_entries')
      .select('mood, tags, context_data')
      .order('date', { ascending: false })
      .limit(5);

    // Create AI reflection
    const openai = createOpenAIClient();
    const systemPrompt = buildSystemPrompt(recentEntries);
    const userPrompt = buildUserPrompt({ entry, mood, date, habits });

    const completion = await openai.createChatCompletion({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const reflection = completion.choices[0]?.message?.content;
    const usage = completion.usage;

    if (!reflection) {
      throw new Error('Failed to generate reflection');
    }

    // Track usage
    await trackFunctionCall(
      serviceSupabase,
      'journal-reflect',
      user.id,
      'gpt-4.1-mini',
      startTime,
      usage,
      'success'
    );

    // Cache the response
    const ttl = ResponseCache.getTTL('journal-reflect');
    await cache.set(
      'journal-reflect',
      cacheKey,
      { reflection },
      ttl,
      user.id,
      usage.total_tokens
    );

    const response: APIResponse = {
      status: 'success',
      data: { 
        reflection,
        usage: {
          tokens: usage.total_tokens,
          model: 'gpt-4.1-mini'
        }
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Journal reflect error:', error);

    // Track error
    if (user) {
      const serviceSupabase = getServiceSupabaseClient();
      await trackFunctionCall(
        serviceSupabase,
        'journal-reflect',
        user.id,
        'gpt-4.1-mini',
        startTime,
        { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        'error',
        error.message
      );
    }

    const response: APIResponse = {
      status: 'error',
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };

    return new Response(JSON.stringify(response), {
      status: error instanceof Response ? error.status : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(recentEntries: any[] = []): string {
  const recentMoods = recentEntries.map(e => e.mood).filter(Boolean).join(', ');
  
  return `You are a compassionate AI therapist and life coach named Dilly. You provide thoughtful, 
supportive reflections on journal entries with these guidelines:

1. Be warm, empathetic, and encouraging
2. Identify patterns and insights without being prescriptive
3. Ask one thought-provoking question to encourage deeper reflection
4. Keep responses concise (200-300 words)
5. Consider the user's recent emotional journey: ${recentMoods || 'No recent data'}

Your goal is to help the user gain clarity and feel supported in their personal growth journey.`;
}

function buildUserPrompt({ entry, mood, date, habits }: any): string {
  const habitsSummary = Object.entries(habits || {})
    .map(([habit, completed]) => `${habit}: ${completed ? '✓' : '✗'}`)
    .join(', ');

  return `Journal Entry (${date}):
"${entry}"

Current mood: ${mood || 'Not specified'}
Today's habits: ${habitsSummary || 'None tracked'}

Please provide a thoughtful reflection that acknowledges their feelings, identifies any patterns or 
insights, and ends with one gentle question that encourages deeper self-exploration.`;
}