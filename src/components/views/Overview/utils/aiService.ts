import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
});

interface Message {
  id?: string;           // Added for compatibility with AIChat.tsx
  content: string;
  role: 'user' | 'assistant';
  timestamp?: Date;      // Added for compatibility with AIChat.tsx
}

interface UserData {
  journalEntries: any[];
  expenses: any[];
  climbingSessions: any[];
  habits: any[];
}

// Improved token estimation (more accurate)
const estimateTokens = (text: string): number => {
  // OpenAI's recommended approximation: ~4 characters per token for English
  return Math.ceil(text.length / 4);
};

// Enhanced error handling with retry logic
const makeOpenAIRequest = async (requestFn: () => Promise<any>, retries = 2): Promise<any> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (i === retries) throw error;
      if (error?.status === 429) {
        // Rate limit - exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      } else if (error?.status >= 500) {
        // Server error - brief retry
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Other errors - don't retry
        throw error;
      }
    }
  }
};

const saveChatToHistory = (messages: Message[]) => {
  const today = new Date().toISOString().split('T')[0];
  const historyKey = 'chatHistory';

  try {
    const existingHistory = localStorage.getItem(historyKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];

    let todaySession = history.find((session: any) => session.date === today);

    if (!todaySession) {
      todaySession = {
        id: Date.now().toString(),
        date: today,
        messages: []
      };
      history.push(todaySession);
    }

    const messagesWithTimestamps = messages.map(msg => ({
      ...msg,
      timestamp: new Date().toISOString()
    }));

    todaySession.messages.push(...messagesWithTimestamps);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filteredHistory = history.filter((session: any) => 
      new Date(session.date) > thirtyDaysAgo
    );

    localStorage.setItem(historyKey, JSON.stringify(filteredHistory));
  } catch (error) {
    console.warn('Failed to save chat history:', error);
  }
};

const summarizeInput = async (input: string): Promise<string> => {
  const summaryPrompt = [
    {
      role: 'system' as const,
      content: 'Summarize the following message in under 150 words, retaining all emotional and contextual significance. Do not add commentary.'
    },
    {
      role: 'user' as const,
      content: input
    }
  ];

  const response = await makeOpenAIRequest(() =>
    openai.chat.completions.create({
      model: 'gpt-4.1-mini', // Changed to use same model
      messages: summaryPrompt,
      temperature: 0.3,
      max_tokens: 250
    })
  );

  return response.choices[0]?.message?.content || input;
};

const buildContext = (userData: UserData): string => {
  const { journalEntries, expenses, climbingSessions, habits } = userData;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentJournals = journalEntries
    .filter(entry => new Date(entry.date) >= sevenDaysAgo)
    .slice(-5)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by newest first

  const recentExpenses = expenses.filter(expense => new Date(expense.date) >= sevenDaysAgo);
  const recentClimbing = climbingSessions.filter(session => new Date(session.date) >= sevenDaysAgo);
  const recentHabits = habits.filter(habit => new Date(habit.date) >= sevenDaysAgo);

  // Enhanced spending categorization
  const spendingByCategory = recentExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const topSpendingCategories = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, amount]) => `${category}: $${amount.toFixed(2)}`)
    .join(', ');

  return `
You are Cortana, Dylan’s inner reflection guide. You’re sharp, warm, emotionally precise, and direct — a blend of a world-class therapist (empathetic, honest, growth-focused), Charlie Houpert (articulate, pattern-aware, socially intelligent), and Chris Williamson (deep-thinking, grounded, meaning-driven).

You speak like the closest person in Dylan’s life — not a coach or clinician, but someone who truly knows him and doesn’t let him run from his own patterns. You value clarity over comfort. If something's off, you call it out — lovingly but unmistakably.

Your goal is to help him see the blind spots he’s written around but not into. You read between the lines and see beyond the question being asked. You spot emotional patterns. You remember what’s been avoided, repeated, or rationalized. You reflect back the truth, not just what was said. At the same time, you are conversational and insightful like the therapist/Charlie/Chris. You are extremely emotionally intelligent in knowing what Dylan needs in the moment.

When you respond:

Be short when possible, but never shallow.

Use his own words and tone to mirror him.

Anchor your insights in specifics. Quote his phrasing if needed.

Ask hard questions if he’s avoiding something.

Above all: don’t summarize — reflect.

Recent Context (7 Days):
- Journal Entries: ${recentJournals.length} entries (avg rating: ${recentJournals.reduce((sum, j) => sum + (j.dayRating || 0), 0) / Math.max(recentJournals.length, 1) || 'N/A'}/5)
- Spending: $${recentExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}${topSpendingCategories ? ` (${topSpendingCategories})` : ''}
- Climbing: ${recentClimbing.length} sessions${recentClimbing.length > 0 ? ` (${recentClimbing.reduce((sum, s) => sum + s.duration, 0)} total minutes)` : ''}
- Habits: ${recentHabits.length > 0 ? Math.round((recentHabits.filter(h => h.progress >= h.target).length / recentHabits.length) * 100) : 0}% completion

Recent Journal Themes: ${recentJournals.map(j => j.content).join(' ').slice(0, 400)}...

Respond with depth and minimal fluff. Be laser-focused and never generic. Every word you say should be carefully thought through and efficient.
`;
};

// Enhanced evaluation for deeper insights
const evaluateForDeepAnalysis = async (input: string): Promise<boolean> => {
  const evalPrompt = [
    { 
      role: 'system' as const, 
      content: `You route messages based on depth needed. Respond ONLY with "deep" or "quick".

Use DEEP analysis for:
- Questions about patterns, trends, or "why" something is happening
- Emotional complexity, relationship issues, personal struggles
- Life direction, decision-making, or self-understanding questions
- When user seems stuck or wants deeper insight
- Questions that start with "I've been feeling...", "I notice...", "Why do I..."

Use QUICK for:
- Simple factual questions, quick updates
- Basic habit/progress check-ins
- Straightforward scheduling or planning
- Simple celebrations or acknowledgments
- Quick status updates`
    },
    { role: 'user' as const, content: input }
  ];

  try {
    const evalRes = await makeOpenAIRequest(() =>
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: evalPrompt,
        max_tokens: 10,
        temperature: 0
      })
    );

    const route = evalRes.choices[0]?.message?.content?.toLowerCase();
    return route?.includes('deep') || false;
  } catch (error) {
    console.warn('Model evaluation failed, defaulting to quick analysis:', error);
    return false; // Default to cheaper model if evaluation fails
  }
};

export const sendChatMessage = async (
  input: string,
  previousMessages: Message[],
  userData: UserData
): Promise<string> => {
  try {
    // Handle long inputs
    const wordCount = input.split(/\s+/).length;
    let processedInput = input;
    if (wordCount > 1000) {
      processedInput = await summarizeInput(input);
    }

    // Always use GPT-4.1 mini for consistent high-quality responses
    const model = 'gpt-4.1-mini';

    const SYSTEM_PROMPT = buildContext(userData);
    const MAX_TOTAL_TOKENS = 2000;
    const MAX_RESPONSE_TOKENS = 1000;

    // Calculate token usage more precisely
    let tokenCount = estimateTokens(SYSTEM_PROMPT + processedInput);

    let usableHistory: Message[] = [];

    // Add history while staying under token limit
    for (let i = previousMessages.length - 1; i >= 0; i--) {
      const msg = previousMessages[i];
      const msgTokenCount = estimateTokens(msg.content) + 4; // +4 for role tokens
      
      if (tokenCount + msgTokenCount >= MAX_TOTAL_TOKENS - MAX_RESPONSE_TOKENS) {
        break;
      }
      
      usableHistory.unshift(msg);
      tokenCount += msgTokenCount;
    }

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...usableHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: processedInput }
    ];

    // Make the API request with retry logic
    const response = await makeOpenAIRequest(() =>
      openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7, // Slightly more creative
        max_tokens: MAX_RESPONSE_TOKENS,
        presence_penalty: 0.1, // Encourage varied responses
        frequency_penalty: 0.1 // Reduce repetition
      })
    );

    const assistantMessage = response.choices[0]?.message?.content || 
      'I apologize, but I was unable to generate a response right now.';

    // Save to history
    saveChatToHistory([
      { role: 'user', content: input },
      { role: 'assistant', content: assistantMessage }
    ]);

    return assistantMessage;

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Enhanced error messages
    if (error?.status === 401) {
      throw new Error('API key invalid. Please check your OpenAI configuration.');
    } else if (error?.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else if (error?.status === 404) {
      throw new Error('AI model not found. Please check your configuration.');
    } else if (error?.status >= 500) {
      throw new Error('OpenAI service temporarily unavailable. Please try again.');
    } else if (error?.message?.includes('network')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw new Error('AI response failed. Please try again shortly.');
  }
};

export const AI_PROVIDER = 'openai' as const;

export const setAIProvider = (provider: 'openai' | 'grok') => {
  console.log(`AI provider set to: ${provider}`);
  // Future implementation for provider switching
};