import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp, Mountain, DollarSign, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useAppContext } from '../../../context/AppContext';
import { Card } from '../../common/Card';

const YesterdayRecap: React.FC = () => {
  const { getToken } = useAuth();
  const { journalEntries, habits, expenses, climbingSessions, isAuthenticated } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Filter data for yesterday
  const yesterdayJournal = journalEntries.find(entry => 
    entry.date === yesterdayStr
  );
  
  const yesterdayHabits = habits.filter(habit => 
    habit.date === yesterdayStr
  );
  
  const yesterdayExpenses = expenses.filter(expense => 
    expense.date === yesterdayStr
  );
  
  const yesterdayClimbing = climbingSessions.find(session => 
    session.date === yesterdayStr
  );
  
  // Calculate metrics
  const yesterdaySpending = yesterdayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const dayRating = yesterdayJournal?.dayRating || 0;
  const completedHabits = yesterdayHabits.filter(habit => habit.progress >= habit.target).length;
  const totalHabits = yesterdayHabits.length;
  
  // Climbing metrics
  const climbingDuration = yesterdayClimbing ? 
    `${Math.floor(yesterdayClimbing.duration / 60)}h ${yesterdayClimbing.duration % 60}m` : 
    '0m';
  const routesCompleted = yesterdayClimbing ? 
    yesterdayClimbing.routes.filter(route => route.completed).length : 
    0;

  // Show authentication prompt if not signed in
  if (!isAuthenticated) {
    return (
      <Card className="w-full" hover={false}>
        <div className="text-center py-8">
          <Calendar className="mx-auto mb-3 text-gray-600" size={32} />
          <h3 className="text-lg font-semibold text-white mb-2">Yesterday's Recap</h3>
          <p className="text-sm text-gray-400 mb-4">
            Sign in to see your yesterday's activities and progress
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            Sign In
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full" hover={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Calendar size={16} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Yesterday</h3>
            <p className="text-sm text-gray-400">
              {yesterday.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronUp size={18} className="text-white/60" />
          ) : (
            <ChevronDown size={18} className="text-white/60" />
          )}
        </button>
      </div>

      {/* Day Rating */}
      <div className="flex items-center justify-between text-sm mb-4">
        <div className="flex items-center gap-2 text-white/70">
          <span>Overall Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <div
                key={star}
                className={`w-4 h-4 ${
                  star <= dayRating 
                    ? 'text-yellow-400' 
                    : 'text-white/20'
                }`}
              >
                ★
              </div>
            ))}
          </div>
          <span className="text-white font-medium ml-2">
            {dayRating > 0 ? `${dayRating}/5` : 'Not rated'}
          </span>
        </div>
      </div>

      <div className="border-t border-white/10 mb-4" />

      {/* Habits Summary */}
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-sm mb-2"
        >
          <div className="flex items-center gap-2 text-white/70">
            <span>Habits</span>
          </div>
          <span className="text-white font-medium">
            {completedHabits}/{totalHabits} completed
          </span>
        </button>
        
        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: totalHabits > 0 ? `${(completedHabits / totalHabits) * 100}%` : '0%' 
            }}
          />
        </div>

        {/* Expanded habits list */}
        <AnimatePresence>
          {isExpanded && yesterdayHabits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {/* Gray contrast section for habit details */}
              <div className="bg-gray-700/30 border border-gray-600/30 rounded-xl p-3 space-y-2">
                {yesterdayHabits.map((habit) => (
                  <div key={habit.id} className="flex items-center gap-2 text-sm">
                    {habit.progress >= habit.target ? (
                      <CheckCircle2 size={14} className="text-green-400" />
                    ) : (
                      <Circle size={14} className="text-white/30" />
                    )}
                    <span className={habit.progress >= habit.target ? 'text-white/70' : 'text-white/40'}>
                      {habit.title}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {habit.progress}/{habit.target}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-white/10 mb-4" />

      {/* Climbing */}
      <div className="flex items-center justify-between text-sm mb-4">
        <div className="flex items-center gap-2 text-white/70">
          <Mountain size={16} />
          <span>Climbing</span>
        </div>
        <span className="text-white font-medium">
          {yesterdayClimbing ? (
            <>
              {climbingDuration} • {routesCompleted} routes
            </>
          ) : (
            <span className="text-white/40">No session</span>
          )}
        </span>
      </div>

      <div className="border-t border-white/10 mb-4" />

      {/* Spending */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-white/70">
          <DollarSign size={16} />
          <span>Spending</span>
        </div>
        <span className="text-white font-medium">
          ${yesterdaySpending.toFixed(2)}
        </span>
      </div>

      {/* Expanded expense details */}
      <AnimatePresence>
        {isExpanded && yesterdayExpenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            {/* Gray contrast section for expense details */}
            <div className="bg-gray-700/30 border border-gray-600/30 rounded-xl p-3 space-y-2">
              {yesterdayExpenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70 truncate">{expense.description}</span>
                  <span className="text-white/60 ml-2">${expense.amount.toFixed(2)}</span>
                </div>
              ))}
              {yesterdayExpenses.length > 5 && (
                <div className="text-xs text-gray-400 text-center pt-1">
                  +{yesterdayExpenses.length - 5} more
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default YesterdayRecap;