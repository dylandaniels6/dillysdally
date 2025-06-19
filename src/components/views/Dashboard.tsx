import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatISODate, getPreviousDays, formatShortDate, isSameDay } from '../../utils/dateUtils';
import { Calendar, TrendingUp, BarChart, Mountain } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';

const Dashboard: React.FC = () => {
  const { 
    habits, 
    journalEntries, 
    climbingSessions, 
    selectedDate,
    setSelectedDate,
    setViewMode,
    settings 
  } = useAppContext();
  
  // Climbing progress state - matches the climbing tab
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | '6months' | 'year' | 'all'>('month');
  
  const last7Days = getPreviousDays(7);
  const today = new Date();
  const todayFormatted = formatISODate(today);
  
  // Filter for today's data
  const todayHabits = habits.filter(habit => habit.frequency === 'daily');
  const todayJournalEntry = journalEntries.find(entry => 
    entry.date === formatISODate(selectedDate)
  );
  const todayClimbingSession = climbingSessions.find(session => 
    session.date === formatISODate(selectedDate)
  );

  // Calculate streak (consecutive days with completed habits)
  const calculateStreak = () => {
    let streak = 0;
    const sortedDates = [...journalEntries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    if (sortedDates.length === 0) return 0;
    
    const checkDate = new Date();
    
    if (sortedDates[0].date === todayFormatted) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      checkDate.setDate(checkDate.getDate());
    }
    
    for (let i = streak > 0 ? 1 : 0; i < sortedDates.length; i++) {
      const entryDate = new Date(sortedDates[i].date);
      if (
        entryDate.getDate() === checkDate.getDate() &&
        entryDate.getMonth() === checkDate.getMonth() &&
        entryDate.getFullYear() === checkDate.getFullYear()
      ) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Climbing data calculation - exactly matching GradeSendsChart logic
  const timeRangeOptions = [
    { key: 'week' as const, label: '7d', days: 7 },
    { key: 'month' as const, label: '30d', days: 30 },
    { key: '6months' as const, label: '6M', days: 180 },
    { key: 'year' as const, label: '1Y', days: 365 },
    { key: 'all' as const, label: 'All', days: null },
  ];

  const accountCreationDate = useMemo(() => {
    const allDates = [
      ...climbingSessions.map(s => new Date(s.date)),
      ...journalEntries.map(e => new Date(e.date))
    ].filter(date => !isNaN(date.getTime()));
    
    return allDates.length > 0 
      ? new Date(Math.min(...allDates.map(d => d.getTime())))
      : new Date('2020-01-01');
  }, [climbingSessions, journalEntries]);

  const dateRange = useMemo(() => {
    const endDate = new Date();
    let startDate: Date;
    const selectedOption = timeRangeOptions.find(opt => opt.key === selectedTimeRange);
    if (selectedTimeRange === 'all') {
      startDate = accountCreationDate;
    } else {
      startDate = new Date();
      startDate.setDate(endDate.getDate() - (selectedOption?.days || 30));
    }
    
    return { startDate, endDate };
  }, [selectedTimeRange, accountCreationDate]);

  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      V6: 0, V7: 0, V8: 0, V9: 0, V10: 0,
    };

    const allEntries = [...climbingSessions, ...journalEntries];

    allEntries.forEach(entry => {
      const date = new Date(entry.date);
      if (date >= dateRange.startDate && date <= dateRange.endDate) {
        if (entry.routes) {
          entry.routes.forEach(r => {
            if (r.completed && counts[r.grade] !== undefined) {
              counts[r.grade] += 1;
            }
          });
        } else if (entry.sends) {
          Object.entries(entry.sends).forEach(([grade, count]) => {
            if (counts[grade] !== undefined) {
              counts[grade] += count;
            }
          });
        }
      }
    });

    return Object.entries(counts).map(([grade, value]) => ({ grade, value }));
  }, [climbingSessions, journalEntries, selectedTimeRange, dateRange]);

  const totalSends = gradeCounts.reduce((sum, g) => sum + g.value, 0);
  const activeDays = useMemo(() => {
    const uniqueDates = new Set();
    const allEntries = [...climbingSessions, ...journalEntries];
    
    allEntries.forEach(entry => {
      const date = new Date(entry.date);
      if (date >= dateRange.startDate && date <= dateRange.endDate) {
        if ((entry.routes && entry.routes.some(r => r.completed)) || 
            (entry.sends && Object.values(entry.sends).some(count => count > 0))) {
          uniqueDates.add(formatISODate(date));
        }
      }
    });
    
    return uniqueDates.size;
  }, [climbingSessions, journalEntries, selectedTimeRange, dateRange]);

  const maxCount = Math.max(...gradeCounts.map(g => g.value), 10);
  const roundedMax = Math.ceil(maxCount / 10) * 10;
  const gradientId = 'dashboardBarGradient';

  const navigateToSection = (section: 'habits' | 'journal' | 'climbing') => {
    setViewMode(section);
  };

  const selectDay = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Overview</h2>
      <p className="text-gray-600 dark:text-gray-400">Your daily progress and insights</p>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => navigateToSection('journal')}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Journal Streak</p>
              <p className="text-2xl font-bold mt-1">{calculateStreak()} days</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {calculateStreak() > 0 
              ? `Keep it up! You're building a great habit.` 
              : `Start journaling today to build your streak!`}
          </div>
        </div>
        
        <div 
          onClick={() => navigateToSection('habits')}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Habit Completion</p>
              <p className="text-2xl font-bold mt-1">
                {todayHabits.filter(h => h.progress >= h.target).length}/{todayHabits.length}
              </p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {todayHabits.filter(h => h.progress >= h.target).length === todayHabits.length
              ? 'All habits completed today!'
              : `${todayHabits.filter(h => h.progress >= h.target).length} of ${todayHabits.length} habits completed`}
          </div>
        </div>
        
        <div 
          onClick={() => navigateToSection('journal')}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Day Rating</p>
              <p className="text-2xl font-bold mt-1">
                {todayJournalEntry?.mood || 'Not rated'}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <BarChart size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {todayJournalEntry 
              ? `Today's mood` 
              : `No journal entry for today yet`}
          </div>
        </div>
        
        <div 
          onClick={() => navigateToSection('climbing')}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Worth</p>
              <p className="text-2xl font-bold mt-1">$0</p>
            </div>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Mountain size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Total value
          </div>
        </div>
      </div>
      
      {/* Weekly Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-all">
        <h3 className="text-lg font-semibold mb-4">Weekly Overview</h3>
        <div className="grid grid-cols-7 gap-2">
          {last7Days.map((date, index) => {
            const dateFormatted = formatISODate(date);
            const hasJournalEntry = journalEntries.some(entry => entry.date === dateFormatted);
            const hasClimbingSession = climbingSessions.some(session => session.date === dateFormatted);
            const completedHabits = habits.filter(h => {
              const dayIndex = 6 - index;
              return h.completed && h.completed[dayIndex];
            }).length;
            
            return (
              <div 
                key={index} 
                onClick={() => selectDay(date)}
                className={`text-center py-3 px-1 rounded-lg cursor-pointer transition-colors ${
                  isSameDay(date, selectedDate) 
                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                    : 'bg-gray-100 dark:bg-gray-700/30 hover:bg-gray-200 dark:hover:bg-gray-600/30'
                }`}
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {index === 6 ? 'Today' : formatShortDate(date)}
                </p>
                <div className="my-2 flex justify-center gap-1">
                  {hasJournalEntry && (
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  )}
                  {hasClimbingSession && (
                    <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                  )}
                </div>
                <p className="text-xs font-medium">
                  {completedHabits}/{habits.length}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Journal Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
            <span>Climbing Session</span>
          </div>
        </div>
      </div>
      
      {/* Bottom Row: Journal Preview and Climbing Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Journal Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-all">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Today's Journal</h3>
            <button 
              onClick={() => navigateToSection('journal')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {todayJournalEntry ? 'Edit Entry' : 'Add Entry'}
            </button>
          </div>
          
          {todayJournalEntry ? (
            <div>
              <h4 className="font-medium text-lg">{todayJournalEntry.title}</h4>
              <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-3">
                {todayJournalEntry.content}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {todayJournalEntry.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No journal entry for today yet.</p>
              <button 
                onClick={() => navigateToSection('journal')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Create Entry
              </button>
            </div>
          )}
        </div>

        {/* Climbing Progress - NEW BAR CHART */}
        <div className={`p-6 rounded-lg ${settings.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Mountain size={20} className="text-orange-500" />
              <h3 className={`text-lg font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                Climbing Progress
              </h3>
            </div>
            <div className={`flex rounded-lg p-1 ${settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {timeRangeOptions.map(option => (
                <button
                  key={option.key}
                  onClick={() => setSelectedTimeRange(option.key)}
                  className={`px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                    selectedTimeRange === option.key
                      ? settings.darkMode
                        ? 'bg-gray-600 text-white shadow-sm'
                        : 'bg-white text-gray-900 shadow-sm'
                      : settings.darkMode
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <RechartsBarChart
                data={gradeCounts}
                margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                barCategoryGap={32}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={settings.darkMode ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="grade" stroke={settings.darkMode ? '#D1D5DB' : '#374151'} />
                <YAxis domain={[0, roundedMax]} stroke={settings.darkMode ? '#D1D5DB' : '#374151'} tickCount={6} />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  animationDuration={500}
                  animationEasing="ease-out"
                  isAnimationActive={true}
                >
                  {gradeCounts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#${gradientId})`}
                      style={{
                        transition: 'all 0.2s ease-in-out',
                        transformOrigin: 'bottom center',
                        cursor: entry.value > 0 ? 'pointer' : 'default'
                      }}
                    />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalSends}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Sends
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {activeDays}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Active Days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;