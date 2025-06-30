import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createOpenAIClient } from '../_shared/openai.ts';
import { requireAuth } from '../_shared/auth.ts';
import type { APIResponse } from '../_shared/types.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const user = await requireAuth(req);
    
    // Only allow admin users or the user analyzing their own data
    const { targetUserId = user.id, forceRegenerate = false } = await req.json();
    
    if (targetUserId !== user.id && !user.user_metadata?.is_admin) {
      throw new Error('Unauthorized to analyze other users data');
    }

    // Get Supabase Admin client for bulk operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for bulk operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if analysis already exists
    if (!forceRegenerate) {
      const { data: existingAnalysis } = await adminClient
        .from('ai_analysis_summaries')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingAnalysis && existingAnalysis.length > 0) {
        const lastAnalysis = existingAnalysis[0];
        const daysSinceAnalysis = (Date.now() - new Date(lastAnalysis.created_at).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceAnalysis < 7) {
          return new Response(JSON.stringify({
            status: 'success',
            data: {
              message: 'Recent analysis already exists',
              lastAnalyzed: lastAnalysis.created_at,
              summaries: existingAnalysis,
            },
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Fetch all user data
    const userData = await fetchAllUserData(adminClient, targetUserId);

    if (!userData.journalEntries.length) {
      return new Response(JSON.stringify({
        status: 'success',
        data: {
          message: 'No journal entries to analyze',
          summaries: [],
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize OpenAI
    const openai = createOpenAIClient();

    // Generate various analyses
    const analyses = [];

    // 1. Monthly summaries
    const monthlyGroups = groupByMonth(userData.journalEntries);
    for (const [monthKey, entries] of Object.entries(monthlyGroups)) {
      if (entries.length >= 5) { // Only analyze months with substantial data
        const summary = await generateMonthlyAnalysis(openai, entries, userData, monthKey);
        analyses.push({
          user_id: targetUserId,
          type: 'monthly',
          period_key: monthKey,
          content: summary,
          metadata: {
            entry_count: entries.length,
            start_date: entries[0].date,
            end_date: entries[entries.length - 1].date,
          },
          created_at: new Date().toISOString(),
        });
      }
    }

    // 2. Overall patterns analysis
    const patternsAnalysis = await generatePatternsAnalysis(openai, userData);
    analyses.push({
      user_id: targetUserId,
      type: 'patterns',
      period_key: 'all-time',
      content: patternsAnalysis,
      metadata: {
        total_entries: userData.journalEntries.length,
        date_range: {
          start: userData.journalEntries[0].date,
          end: userData.journalEntries[userData.journalEntries.length - 1].date,
        },
      },
      created_at: new Date().toISOString(),
    });

    // 3. Habit trends analysis
    if (userData.habits.length > 30) {
      const habitAnalysis = await generateHabitAnalysis(openai, userData.habits);
      analyses.push({
        user_id: targetUserId,
        type: 'habits',
        period_key: 'all-time',
        content: habitAnalysis,
        metadata: {
          total_habit_entries: userData.habits.length,
        },
        created_at: new Date().toISOString(),
      });
    }

    // 4. Financial patterns analysis
    if (userData.expenses.length > 50) {
      const financialAnalysis = await generateFinancialAnalysis(openai, userData);
      analyses.push({
        user_id: targetUserId,
        type: 'financial',
        period_key: 'all-time',
        content: financialAnalysis,
        metadata: {
          total_expenses: userData.expenses.length,
          total_income: userData.income.length,
        },
        created_at: new Date().toISOString(),
      });
    }

    // Save all analyses
    const { error } = await adminClient
      .from('ai_analysis_summaries')
      .insert(analyses);

    if (error) {
      throw new Error(`Failed to save analyses: ${error.message}`);
    }

    const response: APIResponse = {
      status: 'success',
      data: {
        message: 'Bulk analysis completed successfully',
        summariesCreated: analyses.length,
        types: analyses.map(a => a.type),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bulk analyze error:', error);

    const response: APIResponse = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Bulk analysis failed',
    };

    return new Response(JSON.stringify(response), {
      status: error instanceof Response ? error.status : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchAllUserData(adminClient: any, userId: string) {
  const [journals, expenses, income, habits, climbing, netWorth] = await Promise.all([
    adminClient
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
    adminClient
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
    adminClient
      .from('income')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
    adminClient
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
    adminClient
      .from('climbing_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
    adminClient
      .from('net_worth_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
  ]);

  return {
    journalEntries: journals.data || [],
    expenses: expenses.data || [],
    income: income.data || [],
    habits: habits.data || [],
    climbingSessions: climbing.data || [],
    netWorthEntries: netWorth.data || [],
  };
}

function groupByMonth(entries: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(entry);
  });

  return groups;
}

async function generateMonthlyAnalysis(openai: any, entries: any[], allData: any, monthKey: string): Promise<string> {
  const monthExpenses = allData.expenses.filter((e: any) => e.date.startsWith(monthKey));
  const monthHabits = allData.habits.filter((h: any) => h.date.startsWith(monthKey));
  const monthClimbing = allData.climbingSessions.filter((c: any) => c.date.startsWith(monthKey));

  const prompt = `Analyze this month's journal entries and life data to create a comprehensive summary.

Month: ${monthKey}
Journal Entries: ${entries.length}
Total Spending: $${monthExpenses.reduce((sum: number, e: any) => sum + e.amount, 0).toFixed(2)}
Habit Tracking Days: ${monthHabits.length}
Climbing Sessions: ${monthClimbing.length}

Key Journal Excerpts:
${entries.slice(0, 10).map(e => `${e.date}: ${e.mood} - ${e.content.slice(0, 200)}...`).join('\n\n')}

Create a summary that identifies:
1. Major themes and emotional patterns
2. Significant events or milestones
3. Progress on habits and goals
4. Financial insights
5. Overall trajectory and growth

Keep it insightful and supportive, around 400 words.`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'You are analyzing monthly life tracking data to provide insightful summaries that help users understand their patterns and growth.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 600,
  });

  return completion.choices[0]?.message?.content || 'Unable to generate monthly analysis';
}

async function generatePatternsAnalysis(openai: any, userData: any): Promise<string> {
  const moodTrends = analyzeMoodTrends(userData.journalEntries);
  const habitPatterns = analyzeHabitPatterns(userData.habits);
  const spendingPatterns = analyzeSpendingPatterns(userData.expenses);
  const growthIndicators = identifyGrowthIndicators(userData);

  const prompt = `Analyze all-time patterns across this user's life tracking data:

Time Period: ${userData.journalEntries[0]?.date} to ${userData.journalEntries[userData.journalEntries.length - 1]?.date}
Total Entries: ${userData.journalEntries.length}

Mood Trends:
${JSON.stringify(moodTrends, null, 2)}

Habit Patterns:
${JSON.stringify(habitPatterns, null, 2)}

Spending Patterns:
${JSON.stringify(spendingPatterns, null, 2)}

Growth Indicators:
${JSON.stringify(growthIndicators, null, 2)}

Create a comprehensive pattern analysis that identifies:
1. Long-term emotional and behavioral patterns
2. Seasonal or cyclical trends
3. Key life transitions and turning points
4. Persistent challenges and how they've evolved
5. Areas of consistent growth and success
6. Recommendations for leveraging positive patterns

Make it deeply insightful and actionable, around 600 words.`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a data analyst specializing in personal development, creating deep insights from life tracking data.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return completion.choices[0]?.message?.content || 'Unable to generate patterns analysis';
}

async function generateHabitAnalysis(openai: any, habits: any[]): Promise<string> {
  // Group habits by type and analyze completion rates over time
  const habitTypes = [...new Set(habits.map(h => h.name))];
  const habitStats = habitTypes.map(type => {
    const typeHabits = habits.filter(h => h.name === type);
    const completionRate = typeHabits.filter(h => h.completed).length / typeHabits.length;
    return {
      habit: type,
      totalDays: typeHabits.length,
      completionRate: Math.round(completionRate * 100),
      longestStreak: calculateLongestStreak(typeHabits),
    };
  });

  const prompt = `Analyze habit tracking data to provide insights and recommendations:

Habit Statistics:
${JSON.stringify(habitStats, null, 2)}

Total Tracking Days: ${habits.length}
Unique Habits Tracked: ${habitTypes.length}

Create an analysis that covers:
1. Which habits show the strongest consistency
2. Patterns in habit completion (day of week, time of month, etc.)
3. Correlation between different habits
4. Recommendations for improving habit adherence
5. Celebrating successes and progress

Keep it motivational and practical, around 400 words.`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a habit formation coach analyzing tracking data to help users build better routines.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || 'Unable to generate habit analysis';
}

async function generateFinancialAnalysis(openai: any, userData: any): Promise<string> {
  const totalExpenses = userData.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const totalIncome = userData.income.reduce((sum: number, i: any) => sum + i.amount, 0);
  const avgMonthlyExpenses = totalExpenses / (userData.expenses.length / 30);
  const expensesByCategory = groupExpensesByCategory(userData.expenses);
  const netWorthTrend = analyzeNetWorthTrend(userData.netWorthEntries);

  const prompt = `Analyze financial data to provide insights and recommendations:

Financial Overview:
- Total Expenses: $${totalExpenses.toFixed(2)}
- Total Income: $${totalIncome.toFixed(2)}
- Average Monthly Expenses: $${avgMonthlyExpenses.toFixed(2)}
- Net Worth Trend: ${netWorthTrend}

Top Spending Categories:
${Object.entries(expensesByCategory)
  .sort((a, b) => b[1] as number - (a[1] as number))
  .slice(0, 5)
  .map(([cat, amount]) => `${cat}: $${(amount as number).toFixed(2)}`)
  .join('\n')}

Create a financial analysis that includes:
1. Spending patterns and trends
2. Opportunities for optimization
3. Progress toward financial stability
4. Actionable recommendations
5. Positive financial habits to reinforce

Keep it constructive and encouraging, around 400 words.`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a supportive financial advisor analyzing spending data to help users improve their financial health.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || 'Unable to generate financial analysis';
}

// Helper functions for analysis
function analyzeMoodTrends(entries: any[]) {
  const moodCounts: Record<string, number> = {};
  const moodByMonth: Record<string, Record<string, number>> = {};

  entries.forEach(entry => {
    if (entry.mood) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      
      const monthKey = entry.date.slice(0, 7);
      if (!moodByMonth[monthKey]) {
        moodByMonth[monthKey] = {};
      }
      moodByMonth[monthKey][entry.mood] = (moodByMonth[monthKey][entry.mood] || 0) + 1;
    }
  });

  return {
    overall: moodCounts,
    byMonth: moodByMonth,
    totalEntries: entries.length,
  };
}

function analyzeHabitPatterns(habits: any[]) {
  const byDayOfWeek: Record<number, { total: number; completed: number }> = {};
  
  habits.forEach(habit => {
    const day = new Date(habit.date).getDay();
    if (!byDayOfWeek[day]) {
      byDayOfWeek[day] = { total: 0, completed: 0 };
    }
    byDayOfWeek[day].total++;
    if (habit.completed) {
      byDayOfWeek[day].completed++;
    }
  });

  return {
    completionByDayOfWeek: Object.entries(byDayOfWeek).map(([day, stats]) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(day)],
      completionRate: Math.round((stats.completed / stats.total) * 100),
    })),
  };
}

function analyzeSpendingPatterns(expenses: any[]) {
  const byMonth: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  expenses.forEach(expense => {
    const monthKey = expense.date.slice(0, 7);
    byMonth[monthKey] = (byMonth[monthKey] || 0) + expense.amount;
    byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
  });

  return {
    monthlyTotals: byMonth,
    categoryTotals: byCategory,
    avgPerTransaction: expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length,
  };
}

function identifyGrowthIndicators(userData: any) {
  const recentAvgRating = calculateRecentAverage(userData.journalEntries, 'dayRating', 30);
  const olderAvgRating = calculateOlderAverage(userData.journalEntries, 'dayRating', 30, 90);
  
  return {
    dayRatingTrend: recentAvgRating > olderAvgRating ? 'improving' : 'declining',
    recentAvgDayRating: recentAvgRating,
    consistencyScore: calculateConsistencyScore(userData.journalEntries),
  };
}

function calculateLongestStreak(habits: any[]): number {
  let currentStreak = 0;
  let longestStreak = 0;
  
  const sortedHabits = habits.sort((a, b) => a.date.localeCompare(b.date));
  
  for (let i = 0; i < sortedHabits.length; i++) {
    if (sortedHabits[i].completed) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return longestStreak;
}

function calculateRecentAverage(entries: any[], field: string, days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const recent = entries.filter(e => new Date(e.date) > cutoff);
  const values = recent.map(e => e.context_data?.[field]).filter(v => v !== undefined);
  
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function calculateOlderAverage(entries: any[], field: string, startDays: number, endDays: number): number {
  const startCutoff = new Date();
  startCutoff.setDate(startCutoff.getDate() - endDays);
  const endCutoff = new Date();
  endCutoff.setDate(endCutoff.getDate() - startDays);
  
  const older = entries.filter(e => {
    const date = new Date(e.date);
    return date > startCutoff && date < endCutoff;
  });
  
  const values = older.map(e => e.context_data?.[field]).filter(v => v !== undefined);
  
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function calculateConsistencyScore(entries: any[]): number {
  if (entries.length < 7) return 0;
  
  const daysBetweenEntries = [];
  for (let i = 1; i < entries.length; i++) {
    const days = Math.floor((new Date(entries[i].date).getTime() - new Date(entries[i-1].date).getTime()) / (1000 * 60 * 60 * 24));
    daysBetweenEntries.push(days);
  }
  
  const avgDaysBetween = daysBetweenEntries.reduce((a, b) => a + b, 0) / daysBetweenEntries.length;
  
  // Score based on how close to daily entries (1 day apart)
  return Math.max(0, 100 - (avgDaysBetween - 1) * 20);
}

function groupExpensesByCategory(expenses: any[]): Record<string, number> {
  return expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
}

function analyzeNetWorthTrend(entries: any[]): string {
  if (entries.length < 2) return 'Insufficient data';
  
  const first = entries[0];
  const last = entries[entries.length - 1];
  
  const firstTotal = (first.cash_equivalents || 0) + (first.assets || 0) - (first.credit_cards || 0);
  const lastTotal = (last.cash_equivalents || 0) + (last.assets || 0) - (last.credit_cards || 0);
  
  const change = lastTotal - firstTotal;
  const percentChange = (change / firstTotal) * 100;
  
  if (percentChange > 10) return `Strong growth (+${percentChange.toFixed(1)}%)`;
  if (percentChange > 0) return `Positive growth (+${percentChange.toFixed(1)}%)`;
  if (percentChange > -10) return `Slight decline (${percentChange.toFixed(1)}%)`;
  return `Significant decline (${percentChange.toFixed(1)}%)`;
}

// Import createClient at the top of the file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';