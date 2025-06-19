import { JournalEntry, Habit, Expense, ClimbingSession } from '../../../types';
import { formatISODate } from '../../../utils/dateUtils';
import { SearchResult, DayData } from './types';

export const performSearch = (
  searchQuery: string,
  journalEntries: JournalEntry[],
  climbingSessions: ClimbingSession[]
): SearchResult[] => {
  const results: SearchResult[] = [];
  const query = searchQuery.toLowerCase();

  // Search journal entries
  journalEntries.forEach(entry => {
    if (entry.content.toLowerCase().includes(query) || 
        entry.gratitude?.toLowerCase().includes(query)) {
      results.push({
        type: 'journal',
        date: entry.date,
        title: `Journal Entry - ${formatDate(new Date(entry.date))}`,
        content: entry.content,
        highlightedContent: highlightSearchTerm(entry.content, query),
        data: entry
      });
    }
  });

  // Search climbing sessions
  climbingSessions.forEach(session => {
    if (session.location.toLowerCase().includes(query) || 
        session.notes?.toLowerCase().includes(query)) {
      results.push({
        type: 'climbing',
        date: session.date,
        title: `Climbing at ${session.location} - ${formatDate(new Date(session.date))}`,
        content: session.notes || 'No notes',
        highlightedContent: highlightSearchTerm(session.notes || session.location, query),
        data: session
      });
    }
  });

  return results.slice(0, 10);
};

export const highlightSearchTerm = (text: string, term: string): string => {
  const index = text.toLowerCase().indexOf(term);
  if (index === -1) return text.slice(0, 150);
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + term.length + 100);
  
  return text.slice(start, end);
};

export const getDataForDate = (
  date: Date,
  journalEntries: JournalEntry[],
  habits: Habit[],
  expenses: Expense[],
  climbingSessions: ClimbingSession[]
) => {
  const dateStr = formatISODate(date);
  const journalEntry = journalEntries.find(entry => entry.date === dateStr);
  const dayHabits = habits.filter(habit => habit.date === dateStr);
  const dayExpenses = expenses.filter(expense => expense.date === dateStr);
  const climbingSession = climbingSessions.find(session => session.date === dateStr);

  return {
    journalEntry,
    habits: dayHabits,
    expenses: dayExpenses,
    climbingSession,
    hasData: !!(journalEntry || dayHabits.length > 0 || dayExpenses.length > 0 || climbingSession)
  };
};

export const getDaysInMonth = (date: Date): DayData[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: DayData[] = [];

  // Add previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false
    });
  }

  // Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }

 // Add next month days only to complete the current week
  const totalDays = days.length;
  const daysNeededToCompleteWeek = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
  
  for (let i = 1; i <= daysNeededToCompleteWeek; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }

  return days;
};

export const getWeekDays = (date: Date): Date[] => {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day;
  startOfWeek.setDate(diff);

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(startOfWeek);
    weekDay.setDate(startOfWeek.getDate() + i);
    weekDays.push(weekDay);
  }

  return weekDays;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isSelected = (date: Date, selectedDate: Date): boolean => {
  return date.toDateString() === selectedDate.toDateString();
};

export const getMoodEmoji = (mood: string): string => {
  switch (mood) {
    case 'great': return '🤩';
    case 'good': return '😊';
    case 'neutral': return '😐';
    case 'bad': return '😔';
    case 'terrible': return '😫';
    default: return '😐';
  }
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};