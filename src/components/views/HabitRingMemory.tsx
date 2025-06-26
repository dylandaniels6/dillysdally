import React, { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatISODate } from '../../utils/dateUtils';
import { designSystem } from '../../utils/designSystem';

// Types
interface HabitData {
  hangboard: { completed: boolean; streak: number };
  coldShower: { completed: boolean; streak: number };
  techUsage: { completed: boolean; streak: number };
  porn: { completed: boolean; streak: number };
}

interface CalculatedHabitData {
  completed: boolean;
  streak: number;
  lastCompletedDate?: string;
}

interface HabitConfig {
  id: keyof HabitData;
  label: string;
}

interface DailyEntry {
  id: string;
  date: string;
  habitData?: HabitData;
  [key: string]: any;
}

// Configuration for all habits
const HABIT_CONFIGS: HabitConfig[] = [
  { id: 'hangboard', label: 'Hangboard' },
  { id: 'coldShower', label: 'Cold Shower' },
  { id: 'techUsage', label: 'Happy w/ Tech' },
  { id: 'porn', label: 'Porn Free' }
];

// Helper function to get default habit data
const getDefaultHabitData = (): HabitData => ({
  hangboard: { completed: false, streak: 0 },
  coldShower: { completed: false, streak: 0 },
  techUsage: { completed: false, streak: 0 },
  porn: { completed: false, streak: 0 }
});

// Helper function to migrate existing habit data
const migrateHabitData = (habitData: any): HabitData => {
  const defaults = getDefaultHabitData();
  
  if (habitData) {
    return {
      hangboard: habitData.hangboard || defaults.hangboard,
      coldShower: habitData.coldShower || defaults.coldShower,
      techUsage: habitData.techUsage || defaults.techUsage,
      porn: habitData.porn || defaults.porn
    };
  }
  
  return defaults;
};

// Main Hook for Habit Management
export const useHabitRingMemory = () => {
  const { journalEntries, setJournalEntries, selectedDate } = useAppContext();

  // Calculate streaks dynamically for all habits across all days
  const calculateStreaks = useMemo(() => {
    const habitStreaks: Record<keyof HabitData, CalculatedHabitData> = {
      hangboard: { completed: false, streak: 0 },
      coldShower: { completed: false, streak: 0 },
      techUsage: { completed: false, streak: 0 },
      porn: { completed: false, streak: 0 }
    };

    // Sort entries by date (newest first) and migrate any old data
    const sortedEntries = [...journalEntries]
      .filter(entry => entry.habitData)
      .map(entry => ({
        ...entry,
        habitData: migrateHabitData(entry.habitData)
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedEntries.length === 0) {
      return habitStreaks;
    }

    const selectedDateStr = formatISODate(selectedDate);

    // For each habit, calculate the streak from selectedDate backwards
    HABIT_CONFIGS.forEach(({ id }) => {
      let streak = 0;
      let checkingDate = new Date(selectedDate);
      let selectedDayCompleted = false;

      // Check if selected date has completion
      const selectedEntry = sortedEntries.find(entry => entry.date === selectedDateStr);
      if (selectedEntry?.habitData?.[id]) {
        const habitInfo = selectedEntry.habitData[id];
        selectedDayCompleted = habitInfo.completed;
      }

      // If selected date is completed, count backwards for streak
      if (selectedDayCompleted) {
        streak = 1;
        checkingDate.setDate(checkingDate.getDate() - 1);

        // Count backwards from selected date
        while (true) {
          const checkDateStr = formatISODate(checkingDate);
          const entry = sortedEntries.find(e => e.date === checkDateStr);
          
          if (!entry?.habitData?.[id]) {
            break;
          }

          const habitInfo = entry.habitData[id];
          const isCompleted = habitInfo.completed;
          
          if (isCompleted) {
            streak++;
            checkingDate.setDate(checkingDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      habitStreaks[id] = {
        completed: selectedDayCompleted,
        streak: streak,
        lastCompletedDate: selectedDayCompleted ? selectedDateStr : undefined
      };
    });

    return habitStreaks;
  }, [journalEntries, selectedDate]);

  // Toggle habit completion for a specific date
  const toggleHabit = (habitId: keyof HabitData, date?: Date) => {
    const targetDate = date || selectedDate;
    const dateStr = formatISODate(targetDate);
    
    // Find or create journal entry for this date
    const existingEntryIndex = journalEntries.findIndex(entry => entry.date === dateStr);
    
    if (existingEntryIndex >= 0) {
      // Update existing entry
      const updatedEntries = [...journalEntries];
      const entry = updatedEntries[existingEntryIndex];
      
      // Initialize habitData if it doesn't exist
      if (!entry.habitData) {
        entry.habitData = getDefaultHabitData();
      }
      
      // Ensure the specific habit exists in habitData
      if (!entry.habitData[habitId]) {
        entry.habitData[habitId] = { completed: false, streak: 0 };
      }

      // Toggle the habit
      const currentCompleted = entry.habitData[habitId].completed;
      entry.habitData[habitId].completed = !currentCompleted;
      
      setJournalEntries(updatedEntries);
    } else {
      // Create new entry with habit data
      const newEntry: DailyEntry = {
        id: Date.now().toString(),
        date: dateStr,
        title: targetDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        content: '',
        mood: 'neutral',
        tags: [],
        habitData: getDefaultHabitData()
      };

      // Toggle the specific habit that was clicked
      newEntry.habitData![habitId].completed = true;
      
      setJournalEntries([...journalEntries, newEntry]);
    }
  };

  // Get habit data for a specific date
  const getHabitDataForDate = (date: Date) => {
    const dateStr = formatISODate(date);
    const entry = journalEntries.find(entry => entry.date === dateStr);
    
    if (!entry?.habitData) {
      return getDefaultHabitData();
    }

    return migrateHabitData(entry.habitData);
  };

  return {
    calculateStreaks,
    toggleHabit,
    getHabitDataForDate,
    habitConfigs: HABIT_CONFIGS
  };
};

// Professional Progress Ring Component
interface ProgressRingProps {
  progress: number;
  label: string;
  streak: number;
  habitId: keyof HabitData;
  onClick?: () => void;
  settings?: any;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  label,
  streak,
  habitId,
  onClick,
  settings
}) => {
  const radius = 60;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const isCompleted = progress > 0;

  return (
    <div 
      className={designSystem.utils.cn(
        'flex flex-col items-center cursor-pointer transition-all duration-300',
        'hover:scale-105 active:scale-95 group'
      )}
      onClick={onClick}
    >
      {/* Ring Container */}
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          {/* Background Circle */}
          <circle
            stroke="rgba(255, 255, 255, 0.1)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-colors duration-300"
          />
          
          {/* Progress Circle */}
          <circle
            stroke={isCompleted ? "url(#habitGradient)" : "transparent"}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ 
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
          
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="habitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#C4B5FD" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isCompleted ? (
            <>
              {streak > 0 && (
                <>
                  <Flame size={20} className="text-orange-400 mb-1" />
                  <span className={designSystem.typography.body.lg + ' font-bold text-white'}>
                    {streak}
                  </span>
                </>
              )}
              {streak === 0 && (
                <div className="w-3 h-3 bg-purple-400 rounded-full" />
              )}
            </>
          ) : (
            <div className="w-3 h-3 bg-white/20 rounded-full" />
          )}
        </div>
      </div>
      
      {/* Label */}
      <div className="text-center mt-3 space-y-1">
        <div className={designSystem.typography.body.sm + ' font-medium text-white/80 group-hover:text-white transition-colors'}>
          {label}
        </div>
        <div className={designSystem.typography.body.xs + ' text-white/50'}>
          {isCompleted ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
  );
};

// Main Professional Habit Rings Component
interface HabitRingsProps {
  className?: string;
}

export const HabitRings: React.FC<HabitRingsProps> = ({ className = '' }) => {
  const { settings } = useAppContext();
  const { calculateStreaks, toggleHabit, getHabitDataForDate, habitConfigs } = useHabitRingMemory();

  return (
    <div className={designSystem.utils.cn('w-full', className)}>
      {/* Grid Layout for Habits */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
        {habitConfigs.map((config) => {
          const streakData = calculateStreaks[config.id];
          const progress = streakData.completed ? 100 : 0;
          
          return (
            <ProgressRing
              key={config.id}
              progress={progress}
              label={config.label}
              streak={streakData.streak}
              habitId={config.id}
              onClick={() => toggleHabit(config.id)}
              settings={settings}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HabitRings;