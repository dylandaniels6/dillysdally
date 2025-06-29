import { JournalEntry, Habit, Expense, ClimbingSession } from '../../../types';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

export interface DayPopupData {
  date: Date;
  journalEntry?: JournalEntry;
  habits?: Habit[];
  expenses?: Expense[];
  climbingSession?: ClimbingSession;
  // Removed the recursive 'data: DayPopupData' property - this was causing infinite recursion
}

export interface SearchResult {
  id: string; // Added missing id property
  type: 'journal' | 'climbing';
  date: string;
  title: string;
  content: string;
  highlightedContent: string;
  data: any;
  score: number; // Added missing score property for search ranking
}

export interface DayData {
  date: Date;
  isCurrentMonth: boolean;
}

// Message interface for chat functionality
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

// Chat session interface
export interface ChatSession {
  id: string;
  date: string;
  messages: Message[];
  created_at?: string;
  updated_at?: string;
}

export const habitNames = {
  hangboard: 'Hangboard',
  coldShower: 'Cold Shower',
  techUsage: 'Tech Usage',
  porn: 'Porn Free',
  climbing: 'Climbing',
  workout: 'Workout',
  meditation: 'Meditation',
  reading: 'Reading',
  eatingOut: 'No Eating Out',
  outreach: 'Outreach'
} as const;

export const habitEmojis = {
  hangboard: '🧗',
  coldShower: '🚿',
  techUsage: '📱',
  porn: '🚫',
  climbing: '🏔️',
  workout: '💪',
  meditation: '🧘',
  reading: '📚',
  eatingOut: '🍽️',
  outreach: '📞'
} as const;

// Fixed the type annotation - was missing the ViewMode key type
export const viewModeLabels: Record<ViewMode, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year'
};

// Type for habit names (useful for type safety)
export type HabitName = keyof typeof habitNames;

// Type for habit emojis (useful for type safety)
export type HabitEmoji = keyof typeof habitEmojis;

// Export type for better type inference
export type HabitNamesType = typeof habitNames;
export type HabitEmojisType = typeof habitEmojis;