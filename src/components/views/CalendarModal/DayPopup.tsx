import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Calendar, Mountain, DollarSign, Target, ChevronRight } from 'lucide-react';
import { DayPopupData, habitNames, habitEmojis } from './types';
import { formatDate, getMoodEmoji } from './utils';

interface DayPopupProps {
  data: DayPopupData;
  onClose: () => void;
  onViewDay: () => void;
  settings: any;
}

const DayPopup: React.FC<DayPopupProps> = ({ data, onClose, onViewDay, settings }) => {
  const { journalEntry, habits = [], expenses = [], climbingSession } = data;
  const completedHabits = habits.filter(h => h.completed);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const modalContent = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-[61] pointer-events-none`}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`relative w-[90%] max-w-md rounded-2xl shadow-2xl pointer-events-auto ${
            settings.darkMode 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className={`w-5 h-5 ${
                settings.darkMode ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <h3 className={`text-lg font-semibold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {formatDate(data.date)}
              </h3>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                settings.darkMode 
                  ? 'hover:bg-gray-700 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Journal Entry */}
          {journalEntry ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getMoodEmoji(journalEntry.mood)}</span>
                <h4 className={`font-medium ${
                  settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Journal Entry
                </h4>
              </div>
              <p className={`text-sm ${
                settings.darkMode ? 'text-gray-300' : 'text-gray-600'
              } line-clamp-4`}>
                {journalEntry.content}
              </p>
            </motion.div>
          ) : (
            <div className={`text-center py-4 mb-6 rounded-lg ${
              settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No journal entry for this day
              </p>
            </div>
          )}

          {/* Climbing Session */}
          {climbingSession && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={`mb-4 p-3 rounded-lg flex items-center gap-3 ${
                settings.darkMode ? 'bg-green-900/20' : 'bg-green-50'
              }`}
            >
              <Mountain className="text-green-500" size={20} />
              <div className="flex-1">
                <p className={`font-medium ${
                  settings.darkMode ? 'text-green-400' : 'text-green-700'
                }`}>
                  Climbing at {climbingSession.location}
                </p>
                <p className={`text-sm ${
                  settings.darkMode ? 'text-green-500/80' : 'text-green-600'
                }`}>
                  {climbingSession.routes?.filter(r => r.completed).length || 0} routes • {climbingSession.duration} min
                </p>
              </div>
            </motion.div>
          )}

          {/* Habits */}
          {completedHabits.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className={`w-4 h-4 ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <h4 className={`text-sm font-medium ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Completed Habits
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {completedHabits.map((habit, index) => (
  <motion.div
    key={index}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 0.3 + index * 0.05 }}
    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
      settings.darkMode 
        ? 'bg-gray-700 text-gray-300' 
        : 'bg-gray-100 text-gray-700'
    }`}
  >
    <span>{habitEmojis[habit.habitType as keyof typeof habitEmojis]}</span>
    <span>{habitNames[habit.habitType as keyof typeof habitNames]}</span>
  </motion.div>
))}
              </div>
            </motion.div>
          ) : habits.length > 0 && (
            <div className={`text-center py-3 mb-4 rounded-lg ${
              settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No habits completed
              </p>
            </div>
          )}

          {/* Expenses */}
          {expenses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className={`w-4 h-4 ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <h4 className={`text-sm font-medium ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Expenses
                </h4>
              </div>
              <div className={`space-y-2 p-3 rounded-lg ${
                settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                {expenses.slice(0, 3).map((expense, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className={`text-sm capitalize ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {expense.category}
                    </span>
                    <span className={`text-sm font-medium ${
                      settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      ${expense.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {expenses.length > 3 && (
                  <p className={`text-xs ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    +{expenses.length - 3} more
                  </p>
                )}
                <div className={`pt-2 mt-2 border-t ${
                  settings.darkMode ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Total
                    </span>
                    <span className={`font-semibold ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      ${totalExpenses.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* No data message */}
          {!journalEntry && !climbingSession && habits.length === 0 && expenses.length === 0 && (
            <div className="text-center py-12">
              <p className={`text-sm ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No data recorded for this day
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onViewDay}
            className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2
              bg-gradient-to-r from-purple-600 to-pink-600 text-white
              hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg`}
          >
            <span>View Full Day</span>
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </motion.div>
      </div>
    </>
  );

  // Use createPortal to render the modal outside of the parent component's DOM hierarchy
  return createPortal(modalContent, document.body);
};

export default DayPopup;