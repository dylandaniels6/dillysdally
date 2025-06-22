import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatISODate } from '../../utils/dateUtils';
import { Flame } from 'lucide-react';

// Types
interface HabitData {
 hangboard: { completed: boolean; streak: number };
 coldShower: { completed: boolean; streak: number };
 techUsage: { completed: boolean; streak: number };
 porn: { completed: boolean; streak: number };
}

interface HabitConfig {
 id: keyof HabitData;
 label: string;
 // REMOVED: isReverse property
}

interface CalculatedHabitData {
 completed: boolean;
 streak: number;
 lastCompletedDate?: string;
}

interface DailyEntry {
 id: string;
 date: string;
 habitData?: HabitData;
 [key: string]: any;
}

// Configuration for all habits - UPDATED: Removed isReverse
const HABIT_CONFIGS: HabitConfig[] = [
 { id: 'hangboard', label: 'Hangboard' },
 { id: 'coldShower', label: 'Cold Shower' },
 { id: 'techUsage', label: 'Happy w/ Tech' },
 { id: 'porn', label: 'Porn Free' } // UPDATED: Changed label to be clearer
];

// Helper function to get default habit data
const getDefaultHabitData = (): HabitData => ({
 hangboard: { completed: false, streak: 0 },
 coldShower: { completed: false, streak: 0 },
 techUsage: { completed: false, streak: 0 },
 porn: { completed: false, streak: 0 } // All habits default to false
});

// Helper function to migrate existing habit data
const migrateHabitData = (habitData: any): HabitData => {
  const defaults = getDefaultHabitData();
  
  // If habitData exists, preserve the values but ensure proper structure
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
       habitData: migrateHabitData(entry.habitData) // Migrate old data
     }))
     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

   if (sortedEntries.length === 0) {
     return habitStreaks;
   }

   const today = formatISODate(new Date());
   const selectedDateStr = formatISODate(selectedDate);

   // For each habit, calculate the streak from selectedDate backwards
   HABIT_CONFIGS.forEach(({ id }) => {
     let streak = 0;
     let checkingDate = new Date(selectedDate);
     let foundSelectedDate = false;
     let selectedDayCompleted = false;

     // Check if selected date has completion
     const selectedEntry = sortedEntries.find(entry => entry.date === selectedDateStr);
     if (selectedEntry?.habitData?.[id]) {
       const habitInfo = selectedEntry.habitData[id];
       // SIMPLIFIED: All habits work the same - completed = true means success
       selectedDayCompleted = habitInfo.completed;
       foundSelectedDate = true;
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
           // No data for this date = streak broken
           break;
         }

         const habitInfo = entry.habitData[id];
         // SIMPLIFIED: Same logic for all habits
         const isCompleted = habitInfo.completed;
         
         if (isCompleted) {
           streak++;
           checkingDate.setDate(checkingDate.getDate() - 1);
         } else {
           // Streak broken
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

     // Toggle the habit - same for all habits
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

// Progress Ring Component
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
 const strokeWidth = 10;
 const normalizedRadius = radius - strokeWidth * 2;
 const circumference = normalizedRadius * 2 * Math.PI;
 const strokeDashoffset = circumference - (progress / 100) * circumference;

 return (
   <div 
     className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
     onClick={onClick}
   >
     <div className="relative">
       <svg height={radius * 2} width={radius * 2}>
         <circle
           stroke={settings?.darkMode ? '#374151' : '#E5E7EB'}
           fill="transparent"
           strokeWidth={strokeWidth}
           r={normalizedRadius}
           cx={radius}
           cy={radius}
         />
         <circle
           stroke={progress > 0 ? "url(#gradient)" : "transparent"}
           fill="transparent"
           strokeWidth={strokeWidth}
           strokeDasharray={circumference + ' ' + circumference}
           style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
           r={normalizedRadius}
           cx={radius}
           cy={radius}
           transform={`rotate(-90 ${radius} ${radius})`}
         />
         <defs>
           <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor="#3B82F6" />
             <stop offset="100%" stopColor="#8B5CF6" />
           </linearGradient>
         </defs>
       </svg>
       <div className="absolute inset-0 flex flex-col items-center justify-center">
         {streak > 0 && (
           <>
             <Flame size={24} className="text-orange-500 mb-1" />
             <span className="text-lg font-bold text-white">{streak}</span>
           </>
         )}
       </div>
     </div>
     <div className="text-center mt-2">
       <div className={`text-sm font-medium ${settings?.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
         {label}
       </div>
       <div className={`text-xs ${settings?.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
         {/* SIMPLIFIED: All habits show the same - Yes when completed, No when not */}
         {progress > 0 ? 'Yes' : 'No'}
       </div>
     </div>
   </div>
 );
};

// Main Habit Rings Component
interface HabitRingsProps {
 className?: string;
}

export const HabitRings: React.FC<HabitRingsProps> = ({ className = '' }) => {
 const { settings } = useAppContext();
 const { calculateStreaks, toggleHabit, getHabitDataForDate, habitConfigs } = useHabitRingMemory();

 return (
   <div className={`p-6 rounded-2xl ${
     settings.darkMode 
       ? 'bg-gray-800 border border-gray-700' 
       : 'bg-white border border-gray-200 shadow-sm'
   } ${className}`}>
     <h3 className={`text-lg font-semibold mb-6 ${
       settings.darkMode ? 'text-white' : 'text-gray-900'
     }`}>
       Daily Habits
     </h3>
     <div className="flex justify-around">
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