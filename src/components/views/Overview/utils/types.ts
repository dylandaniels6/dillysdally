// Chat related types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  date: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

// Task related types
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: number;
  created_at: string;
  completed_at?: string;
  user_id?: string;
}

// Data types from context
export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  dayRating?: number;
  sleepTime?: string;
  wakeTime?: string;
  phoneOffTime?: string;
  sends?: Record<string, number>;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
}

export interface ClimbingSession {
  id: string;
  date: string;
  duration: number;
  location: string;
  routes: Array<{
    grade: string;
    completed: boolean;
    attempts: number;
    notes?: string;
  }>;
}

export interface Habit {
  id: string;
  name: string;
  date: string;
  progress: number;
  target: number;
  unit: string;
  category?: string;
}

// Summary related types
export interface DailySummary {
  date: string;
  content: string;
  metrics: {
    spending: number;
    dayRating: number;
    climbingSessions: number;
    habitCompletion: number;
  };
}

export interface WeeklySummary {
  weekStartDate: string;
  content: string;
  metrics: {
    avgDayRating: number;
    totalSpending: number;
    climbingSessions: number;
    avgHabitCompletion: number;
  };
}

// API configuration
export interface AIConfig {
  provider: 'openai' | 'grok';
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// User data for AI context
export interface UserData {
  journalEntries: JournalEntry[];
  expenses: Expense[];
  climbingSessions: ClimbingSession[];
  habits: Habit[];
}

// Analysis results
export interface DataAnalysis {
  totalSpending: number;
  avgDayRating: number;
  climbingSessions: number;
  totalClimbingTime: number;
  habitCompletionRate: number;
  commonThemes: string[];
  journalCount: number;
}