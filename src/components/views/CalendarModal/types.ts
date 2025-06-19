import { JournalEntry, Habit, Expense, ClimbingSession } from '../../../types';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

export interface DayPopupData {
  date: Date;
  journalEntry?: JournalEntry;
  habits?: Habit[];
  expenses?: Expense[];
  climbingSession?: ClimbingSession;
  data: DayPopupData;
}

export interface SearchResult {
  type: 'journal' | 'climbing';
  date: string;
  title: string;
  content: string;
  highlightedContent: string;
  data: any;
}

export interface DayData {
  date: Date;
  isCurrentMonth: boolean;
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

export const viewModeLabels: Record<ViewMode, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year'
};