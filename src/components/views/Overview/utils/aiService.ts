import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
});

interface Message {
  content: string;
  role: 'user' | 'assistant';
}

interface UserData {
  journalEntries: any[];
  expenses: any[];
  climbingSessions: any[];
  habits: any[];
}

// Save chat to history
const saveChatToHistory = (messages: Message[]) => {
  const today = new Date().toISOString().split('T')[0];
  const historyKey = 'chatHistory';
  
  const existingHistory = localStorage.getItem(historyKey);
  const history = existingHistory ? JSON.parse(existingHistory) : [];
  
  // Find today's session or create new one
  let todaySession = history.find((session: any) => session.date === today);
  
  if (!todaySession) {
    todaySession = {
      id: Date.now().toString(),
      date: today,
      messages: []
    };
    history.push(todaySession);
  }
  
  // Add messages with timestamps
  const messagesWithTimestamps = messages.map(msg => ({
    ...msg,
    timestamp: new Date().toISOString()
  }));
  
  todaySession.messages.push(...messagesWithTimestamps);
  
  // Keep only last 30 days of history
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const filteredHistory = history.filter((session: any) => 
    new Date(session.date) > thirtyDaysAgo
  );
  
  localStorage.setItem(historyKey, JSON.stringify(filteredHistory));
};

// Get relevant context from user data
const buildContext = (userData: UserData): string => {
  const { journalEntries, expenses, climbingSessions, habits } = userData;
  
  // Get last 7 days of data for context
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentJournals = journalEntries
    .filter(entry => new Date(entry.date) >= sevenDaysAgo)
    .slice(-5);
    
  const recentExpenses = expenses
    .filter(expense => new Date(expense.date) >= sevenDaysAgo);
    
  const recentClimbing = climbingSessions
    .filter(session => new Date(session.date) >= sevenDaysAgo);
    
  const recentHabits = habits
    .filter(habit => new Date(habit.date) >= sevenDaysAgo);
  
  return `
You are Dylan's personal AI assistant with deep knowledge of his life and patterns. 
You have access to his journal entries, climbing sessions, habits, expenses, and overall life data.

Recent Context (Last 7 Days):
- Journal Entries: ${recentJournals.length} entries
- Total Spending: $${recentExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
- Climbing Sessions: ${recentClimbing.length} sessions
- Habit Completion Rate: ${recentHabits.length > 0 ? Math.round((recentHabits.filter(h => h.progress >= h.target).length / recentHabits.length) * 100) : 0}%

Recent Journal Themes: ${recentJournals.map(j => j.content).join(' ').slice(0, 200)}...

Be conversational, insightful, and personal. Reference specific patterns you notice.
Keep responses concise but meaningful. You know Dylan deeply.
`;
};

export const sendChatMessage = async (
  input: string, 
  previousMessages: Message[],
  userData: UserData
): Promise<string> => {
  try {
    // Build conversation history
    const messages = [
      {
        role: 'system' as const,
        content: buildContext(userData)
      },
      ...previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: input
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantMessage = response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    
    // Save to history
    saveChatToHistory([
      { role: 'user', content: input },
      { role: 'assistant', content: assistantMessage }
    ]);
    
    return assistantMessage;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('500')) {
        throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
      }
    }
    
    throw new Error('Failed to get AI response. Please try again.');
  }
};

// For easy swapping to Grok or other providers in the future
export const AI_PROVIDER = 'openai' as const;

// Export function to swap providers
export const setAIProvider = (provider: 'openai' | 'grok') => {
  // Implementation for provider switching
  console.log(`Switching to ${provider}`);
};