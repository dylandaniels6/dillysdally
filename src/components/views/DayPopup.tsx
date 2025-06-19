import React from 'react';
import { X, Edit3, Mountain, Target, DollarSign, Calendar } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatISODate, formatDate } from '../../utils/dateUtils';

interface DayPopupData {
  date: Date;
  journalEntry?: JournalEntry;
  habits?: Habit[];
  expenses?: Expense[];
  climbingSession?: ClimbingSession;
}

interface DayPopupProps {
  data: DayPopupData | null;
  onClose: () => void;
  onEditJournal?: (entry: any) => void;
}

const DayPopup: React.FC<DayPopupProps> = ({ data, onClose, onEditJournal }) => {
  const { settings, journalEntries, habits, climbingSessions, expenses } = useAppContext();

  if (!data) return null;

  const dateKey = formatISODate(data.date);
  
  // Get actual data for this date
  const journalEntry = journalEntries.find(entry => entry.date === dateKey);
  const dayHabits = habits.filter(habit => 
    habit.completedDates && habit.completedDates.includes(dateKey)
  );
  const dayExpenses = expenses.filter(expense => expense.date === dateKey);
  const climbingSession = climbingSessions.find(session => session.date === dateKey);

  const formatDateLong = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMoodEmoji = (mood: string) => {
    const moodMap: { [key: string]: string } = {
      'great': '🤩',
      'good': '😊',
      'neutral': '😐',
      'bad': '😔',
      'terrible': '😫'
    };
    return moodMap[mood] || '😐';
  };

  const getHabitIcon = (category: string) => {
    const iconMap: { [key: string]: any } = {
      'health': Target,
      'productivity': Calendar,
      'fitness': Mountain,
      'personal': Target
    };
    const Icon = iconMap[category] || Target;
    return <Icon size={16} />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`relative max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-3xl shadow-2xl ${
          settings.darkMode ? 'bg-gray-900' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 px-6 py-4 border-b ${
          settings.darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
        } rounded-t-3xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {formatDateLong(data.date)}
              </h2>
              <p className={`text-sm ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Day overview
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                settings.darkMode 
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Journal Entry */}
          <div className={`rounded-2xl p-4 ${
            settings.darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Edit3 className={settings.darkMode ? 'text-blue-400' : 'text-blue-600'} size={18} />
                <h3 className={`font-semibold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Journal Entry
                </h3>
              </div>
              {journalEntry && onEditJournal && (
                <button
                  onClick={() => onEditJournal(journalEntry)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    settings.darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Edit
                </button>
              )}
            </div>
            
            {journalEntry ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getMoodEmoji(journalEntry.mood || 'neutral')}</span>
                  <span className={`font-medium capitalize ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {journalEntry.mood || 'No mood set'}
                  </span>
                </div>
                
                {journalEntry.title && (
                  <h4 className={`font-semibold ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {journalEntry.title}
                  </h4>
                )}
                
                <p className={`text-sm leading-relaxed ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {journalEntry.content.length > 200 
                    ? `${journalEntry.content.substring(0, 200)}...` 
                    : journalEntry.content}
                </p>
              </div>
            ) : (
              <p className={`text-sm italic ${
                settings.darkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                No journal entry for this day
              </p>
            )}
          </div>

          {/* Climbing Session */}
          {climbingSession && (
            <div className={`rounded-2xl p-4 ${
              settings.darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Mountain className={settings.darkMode ? 'text-green-400' : 'text-green-600'} size={18} />
                <h3 className={`font-semibold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Climbing Session
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className={`text-xs uppercase tracking-wide font-medium ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Location
                  </p>
                  <p className={`font-medium ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {climbingSession.location || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wide font-medium ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Duration
                  </p>
                  <p className={`font-medium ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {climbingSession.duration || 'Not specified'}
                  </p>
                </div>
              </div>

              {climbingSession.routes && climbingSession.routes.length > 0 && (
                <div>
                  <p className={`text-xs uppercase tracking-wide font-medium mb-2 ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Routes Climbed ({climbingSession.routes.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {climbingSession.routes.slice(0, 5).map((route: any, index: number) => (
                      <span
                        key={index}
                        className={`px-3 py-1 text-xs rounded-full font-medium ${
                          settings.darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {route.grade} {route.type}
                      </span>
                    ))}
                    {climbingSession.routes.length > 5 && (
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        settings.darkMode 
                          ? 'bg-gray-700 text-gray-400' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        +{climbingSession.routes.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Habits */}
          {dayHabits.length > 0 && (
            <div className={`rounded-2xl p-4 ${
              settings.darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Target className={settings.darkMode ? 'text-purple-400' : 'text-purple-600'} size={18} />
                <h3 className={`font-semibold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Completed Habits ({dayHabits.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {dayHabits.map((habit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`p-1 rounded-full ${
                      settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {getHabitIcon(habit.category)}
                    </div>
                    <span className={`font-medium ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {habit.name}
                    </span>
                    <div className="ml-auto">
                      <span className="text-green-500">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expenses */}
          {dayExpenses.length > 0 && (
            <div className={`rounded-2xl p-4 ${
              settings.darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className={settings.darkMode ? 'text-red-400' : 'text-red-600'} size={18} />
                  <h3 className={`font-semibold ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Expenses ({dayExpenses.length})
                  </h3>
                </div>
                <span className={`font-bold ${
                  settings.darkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  ${dayExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0).toFixed(2)}
                </span>
              </div>
              
              <div className="space-y-2">
                {dayExpenses.slice(0, 3).map((expense, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {expense.description || 'No description'}
                      </p>
                      <p className={`text-xs ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {expense.category || 'Uncategorized'}
                      </p>
                    </div>
                    <span className={`font-semibold ${
                      settings.darkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      ${expense.amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                ))}
                {dayExpenses.length > 3 && (
                  <p className={`text-xs text-center pt-2 ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    +{dayExpenses.length - 3} more expenses
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!journalEntry && !climbingSession && dayHabits.length === 0 && dayExpenses.length === 0 && (
            <div className={`text-center py-8 rounded-2xl ${
              settings.darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <Calendar className={`mx-auto mb-3 ${
                settings.darkMode ? 'text-gray-600' : 'text-gray-400'
              }`} size={48} />
              <p className={`text-lg font-medium mb-2 ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No data for this day
              </p>
              <p className={`text-sm ${
                settings.darkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Start logging your activities to see them here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayPopup;