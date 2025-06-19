import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  DollarSign, 
  Mountain, 
  Edit, 
  Plus,
  Check,
  Calendar,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { formatISODate } from '../../../utils/dateUtils';
import { getDataForDate, getMoodEmoji } from './utils';
import { habitNames, habitEmojis } from './types';
import { useHabitRingMemory } from '../../views/HabitRingMemory';

interface DayViewProps {
  currentDate: Date;
  onEditJournal: (entry: any) => void;
  onEditClimbing: (session: any) => void;
  settings: any;
}

const DayView: React.FC<DayViewProps> = ({ 
  currentDate, 
  onEditJournal, 
  onEditClimbing, 
  settings 
}) => {
  const { 
    journalEntries, 
    setJournalEntries,
    habits, 
    expenses, 
    climbingSessions,
    selectedDate,
    setSelectedDate
  } = useAppContext();
  
  // IMPORTANT: Set the selected date to match the current view
  React.useEffect(() => {
    if (currentDate.toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(currentDate);
    }
  }, [currentDate, selectedDate, setSelectedDate]);
  
  // Use the exact same habit system as HabitRings
  const { toggleHabit, calculateStreaks } = useHabitRingMemory();
  
  const data = getDataForDate(currentDate, journalEntries, habits, expenses, climbingSessions);
  const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleHabitToggle = (habitKey: string) => {
    // Use the centralized toggle function - this ensures perfect sync
    toggleHabit(habitKey as any, currentDate);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-8 h-full overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Date Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h2 className={`text-3xl font-bold ${
            settings.darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <p className={`text-sm mt-1 ${
            settings.darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {currentDate.toLocaleDateString('en-US', { year: 'numeric' })}
          </p>
        </motion.div>

        {/* Top Row - Habits and Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Habits Card */}
          <motion.div
            variants={itemVariants}
            className={`p-6 rounded-2xl ${
              settings.darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  settings.darkMode ? 'bg-purple-900/30' : 'bg-purple-100'
                }`}>
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className={`text-xl font-semibold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Today's Habits
                </h3>
              </div>
              <div className={`text-sm ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {['hangboard', 'coldShower', 'techUsage', 'porn'].filter(habitKey => {
                  const habitInfo = data.journalEntry?.habitData?.[habitKey];
                  return habitInfo && habitInfo.completed;
                }).length} / 4
              </div>
            </div>
            
            <div className="space-y-3">
              {['hangboard', 'coldShower', 'techUsage', 'porn'].map((habitKey) => {
                const habitName = habitNames[habitKey as keyof typeof habitNames];
                const habitInfo = data.journalEntry?.habitData?.[habitKey];
                const isCompleted = habitInfo?.completed || false;
                
                // Get streak from the SAME calculateStreaks used by HabitRings
                const currentStreak = calculateStreaks[habitKey as keyof typeof calculateStreaks]?.streak || 0;
                
                return (
                  <motion.div
                    key={habitKey}
                    whileHover={{ x: 5 }}
                    onClick={() => handleHabitToggle(habitKey)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={`relative w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-green-500 border-green-500' 
                          : settings.darkMode
                            ? 'border-gray-600 group-hover:border-gray-500'
                            : 'border-gray-300 group-hover:border-gray-400'
                      }`}
                    >
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <Check size={14} className="text-white" />
                        </motion.div>
                      )}
                    </motion.div>
                    
                    <span className={`flex-1 flex items-center gap-2 text-lg transition-all select-none ${
                      isCompleted 
                        ? 'text-green-600 dark:text-green-400 line-through' 
                        : settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span className="text-xl">{habitEmojis[habitKey as keyof typeof habitEmojis]}</span>
                      {habitName}
                    </span>
                    
                    {currentStreak > 0 && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        settings.darkMode 
                          ? 'bg-purple-900/30 text-purple-400' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {currentStreak} day{currentStreak > 1 ? 's' : ''}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Expenses Card */}
          <motion.div
            variants={itemVariants}
            className={`p-6 rounded-2xl ${
              settings.darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  settings.darkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                }`}>
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className={`text-xl font-semibold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Expenses
                </h3>
              </div>
              <span className={`text-2xl font-bold ${
                totalExpenses > 100 ? 'text-red-500' : 'text-green-500'
              }`}>
                ${totalExpenses.toFixed(2)}
              </span>
            </div>
            
            {data.expenses.length > 0 ? (
              <div className="space-y-3">
                {data.expenses.map((expense, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      settings.darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        expense.category === 'food' ? 'bg-orange-500' :
                        expense.category === 'transport' ? 'bg-blue-500' :
                        expense.category === 'entertainment' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`} />
                      <span className={`capitalize ${
                        settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {expense.category}
                      </span>
                    </div>
                    <span className={`font-semibold ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      ${expense.amount.toFixed(2)}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 rounded-lg ${
                settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <DollarSign className={`w-12 h-12 mx-auto mb-3 ${
                  settings.darkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <p className={`${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No expenses recorded
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Climbing Session */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-2xl ${
            settings.darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                settings.darkMode ? 'bg-green-900/30' : 'bg-green-100'
              }`}>
                <Mountain className="w-6 h-6 text-green-600" />
              </div>
              <h3 className={`text-xl font-semibold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Climbing Session
              </h3>
            </div>
            {data.climbingSession ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  try {
                    onEditClimbing(data.climbingSession);
                  } catch (error) {
                    console.error('Error opening climbing editor:', error);
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Edit size={20} />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  try {
                    onEditClimbing(null);
                  } catch (error) {
                    console.error('Error opening climbing editor:', error);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                  bg-green-600 text-white hover:bg-green-700 transition-colors`}
              >
                <Plus size={16} />
                Log Session
              </motion.button>
            )}
          </div>
          
          {data.climbingSession ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className={`text-sm ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Location
                </p>
                <p className={`text-lg font-semibold mt-1 ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {data.climbingSession.location}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Duration
                </p>
                <p className={`text-lg font-semibold mt-1 ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {data.climbingSession.duration} minutes
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Routes Completed
                </p>
                <p className={`text-lg font-semibold mt-1 ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {data.climbingSession.routes?.filter(r => r.completed).length || 0} routes
                </p>
              </div>
              
              {data.climbingSession.notes && (
                <div className="col-span-3 mt-4">
                  <p className={`text-sm ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                  } mb-2`}>
                    Session Notes
                  </p>
                  <p className={`${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {data.climbingSession.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className={`text-center py-12 rounded-lg ${
              settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <Mountain className={`w-12 h-12 mx-auto mb-3 ${
                settings.darkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={`${
                settings.darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No climbing session logged
              </p>
            </div>
          )}
        </motion.div>

        {/* Journal Entry */}
        {data.journalEntry && (
          <motion.div
            variants={itemVariants}
            className={`p-6 rounded-2xl ${
              settings.darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getMoodEmoji(data.journalEntry.mood)}</span>
                <h3 className={`text-xl font-semibold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Journal Entry
                </h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onEditJournal(data.journalEntry)}
                className={`p-2 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Edit size={20} />
              </motion.button>
            </div>
            
            <div className={`prose max-w-none ${
              settings.darkMode ? 'prose-invert' : ''
            }`}>
              <p className="whitespace-pre-wrap">
                {data.journalEntry.content}
              </p>
              
              {data.journalEntry.gratitude && (
                <div className={`mt-6 p-4 rounded-lg ${
                  settings.darkMode ? 'bg-purple-900/20' : 'bg-purple-50'
                }`}>
                  <h4 className={`text-sm font-semibold mb-2 ${
                    settings.darkMode ? 'text-purple-400' : 'text-purple-700'
                  }`}>
                    Gratitude
                  </h4>
                  <p className={`italic ${
                    settings.darkMode ? 'text-purple-300' : 'text-purple-900'
                  }`}>
                    {data.journalEntry.gratitude}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default DayView;