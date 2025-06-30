import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createOpenAIClient } from '../_shared/openai.ts';
import { requireAuth, getSupabaseClient } from '../_shared/auth.ts';
import type { APIResponse } from '../_shared/types.ts';

interface SummaryPeriod {
  start: Date;
  end: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const user = await requireAuth(req);
    const supabase = getSupabaseClient(req);

    const { periodType = 'weekly', date = new Date().toISOString() } = await req.json();

    // Calculate period boundaries
    const period = calculatePeriod(periodType, new Date(date));

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_type', periodType)
      .gte('period_start', period.start.toISOString())
      .lte('period_end', period.end.toISOString())
      .single();

    if (existingSummary && !isStale(existingSummary.created_at)) {
      return new Response(JSON.stringify({
        status: 'success',
        data: { 
          summary: existingSummary.content,
          cached: true,
          createdAt: existingSummary.created_at,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all relevant data for the period
    const userData = await fetchUserDataForPeriod(supabase, user.id, period);

    if (!hasEnoughData(userData)) {
      return new Response(JSON.stringify({
        status: 'success',
        data: { 
          summary: `Not enough data for ${periodType} summary. Keep tracking to see insights!`,
          insufficient_data: true,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate summary with AI
    const openai = createOpenAIClient();
    const summary = await generateAISummary(openai, userData, period);

    // Save summary to database
    await supabase.from('ai_summaries').upsert({
      user_id: user.id,
      period_type: periodType,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
      content: summary,
      metadata: {
        entry_count: userData.journalEntries.length,
        expense_count: userData.expenses.length,
        habit_count: userData.habits.length,
        climbing_sessions: userData.climbingSessions.length,
      },
      created_at: new Date().toISOString(),
    });

    const response: APIResponse = {
      status: 'success',
      data: { 
        summary,
        period: {
          type: periodType,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate summary error:', error);

    const response: APIResponse = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Summary generation failed',
    };

    return new Response(JSON.stringify(response), {
      status: error instanceof Response ? error.status : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculatePeriod(type: string, date: Date): SummaryPeriod {
  const start = new Date(date);
  const end = new Date(date);

  switch (type) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'quarterly':
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(quarter * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end, type: type as any };
}

async function fetchUserDataForPeriod(supabase: any, userId: string, period: SummaryPeriod) {
  const [journals, expenses, habits, climbing, netWorth] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('*')
      .gte('date', period.start.toISOString())
      .lte('date', period.end.toISOString())
      .order('date', { ascending: true }),
    supabase
      .from('expenses')
      .select('*')
      .gte('date', period.start.toISOString())
      .lte('date', period.end.toISOString()),
    supabase
      .from('habits')
      .select('*')
      .gte('date', period.start.toISOString())
      .lte('date', period.end.toISOString()),
    supabase
      .from('climbing_sessions')
      .select('*')
      .gte('date', period.start.toISOString())
      .lte('date', period.end.toISOString()),
    supabase
      .from('net_worth_entries')
      .select('*')
      .gte('date', period.start.toISOString())
      .lte('date', period.end.toISOString())
      .order('date', { ascending: false })
      .limit(2),
  ]);

  return {
    journalEntries: journals.data || [],
    expenses: expenses.data || [],
    habits: habits.data || [],
    climbingSessions: climbing.data || [],
    netWorthEntries: netWorth.data || [],
  };
}

async function generateAISummary(openai: any, userData: any, period: SummaryPeriod): Promise<string> {
  const analysis = analyzeUserData(userData);
  
  const systemPrompt = `You are creating a ${period.type} summary for the user's life tracking data. 
Your summary should be insightful, supportive, and actionable. Focus on:
1. Key achievements and positive patterns
2. Areas of growth or concern
3. Interesting insights from the data
4. Gentle suggestions for improvement
5. Encouragement and validation

Keep the tone warm, personal, and constructive. Use "you" to address the user directly.`;

  const userPrompt = `Create a ${period.type} summary for the period ${period.start.toDateString()} to ${period.end.toDateString()}.

Data Analysis:
${JSON.stringify(analysis, null, 2)}

Journal Themes: ${extractJournalThemes(userData.journalEntries)}
Key Events: ${extractKeyEvents(userData.journalEntries)}

Please create a comprehensive but concise summary (300-500 words) that helps the user understand their patterns and progress.`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return completion.choices[0]?.message?.content || 'Unable to generate summary';
}

function analyzeUserData(data: any) {
  const totalExpenses = data.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const avgDayRating = calculateAverage(data.journalEntries.map((e: any) => e.context_data?.dayRating).filter(Boolean));
  const moodCounts = countMoods(data.journalEntries);
  const habitCompletion = calculateHabitStats(data.habits);
  const climbingStats = calculateClimbingStats(data.climbingSessions);
  const expensesByCategory = groupExpensesByCategory(data.expenses);

  return {
    totalExpenses,
    avgDayRating,
    moodCounts,
    habitCompletion,
    climbingStats,
    expensesByCategory,
    journalCount: data.journalEntries.length,
    netWorthChange: calculateNetWorthChange(data.netWorthEntries),
  };
}

function isStale(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age > 24 * 60 * 60 * 1000; // 24 hours
}

function hasEnoughData(userData: any): boolean {
  return userData.journalEntries.length > 0 || 
         userData.expenses.length > 0 || 
         userData.habits.length > 0 ||
         userData.climbingSessions.length > 0;
}

// Helper functions
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function countMoods(entries: any[]): Record<string, number> {
  const moods: Record<string, number> = {};
  entries.forEach(entry => {
    if (entry.mood) {
      moods[entry.mood] = (moods[entry.mood] || 0) + 1;
    }
  });
  return moods;
}

function calculateHabitStats(habits: any[]): any {
  const completed = habits.filter(h => h.completed).length;
  return {
    total: habits.length,
    completed,
    percentage: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0,
  };
}

function calculateClimbingStats(sessions: any[]): any {
  const totalRoutes = sessions.reduce((sum, s) => sum + (s.routes?.length || 0), 0);
  const completedRoutes = sessions.reduce((sum, s) => 
    sum + (s.routes?.filter((r: any) => r.completed).length || 0), 0
  );
  
  return {
    sessions: sessions.length,
    totalRoutes,
    completedRoutes,
    completionRate: totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 0,
  };
}

function groupExpensesByCategory(expenses: any[]): Record<string, number> {
  const categories: Record<string, number> = {};
  expenses.forEach(expense => {
    categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
  });
  return categories;
}

function calculateNetWorthChange(entries: any[]): number | null {
  if (entries.length < 2) return null;
  const latest = entries[0].cash_equivalents + entries[0].assets - entries[0].credit_cards;
  const previous = entries[1].cash_equivalents + entries[1].assets - entries[1].credit_cards;
  return latest - previous;
}

function extractJournalThemes(entries: any[]): string {
  const allTags = entries.flatMap(e => e.tags || []);
  const tagCounts: Record<string, number> = {};
  allTags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)
    .join(', ') || 'No consistent themes';
}

function extractKeyEvents(entries: any[]): string {
  const highRatedDays = entries
    .filter(e => e.context_data?.dayRating >= 4)
    .slice(0, 3)
    .map(e => e.title || e.content.slice(0, 50))
    .join('; ');
    
  return highRatedDays || 'No standout events';
}