import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface RecapData {
  journalEntries: any[];
  expenses: any[];
  climbingSessions: any[];
  habits: any[];
}

interface Summary {
  daily?: string;
  weekly?: string;
  monthly?: string;
  quarterly?: string;
  semiAnnual?: string;
  annual?: string;
}

// Load existing summaries from localStorage
const loadSummaries = (): Summary => {
  const saved = localStorage.getItem('aiSummaries');
  return saved ? JSON.parse(saved) : {};
};

// Save summaries to localStorage
const saveSummaries = (summaries: Summary) => {
  localStorage.setItem('aiSummaries', JSON.stringify(summaries));
};

// Get date ranges
const getDateRanges = () => {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  
  return {
    yesterday,
    weekAgo,
    monthAgo,
    threeMonthsAgo,
    sixMonthsAgo,
    yearAgo,
    today
  };
};

// Filter data by date range
const filterDataByDateRange = (data: RecapData, startDate: Date, endDate: Date) => {
  return {
    journalEntries: data.journalEntries.filter(entry => {
      const date = new Date(entry.date);
      return date >= startDate && date <= endDate;
    }),
    expenses: data.expenses.filter(expense => {
      const date = new Date(expense.date);
      return date >= startDate && date <= endDate;
    }),
    climbingSessions: data.climbingSessions.filter(session => {
      const date = new Date(session.date);
      return date >= startDate && date <= endDate;
    }),
    habits: data.habits.filter(habit => {
      const date = new Date(habit.date);
      return date >= startDate && date <= endDate;
    })
  };
};

// Analyze data for insights
const analyzeData = (data: RecapData) => {
  // Calculate metrics
  const totalSpending = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgDayRating = data.journalEntries.length > 0
    ? data.journalEntries.reduce((sum, e) => sum + (e.dayRating || 0), 0) / data.journalEntries.length
    : 0;
  
  const climbingSessions = data.climbingSessions.length;
  const totalClimbingTime = data.climbingSessions.reduce((sum, s) => sum + s.duration, 0);
  
  const completedHabits = data.habits.filter(h => h.progress >= h.target).length;
  const habitCompletionRate = data.habits.length > 0 
    ? (completedHabits / data.habits.length) * 100 
    : 0;
  
  // Find patterns
  const journalContent = data.journalEntries.map(e => e.content).join(' ');
  const commonThemes = extractThemes(journalContent);
  
  return {
    totalSpending,
    avgDayRating,
    climbingSessions,
    totalClimbingTime,
    habitCompletionRate,
    commonThemes,
    journalCount: data.journalEntries.length
  };
};

// Extract themes from text (simple implementation)
const extractThemes = (text: string): string[] => {
  // In a real implementation, this would use NLP
  const words = text.toLowerCase().split(/\s+/);
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
  const wordFreq: Record<string, number> = {};
  
  words.forEach(word => {
    if (word.length > 4 && !commonWords.includes(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
};

export const generateDailyRecap = async (data: RecapData): Promise<string> => {
  try {
    const dateRanges = getDateRanges();
    const yesterdayData = filterDataByDateRange(data, dateRanges.yesterday, dateRanges.today);
    const weekData = filterDataByDateRange(data, dateRanges.weekAgo, dateRanges.today);
    
    const yesterdayAnalysis = analyzeData(yesterdayData);
    const weekAnalysis = analyzeData(weekData);
    
    // Load existing summaries for context
    const summaries = loadSummaries();
    
    // Build prompt
    const prompt = `
You are Dylan's personal AI assistant. Generate a daily recap based on yesterday's data and patterns from the past week.

Yesterday's Data:
- Spending: $${yesterdayAnalysis.totalSpending.toFixed(2)}
- Day Rating: ${yesterdayData.journalEntries[0]?.dayRating || 'Not rated'}/5
- Climbing: ${yesterdayAnalysis.climbingSessions} sessions (${Math.floor(yesterdayAnalysis.totalClimbingTime / 60)}h ${yesterdayAnalysis.totalClimbingTime % 60}m)
- Habits: ${yesterdayAnalysis.habitCompletionRate.toFixed(0)}% completion rate
- Journal Entry: ${yesterdayData.journalEntries[0]?.content || 'No entry'}

Week Patterns:
- Average Day Rating: ${weekAnalysis.avgDayRating.toFixed(1)}/5
- Total Spending: $${weekAnalysis.totalSpending.toFixed(2)}
- Climbing Sessions: ${weekAnalysis.climbingSessions}
- Habit Consistency: ${weekAnalysis.habitCompletionRate.toFixed(0)}%

${summaries.weekly ? `Last Week's Summary: ${summaries.weekly}` : ''}

Write a personalized, insightful recap that:
1. Highlights yesterday's key moments and achievements
2. Notes any unusual patterns or anomalies
3. Connects yesterday to the broader week's trends
4. Offers a brief, encouraging insight or reflection
5. Mentions any concerning patterns that need attention

Keep it conversational, warm, and under 200 words. Reference specific details to show deep understanding.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a thoughtful, insightful personal AI assistant who knows Dylan deeply through his data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const recap = response.choices[0]?.message?.content || 'Unable to generate recap.';
    
    // Save this daily recap
    const newSummaries = { ...summaries, daily: recap };
    saveSummaries(newSummaries);
    
    // Check if we should generate higher-level summaries
    await checkAndGenerateHigherSummaries(data);
    
    return recap;
  } catch (error) {
    console.error('Error generating daily recap:', error);
    throw error;
  }
};

    // Check and generate weekly, monthly, etc. summaries
const checkAndGenerateHigherSummaries = async (data: RecapData) => {
  const summaries = loadSummaries();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();
  
  // Generate weekly summary on Sundays
  if (dayOfWeek === 0) {
    const lastWeekSummaryDate = localStorage.getItem('lastWeeklySummaryDate');
    const today = now.toISOString().split('T')[0];
    
    if (lastWeekSummaryDate !== today) {
      await generateWeeklySummary(data);
      localStorage.setItem('lastWeeklySummaryDate', today);
    }
  }
  
  // Generate monthly summary on the 1st
  if (dayOfMonth === 1) {
    const lastMonthlySummaryDate = localStorage.getItem('lastMonthlySummaryDate');
    const today = now.toISOString().split('T')[0];
    
    if (lastMonthlySummaryDate !== today) {
      await generateMonthlySummary(data);
      localStorage.setItem('lastMonthlySummaryDate', today);
    }
  }
  
  // Check for quarterly (every 3 months), semi-annual, and annual summaries
  const month = now.getMonth();
  if (dayOfMonth === 1) {
    if (month % 3 === 0) {
      await generateQuarterlySummary(data);
    }
    if (month % 6 === 0) {
      await generateSemiAnnualSummary(data);
    }
    if (month === 0) {
      await generateAnnualSummary(data);
    }
  }
};

// Generate weekly summary from daily summaries
const generateWeeklySummary = async (data: RecapData) => {
  const dateRanges = getDateRanges();
  const weekData = filterDataByDateRange(data, dateRanges.weekAgo, dateRanges.today);
  const weekAnalysis = analyzeData(weekData);
  const summaries = loadSummaries();
  
  const prompt = `
Synthesize this week's daily summaries into a cohesive weekly overview.

Week's Metrics:
- Average Day Rating: ${weekAnalysis.avgDayRating.toFixed(1)}/5
- Total Spending: $${weekAnalysis.totalSpending.toFixed(2)}
- Climbing Sessions: ${weekAnalysis.climbingSessions} (${Math.floor(weekAnalysis.totalClimbingTime / 60)} hours total)
- Habit Consistency: ${weekAnalysis.habitCompletionRate.toFixed(0)}%
- Journal Entries: ${weekAnalysis.journalCount}

Common Themes: ${weekAnalysis.commonThemes.join(', ')}

Recent Daily Summary: ${summaries.daily || 'None available'}

Create a 150-word weekly summary that:
1. Identifies the week's major accomplishments and challenges
2. Notes emotional and physical patterns
3. Highlights progress toward goals
4. Offers one key insight for the coming week

Keep it reflective and growth-oriented.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Dylan\'s AI assistant, creating insightful weekly summaries from his life data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    const weeklySummary = response.choices[0]?.message?.content || '';
    const newSummaries = { ...summaries, weekly: weeklySummary };
    saveSummaries(newSummaries);
  } catch (error) {
    console.error('Error generating weekly summary:', error);
  }
};

// Generate monthly summary from weekly summaries
const generateMonthlySummary = async (data: RecapData) => {
  const dateRanges = getDateRanges();
  const monthData = filterDataByDateRange(data, dateRanges.monthAgo, dateRanges.today);
  const monthAnalysis = analyzeData(monthData);
  const summaries = loadSummaries();
  
  const prompt = `
Create a monthly summary from the week summaries and overall patterns.

Month's Overview:
- Average Day Rating: ${monthAnalysis.avgDayRating.toFixed(1)}/5
- Total Spending: $${monthAnalysis.totalSpending.toFixed(2)}
- Climbing Progress: ${monthAnalysis.climbingSessions} sessions
- Habit Consistency: ${monthAnalysis.habitCompletionRate.toFixed(0)}%

Recent Weekly Summary: ${summaries.weekly || 'None available'}

Write a 200-word monthly reflection that:
1. Captures the month's narrative arc
2. Identifies major growth areas and setbacks
3. Connects patterns to longer-term goals
4. Suggests focus areas for next month

Be analytical yet personal.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Dylan\'s AI assistant, creating comprehensive monthly summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const monthlySummary = response.choices[0]?.message?.content || '';
    const newSummaries = { ...summaries, monthly: monthlySummary };
    saveSummaries(newSummaries);
  } catch (error) {
    console.error('Error generating monthly summary:', error);
  }
};

// Similar functions for quarterly, semi-annual, and annual summaries
const generateQuarterlySummary = async (data: RecapData) => {
  // Implementation similar to monthly but with 3-month range
  console.log('Generating quarterly summary...');
};

const generateSemiAnnualSummary = async (data: RecapData) => {
  // Implementation similar to monthly but with 6-month range
  console.log('Generating semi-annual summary...');
};

const generateAnnualSummary = async (data: RecapData) => {
  // Implementation similar to monthly but with full year range
  console.log('Generating annual summary...');
};

// Get inspirational quote based on current state
export const getInspirationalQuote = async (data: RecapData): Promise<string> => {
  const weekData = filterDataByDateRange(data, getDateRanges().weekAgo, getDateRanges().today);
  const analysis = analyzeData(weekData);
  
  const prompt = `
Based on Dylan's current state:
- Recent mood: ${analysis.avgDayRating.toFixed(1)}/5
- Habit consistency: ${analysis.habitCompletionRate}%
- Recent themes: ${analysis.commonThemes.join(', ')}

Select or create a brief, relevant quote that would resonate with his current situation.
The quote should be encouraging but not generic. Maximum 20 words.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are selecting meaningful quotes for Dylan based on his current life situation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 50,
    });

    return response.choices[0]?.message?.content || 
      "Every day is a fresh start, a new chance to climb higher.";
  } catch (error) {
    console.error('Error getting quote:', error);
    return "Keep climbing, keep growing.";
  }
};

// Export all summary generation functions
export {
  generateWeeklySummary,
  generateMonthlySummary,
  generateQuarterlySummary,
  generateSemiAnnualSummary,
  generateAnnualSummary
};