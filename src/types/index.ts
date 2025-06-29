// Core application types
export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  target: number;
  progress: number;
  createdAt: string;
  color?: string;
  icon?: string;
  completed: boolean[];
  completed_history?: boolean[];
  date?: string;
  streak?: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags: string[];
  ai_reflection?: string | null;
  context_data?: any | null;
  
  // Extended fields for unified journal
  habits?: {
    [habitId: string]: {
      completed: boolean;
      streak: number;
    }
  };
  
  // Sleep tracking
  sleepData?: {
    phoneOff: string;
    wakeUp: string;
    quality: '😫' | '😔' | '😐' | '😊' | '🤩' | null;
  };
  
  // Meal tracking
  meals?: Array<{
    id: string;
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late';
    time: string;
    description: string;
    macros?: {
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
      fiber?: number;
    };
    aiAnalysis?: string;
  }>;
  
  // Legacy fields from current DailyJournal (to maintain compatibility)
  wakeTime?: string;
  sleepTime?: string;
  dayRating?: number;
  miles?: number;
  climbed?: boolean;
  gym?: string;
  sessionNotes?: string;
  sends?: { V6: number; V7: number; V8: number; V9: number; V10: number };
}

// Extend the JournalEntry for daily entries
export interface DailyEntry extends JournalEntry {
  // All fields inherited from JournalEntry
}

export interface ClimbingSession {
  id: string;
  date: string;
  location: string;
  duration: number;
  routes: ClimbingRoute[];
  notes: string;
  user_id?: string;
}

export interface ClimbingRoute {
  id: string;
  name: string;
  grade: string;
  type: 'boulder' | 'sport' | 'trad' | 'top-rope' | 'kilter';
  attempts: number;
  completed: boolean;
  notes: string;
  climbType?: 'gym' | 'kilter';
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  isRecurring?: boolean;
  tags?: string[];
}

export interface Income {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

export interface NetWorthEntry {
  id: string;
  date: string;
  assets: number;
  liabilities: number;
  cashAccounts: number;
  investments?: number;
  realEstate?: number;
  notes?: string;
  cashEquivalents?: number;
  creditCards?: number;
}

export interface AIAnalysisSummary {
  id: string;
  created_at: string;
  user_id: string;
  period_start: string;
  period_end: string;
  summary_type: 'weekly' | 'monthly' | 'yearly' | 'patterns';
  content: string;
  metadata: any;
}

export interface DataImport {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'json';
  uploadDate: string;
  status: 'processing' | 'completed' | 'error';
  itemsImported: {
    journalEntries: number;
    habits: number;
    climbingSessions: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
  errors?: string[];
}

export type ViewMode = 'overview' | 'journal' | 'habits' | 'climbing' | 'expenses' | 'networth' | 'settings';

// Food database types for meal tracking
export interface Food {
  id: string;
  name: string;
  brand?: string;
  restaurant?: string;
  barcode?: string;
  
  // Per serving
  servingSize: string;
  servingGrams: number;
  
  // Macros
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  
  // Micros (optional)
  sodium?: number;
  cholesterol?: number;
  vitamins?: Record<string, number>;
  
  // Meta
  verified: boolean;
  source: 'usda' | 'restaurant' | 'user' | 'ai';
}

export interface MealEntry {
  id: string;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late';
  foods: Array<{
    foodId: string;
    food: Food;
    quantity: number;
    unit: string;
    customizations?: string;
  }>;
  quickText?: string;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

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
  user_id: string;
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