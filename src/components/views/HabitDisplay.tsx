import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatISODate } from '../../utils/dateUtils';

interface HabitDisplayProps {
  date: Date;
  className?: string;
  maxHabits?: number;
  showMoreIndicator?: boolean;
}

const HabitDisplay: React.FC<HabitDisplayProps> = ({ 
  date, 
  className = '', 
  maxHabits = 4,
  showMoreIndicator = true 
}) => {
  const { journalEntries, habits, settings } = useAppContext();

  // Get habit emoji mapping
  const getHabitEmoji = (habitType: string): string => {
    const emojiMap: { [key: string]: string } = {
      hangboard: '🧗',
      coldShower: '🚿',
      techUsage: '📱',
      porn: '🚫',
      climbing: '🏔️',
      workout: '💪',
      meditation: '🧘',
      reading: '📚',
      eatingOut: '🍽️',
      outreach: '📞',
    };
    return emojiMap[habitType] || '✅';
  };

  // Get habit display name
  const getHabitName = (habitType: string): string => {
    const nameMap: { [key: string]: string } = {
      hangboard: 'Hangboard',
      coldShower: 'Cold Shower',
      techUsage: 'Tech Usage',
      porn: 'Porn Free',
      climbing: 'Climbing',
      workout: 'Workout',
      meditation: 'Meditation',
      reading: 'Reading',
      eatingOut: 'No Eating Out',
      outreach: 'Outreach',
    };
    return nameMap[habitType] || habitType.charAt(0).toUpperCase() + habitType.slice(1);
  };

  // Get habits for this specific date from BOTH habit systems
  const getHabitsForDate = (date: Date) => {
    const dateStr = formatISODate(date);
    const completedHabits = [];

    // SYSTEM 1: Check standalone habits from HabitTracker
    const dayHabits = habits.filter(habit => habit.date === dateStr && habit.completed);
    dayHabits.forEach(habit => {
      completedHabits.push({
        id: habit.id,
        type: habit.title.toLowerCase().replace(/\s+/g, ''),
        name: habit.title,
        emoji: getHabitEmoji(habit.title.toLowerCase().replace(/\s+/g, '')),
        completed: true
      });
    });

    // SYSTEM 2: Check embedded habits from DailyJournal
    const journalEntry = journalEntries.find(entry => entry.date === dateStr);
    if (journalEntry && journalEntry.habitData) {
      const habitData = journalEntry.habitData;

      // Check each habit type in journal habitData
      Object.entries(habitData).forEach(([habitType, habitInfo]: [string, any]) => {
        if (habitInfo && habitInfo.completed) {
          // SIMPLIFIED: All habits work the same - completed = true means success
          completedHabits.push({
            id: `${dateStr}-${habitType}`,
            type: habitType,
            name: getHabitName(habitType),
            emoji: getHabitEmoji(habitType),
            completed: true
          });
        }
      });
    }

    return completedHabits;
  };

  const completedHabits = getHabitsForDate(date);
  
  // Don't render anything if no completed habits
  if (completedHabits.length === 0) {
    return null;
  }

  // Determine how many habits to show
  const habitsToShow = completedHabits.slice(0, maxHabits);
  const remainingCount = Math.max(0, completedHabits.length - maxHabits);

  return (
    <div className={`space-y-0.5 pointer-events-none ${className}`}>
      {habitsToShow.map((habit, index) => (
        <div 
          key={habit.id || index}
          className={`text-[9px] font-medium line-through truncate transition-colors duration-200 text-white`}
          title={`✓ ${habit.name} - Completed`}
        >
          <span className="inline-flex items-center gap-0.5">
            <span className="text-[8px]">✓</span>
            <span className="text-[8px]">{habit.emoji}</span>
            <span className="truncate">{habit.name}</span>
          </span>
        </div>
      ))}
      
      {/* Show "+X more" indicator if there are more habits and showMoreIndicator is true */}
      {showMoreIndicator && remainingCount > 0 && (
        <div 
          className={`text-[8px] font-medium opacity-75 ${
            settings.darkMode 
              ? 'text-gray-400' 
              : 'text-gray-600'
          }`}
          title={`${remainingCount} more completed habit${remainingCount === 1 ? '' : 's'}`}
        >
          +{remainingCount} more
        </div>
      )}
    </div>
  );
};

export default HabitDisplay;