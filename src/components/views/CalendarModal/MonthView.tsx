import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../../context/AppContext';
import { getDaysInMonth, getDataForDate, isToday, isSelected } from './utils';

interface MonthViewProps {
  currentDate: Date;
  openDayPopup: (date: Date) => void;
  settings: any;
}

// Define consistent colors for habits
const HABIT_COLORS: { [key: string]: string } = {
  'Hangboard': '#8B5CF6', // Purple
  'Cold Shower': '#3B82F6', // Blue
  'Tech Usage': '#EF4444', // Red
  'Porn Free': '#10B981', // Green
  'Climbing': '#F59E0B', // Amber
};

const MonthView: React.FC<MonthViewProps> = ({ currentDate, openDayPopup, settings }) => {
  const { journalEntries, habits, expenses, climbingSessions, selectedDate } = useAppContext();
  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Function to get sleep emoji from journal entry - exact copy from original
  const getSleepEmoji = (journalEntry: any) => {
    if (!journalEntry || !journalEntry.sleepData || !journalEntry.sleepData.quality) {
      return null;
    }
    return journalEntry.sleepData.quality;
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Week headers */}
      <div className="grid grid-cols-7 mb-4">
        {weekDays.map((day) => (
          <div 
            key={day} 
            className={`text-center text-sm font-medium py-2 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 gap-2">
        {days.map((dayObj, index) => {
          const { date, isCurrentMonth } = dayObj;
          const data = getDataForDate(date, journalEntries, habits, expenses, climbingSessions);
          const today = isToday(date);
          const selected = isSelected(date, selectedDate);
          const hasJournal = !!data.journalEntry;
          const sleepEmoji = hasJournal ? getSleepEmoji(data.journalEntry) : null;
          const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
          
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openDayPopup(date)}
              className={`
                relative rounded-xl p-3 cursor-pointer transition-all min-h-[100px]
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${today ? 'ring-2 ring-purple-500' : ''}
                ${selected ? 'bg-purple-100 dark:bg-purple-900/30' : ''}
                ${settings.darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700' 
                  : 'bg-gray-50 hover:bg-gray-100'
                }
              `}
            >
              {/* Date header */}
              <div className="flex items-center justify-between mb-2">
                {/* Date - left aligned */}
                <span className={`text-sm font-medium ${
                  today 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : settings.darkMode 
                      ? 'text-gray-200' 
                      : 'text-gray-700'
                }`}>
                  {date.getDate()}
                </span>
                
                {/* Sleep emoji with soft glow - right aligned */}
                {hasJournal && sleepEmoji && (
                  <div className="relative">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-lg relative z-10"
                    >
                      {sleepEmoji}
                    </motion.span>
                    {/* Soft glow effect */}
                    <div 
                      className="absolute inset-0 blur-md opacity-40 scale-125"
                      style={{
                        background: `radial-gradient(circle, ${
                          settings.darkMode ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.3)'
                        } 0%, transparent 70%)`
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Journal indicator - subtle gradient */}
              {hasJournal && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute top-0 left-2 right-2 h-[2px] bg-gradient-to-r from-purple-500/50 to-purple-400/50 rounded-full"
                  style={{ transformOrigin: 'center' }}
                />
              )}

              {/* Expense pill */}
              {totalExpenses > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-2"
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    settings.darkMode 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-emerald-500/10 text-emerald-700'
                  }`}>
                    ${totalExpenses < 1000 
                      ? totalExpenses.toFixed(0)
                      : `${(totalExpenses / 1000).toFixed(1)}k`
                    }
                  </span>
                </motion.div>
              )}

              {/* Habit dots - replacing HabitDisplay */}
              <div className="flex flex-wrap gap-1 mt-auto">
                {data.habits
                  .filter(habit => habit.completed)
                  .map((habit, idx) => (
                    <motion.div
                      key={`${habit.habitId}-${idx}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 25,
                        delay: idx * 0.02 
                      }}
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: HABIT_COLORS[habit.name] || '#6B7280'
                      }}
                    />
                  ))}
                {data.climbingSession && (
                  <motion.div
                    key="climbing"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 500, 
                      damping: 25,
                      delay: data.habits.filter(h => h.completed).length * 0.02 
                    }}
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: HABIT_COLORS['Climbing']
                    }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;