import React from 'react';
import { motion } from 'framer-motion';
import { Mountain, DollarSign } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { getWeekDays, getDataForDate, isToday, getMoodEmoji } from './utils';
import { habitNames, habitEmojis } from './types';

interface WeekViewProps {
  currentDate: Date;
  openDayPopup: (date: Date) => void;
  settings: any;
}

const WeekView: React.FC<WeekViewProps> = ({ currentDate, openDayPopup, settings }) => {
  const { journalEntries, habits, expenses, climbingSessions } = useAppContext();
  
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  
  const days = getWeekDays(startOfWeek);

  const DayCard = ({ date, index, className = "" }: { date: Date; index: number; className?: string }) => {
    const data = getDataForDate(date, journalEntries, habits, expenses, climbingSessions);
    const isCurrentDay = isToday(date);
    const hasJournal = !!data.journalEntry;
    const completedHabits = data.habits.filter(h => h.completed);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    
    return (
      <div
        onClick={() => openDayPopup(date)}
        className={`
          rounded-2xl p-6 cursor-pointer transition-all duration-200 h-full
          ${isCurrentDay ? 'ring-2 ring-purple-500 shadow-xl' : 'shadow-lg hover:shadow-xl'}
          ${settings.darkMode 
            ? 'bg-gray-800 hover:bg-gray-750 hover:brightness-110' 
            : 'bg-white hover:bg-gray-50'
          }
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className={`text-xs font-medium ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
            </div>
            <div className={`text-2xl font-bold ${
              isCurrentDay 
                ? 'text-purple-600 dark:text-purple-400' 
                : settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {date.getDate()}
            </div>
          </div>
          
          {hasJournal && (
            <span className="text-2xl">
              {getMoodEmoji(data.journalEntry.mood)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Journal excerpt */}
          {hasJournal && (
            <div className={`text-sm ${
              settings.darkMode ? 'text-gray-300' : 'text-gray-600'
            } line-clamp-2`}>
              {data.journalEntry.content}
            </div>
          )}

          {/* Habits */}
          {completedHabits.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {completedHabits.slice(0, 4).map((habit, idx) => (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    settings.darkMode 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  <span>{habitEmojis[habit.habitType as keyof typeof habitEmojis]}</span>
                  <span className="font-medium">
                    {habitNames[habit.habitType as keyof typeof habitNames]}
                  </span>
                </div>
              ))}
              {completedHabits.length > 4 && (
                <span className={`text-xs ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  +{completedHabits.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Bottom indicators */}
          <div className="flex items-center gap-3 pt-2">
            {data.climbingSession && (
              <div className="flex items-center gap-1">
                <Mountain size={14} className="text-green-500" />
                <span className={`text-xs ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Climbed
                </span>
              </div>
            )}
            
            {totalExpenses > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign size={14} className="text-blue-500" />
                <span className={`text-xs ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  ${totalExpenses.toFixed(0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full">
      <div className="grid h-full gap-4" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
        {/* Row 1 - 2 days */}
        <div className="grid grid-cols-2 gap-4">
          <DayCard date={days[0]} index={0} />
          <DayCard date={days[1]} index={1} />
        </div>
        
        {/* Row 2 - 2 days */}
        <div className="grid grid-cols-2 gap-4">
          <DayCard date={days[2]} index={2} />
          <DayCard date={days[3]} index={3} />
        </div>
        
        {/* Row 3 - 2 days */}
        <div className="grid grid-cols-2 gap-4">
          <DayCard date={days[4]} index={4} />
          <DayCard date={days[5]} index={5} />
        </div>
        
        {/* Row 4 - 1 day full width */}
        <div>
          <DayCard date={days[6]} index={6} className="h-full" />
        </div>
      </div>
    </div>
  );
};

export default WeekView;