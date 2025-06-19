import React from 'react';
import { X, Calendar, Edit, Plus, Mountain, BookOpen, Target } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatISODate, formatDate } from '../../utils/dateUtils';

interface DayDetailModalProps {
  date: Date;
  isOpen: boolean;
  onClose: () => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, isOpen, onClose }) => {
  const { 
    journalEntries, 
    habits, 
    climbingSessions, 
    settings,
    setSelectedDate,
    setViewMode
  } = useAppContext();

  if (!isOpen) return null;

  const dateStr = formatISODate(date);
  const dayJournalEntry = journalEntries.find(entry => entry.date === dateStr);
  const dayHabits = habits.filter(habit => habit.date === dateStr);
  const dayClimbingSession = climbingSessions.find(session => session.date === dateStr);

  const navigateToSection = (section: 'journal' | 'habits' | 'climbing') => {
    setSelectedDate(date);
    setViewMode(section);
    onClose();
  };

  const hasAnyData = dayJournalEntry || dayHabits.length > 0 || dayClimbingSession;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className={`rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden ${
        settings.darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                settings.darkMode ? 'bg-blue-600' : 'bg-blue-600'
              }`}>
                <Calendar size={20} className="text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {formatDate(date)}
                </h2>
                <p className={`text-sm ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Day Overview
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                settings.darkMode 
                  ? 'hover:bg-gray-700 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {!hasAnyData ? (
            <div className={`text-center py-12 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No data for this day</p>
              <p className="text-sm mb-6">Start tracking your activities for this date</p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => navigateToSection('journal')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    settings.darkMode 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Plus size={16} />
                  <span>Add Journal</span>
                </button>
                <button
                  onClick={() => navigateToSection('habits')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    settings.darkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Plus size={16} />
                  <span>Track Habits</span>
                </button>
                <button
                  onClick={() => navigateToSection('climbing')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    settings.darkMode 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  <Plus size={16} />
                  <span>Log Climbing</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Journal Entry */}
              {dayJournalEntry && (
                <div className={`p-4 rounded-lg border ${
                  settings.darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <BookOpen size={18} className="text-green-500" />
                      <h3 className={`font-semibold ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Journal Entry
                      </h3>
                    </div>
                    <button
                      onClick={() => navigateToSection('journal')}
                      className={`p-1 rounded transition-colors ${
                        settings.darkMode 
                          ? 'hover:bg-gray-600 text-gray-400' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                  
                  <h4 className={`font-medium mb-2 ${
                    settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {dayJournalEntry.title || 'Untitled Entry'}
                  </h4>
                  
                  <p className={`text-sm line-clamp-3 ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {dayJournalEntry.content}
                  </p>
                  
                  {dayJournalEntry.mood && (
                    <div className="mt-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        dayJournalEntry.mood === 'great' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        dayJournalEntry.mood === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        dayJournalEntry.mood === 'neutral' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                        dayJournalEntry.mood === 'bad' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        Mood: {dayJournalEntry.mood}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Habits */}
              {dayHabits.length > 0 && (
                <div className={`p-4 rounded-lg border ${
                  settings.darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Target size={18} className="text-blue-500" />
                      <h3 className={`font-semibold ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Habits ({dayHabits.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => navigateToSection('habits')}
                      className={`p-1 rounded transition-colors ${
                        settings.darkMode 
                          ? 'hover:bg-gray-600 text-gray-400' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {dayHabits.map(habit => (
                      <div key={habit.id} className="flex items-center justify-between">
                        <span className={`text-sm ${
                          settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {habit.title}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${
                            settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {habit.progress}/{habit.target}
                          </span>
                          <div className={`w-3 h-3 rounded-full ${
                            habit.progress >= habit.target ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Climbing Session */}
              {dayClimbingSession && (
                <div className={`p-4 rounded-lg border ${
                  settings.darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Mountain size={18} className="text-orange-500" />
                      <h3 className={`font-semibold ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Climbing Session
                      </h3>
                    </div>
                    <button
                      onClick={() => navigateToSection('climbing')}
                      className={`p-1 rounded transition-colors ${
                        settings.darkMode 
                          ? 'hover:bg-gray-600 text-gray-400' 
                          : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-sm font-medium ${
                        settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Location:
                      </span>
                      <span className={`text-sm ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {dayClimbingSession.location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm font-medium ${
                        settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Duration:
                      </span>
                      <span className={`text-sm ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {dayClimbingSession.duration} minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm font-medium ${
                        settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Routes:
                      </span>
                      <span className={`text-sm ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {dayClimbingSession.routes.length} routes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm font-medium ${
                        settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Completed:
                      </span>
                      <span className={`text-sm ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {dayClimbingSession.routes.filter(r => r.completed).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className={`p-4 rounded-lg border-2 border-dashed ${
                settings.darkMode ? 'border-gray-600' : 'border-gray-300'
              }`}>
                <h3 className={`font-semibold mb-3 ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {!dayJournalEntry && (
                    <button
                      onClick={() => navigateToSection('journal')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        settings.darkMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      <Plus size={14} />
                      <span>Add Journal</span>
                    </button>
                  )}
                  {dayHabits.length === 0 && (
                    <button
                      onClick={() => navigateToSection('habits')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        settings.darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Plus size={14} />
                      <span>Track Habits</span>
                    </button>
                  )}
                  {!dayClimbingSession && (
                    <button
                      onClick={() => navigateToSection('climbing')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        settings.darkMode 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }`}
                    >
                      <Plus size={14} />
                      <span>Log Climbing</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;