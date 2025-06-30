import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createOpenAIClient } from '../_shared/openai.ts';
import { requireAuth, getSupabaseClient } from '../_shared/auth.ts';
import type { APIResponse } from '../_shared/types.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const user = await requireAuth(req);
    const supabase = getSupabaseClient(req);

    const { meals, date, context = {} } = await req.json();

    if (!meals || meals.trim() === '') {
      throw new Error('Meal description is required');
    }

    // Get user's recent meal patterns for context
    const { data: recentMeals } = await supabase
      .from('journal_entries')
      .select('meals, context_data')
      .not('meals', 'is', null)
      .order('date', { ascending: false })
      .limit(7);

    // Get user's health goals if available
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('health_goals, dietary_preferences')
      .eq('user_id', user.id)
      .single();

    const openai = createOpenAIClient();
    
    const systemPrompt = buildNutritionSystemPrompt(userProfile?.data);
    const userPrompt = buildMealPrompt({ meals, date, context, recentMeals });

    const completion = await openai.createChatCompletion({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const analysis = completion.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('Failed to generate meal analysis');
    }

    // Extract nutritional estimates if possible
    const nutritionalData = extractNutritionalEstimates(analysis);

    // Log the analysis
    await supabase.from('ai_interactions').insert({
      user_id: user.id,
      type: 'meal_analysis',
      input_tokens: userPrompt.length,
      output_tokens: analysis.length,
      model: 'gpt-4.1-mini',
      metadata: { nutritionalData },
      created_at: new Date().toISOString(),
    });

    const response: APIResponse = {
      status: 'success',
      data: { 
        analysis,
        nutritionalEstimates: nutritionalData,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Meal analyze error:', error);

    const response: APIResponse = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Analysis failed',
    };

    return new Response(JSON.stringify(response), {
      status: error instanceof Response ? error.status : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildNutritionSystemPrompt(userProfile?: any): string {
  const dietaryPrefs = userProfile?.dietary_preferences?.join(', ') || 'None specified';
  const healthGoals = userProfile?.health_goals || 'General wellness';

  return `You are a supportive nutritional AI assistant providing meal analysis for someone with these preferences:
- Dietary preferences: ${dietaryPrefs}
- Health goals: ${healthGoals}

Provide constructive feedback that:
1. Acknowledges what they're doing well
2. Identifies nutritional balance (protein, carbs, fats, vegetables)
3. Suggests gentle improvements without judgment
4. Estimates approximate calories and macros when possible
5. Considers meal timing and portion awareness
6. Encourages sustainable, healthy eating habits

Keep the tone warm, encouraging, and practical. Focus on progress, not perfection.`;
}

function buildMealPrompt({ meals, date, context, recentMeals }: any): string {
  const recentPatterns = analyzeMealPatterns(recentMeals);
  
  return `Please analyze this meal log for ${date}:

Today's Meals:
"${meals}"

Context:
- Day Rating: ${context.dayRating || 'Not rated'}/5
- Physical Activity: ${context.climbed ? 'Climbed today' : 'No climbing'}
- Miles: ${context.miles || 0}

Recent Eating Patterns:
${recentPatterns}

Provide a supportive analysis including:
1. Nutritional balance assessment
2. Estimated calories and macros (protein, carbs, fat)
3. What they're doing well
4. One or two gentle suggestions
5. Encouragement for tomorrow`;
}

function analyzeMealPatterns(recentMeals: any[]): string {
  if (!recentMeals || recentMeals.length === 0) {
    return 'No recent meal data available';
  }

  const patterns = recentMeals
    .slice(0, 3)
    .map(entry => entry.meals?.slice(0, 50) + '...')
    .filter(Boolean)
    .join(', ');

  return `Recent meals include: ${patterns}`;
}

function extractNutritionalEstimates(analysis: string): any {
  // Simple regex patterns to extract nutritional estimates from the AI response
  const calorieMatch = analysis.match(/(\d+)\s*calories/i);
  const proteinMatch = analysis.match(/(\d+)\s*g(?:rams)?\s*protein/i);
  const carbsMatch = analysis.match(/(\d+)\s*g(?:rams)?\s*carb/i);
  const fatMatch = analysis.match(/(\d+)\s*g(?:rams)?\s*fat/i);

  return {
    calories: calorieMatch ? parseInt(calorieMatch[1]) : null,
    protein: proteinMatch ? parseInt(proteinMatch[1]) : null,
    carbs: carbsMatch ? parseInt(carbsMatch[1]) : null,
    fat: fatMatch ? parseInt(fatMatch[1]) : null,
  };
}