import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, PenTool, Mountain, DollarSign, TrendingUp, Award, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { formatISODate } from '../../../utils/dateUtils';
import { isToday } from './utils';

interface YearViewProps {
  currentDate: Date;
  openDayPopup: (date: Date) => void;
  settings: any;
}

const YearView: React.FC<YearViewProps> = ({ currentDate, openDayPopup, settings }) => {
  const { journalEntries, climbingSessions, expenses } = useAppContext();
  const [activeCategory, setActiveCategory] = useState<'journal' | 'climbing' | 'expenses'>('journal');
  
  /*
   * Data Integration Strategy:
   * - Journal: Word count from journal entries only
   * - Climbing: Only uses ClimbingSessions data (ignores journal climbing data)
   * - Expenses: Sum of all expenses for the date
   */
  
  // Get climbing data only from ClimbingSessions
  const getClimbingDataForDate = (dateStr: string) => {
    const climbingSession = climbingSessions.find(s => s.date === dateStr);
    if (climbingSession) {
      return climbingSession.routes.filter(r => r.completed).length;
    }
    return 0;
  };
  
  // Aggregate expenses data for a date
  const getExpensesForDate = (dateStr: string) => {
    return expenses
      .filter(e => e.date === dateStr)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };
  
  const yearData = useMemo(() => {
    const data: { date: Date; value: number }[] = [];
    
    // Start from exactly 365 days ago
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 364); // 365 days including today
    startDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Start from the beginning of the week (Sunday)
    const startDay = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDay);
    
    // Generate all days from start to today
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatISODate(new Date(d));
      
      let value = 0;
      if (activeCategory === 'journal') {
        const entry = journalEntries.find(e => e.date === dateStr);
        value = entry ? entry.content.split(' ').length : 0;
      } else if (activeCategory === 'climbing') {
        value = getClimbingDataForDate(dateStr);
      } else if (activeCategory === 'expenses') {
        value = getExpensesForDate(dateStr);
      }
      
      data.push({
        date: new Date(d),
        value
      });
    }
    
    return data;
  }, [journalEntries, climbingSessions, expenses, activeCategory]);

  const maxValue = useMemo(() => {
    return Math.max(...yearData.map(d => d.value), 1);
  }, [yearData]);

  const getIntensity = (value: number): number => {
    if (value === 0) return 0;
    const intensity = (value / maxValue) * 4;
    return Math.ceil(intensity);
  };

  const getCellColor = (intensity: number): string => {
    const colors = {
      journal: {
        dark: ['bg-gray-800', 'bg-purple-900/30', 'bg-purple-700/50', 'bg-purple-600/70', 'bg-purple-500'],
        light: ['bg-gray-100', 'bg-purple-200/50', 'bg-purple-300/70', 'bg-purple-400', 'bg-purple-500']
      },
      climbing: {
        dark: ['bg-gray-800', 'bg-blue-900/30', 'bg-blue-700/50', 'bg-blue-600/70', 'bg-blue-500'],
        light: ['bg-gray-100', 'bg-blue-200/50', 'bg-blue-300/70', 'bg-blue-400', 'bg-blue-500']
      },
      expenses: {
        dark: ['bg-gray-800', 'bg-emerald-900/30', 'bg-emerald-700/50', 'bg-emerald-600/70', 'bg-emerald-500'],
        light: ['bg-gray-100', 'bg-emerald-200/50', 'bg-emerald-300/70', 'bg-emerald-400', 'bg-emerald-500']
      }
    };
    
    const colorSet = colors[activeCategory][settings.darkMode ? 'dark' : 'light'];
    return colorSet[intensity] || colorSet[0];
  };

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group data by weeks
  const weeks: { date: Date; value: number }[][] = [];
  let currentWeek: { date: Date; value: number }[] = [];
  
  yearData.forEach((day) => {
    currentWeek.push(day);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Calculate statistics for each category
  const getStats = () => {
    const activeDays = yearData.filter(d => d.value > 0);
    const totalValue = yearData.reduce((sum, d) => sum + d.value, 0);
    const average = activeDays.length > 0 ? Math.round(totalValue / activeDays.length) : 0;
    const maxDay = Math.max(...yearData.map(d => d.value));
    
    if (activeCategory === 'journal') {
      return {
        total: activeDays.length,
        totalValue,
        average,
        max: maxDay,
        unit: 'words',
        totalLabel: 'Total Entries',
        totalValueLabel: 'Total Words',
        averageLabel: 'Avg Words/Entry',
        maxLabel: 'Longest Entry'
      };
    } else if (activeCategory === 'climbing') {
      // Count climbing days only from ClimbingSessions
      const climbingDays = new Set<string>();
      
      climbingSessions.forEach(session => {
        const year = new Date(session.date).getFullYear();
        if (year === currentDate.getFullYear()) {
          climbingDays.add(session.date);
        }
      });
      
      return {
        total: climbingDays.size,
        totalValue,
        average,
        max: maxDay,
        unit: 'routes',
        totalLabel: 'Climbing Days',
        totalValueLabel: 'Total Routes',
        averageLabel: 'Avg Routes/Session',
        maxLabel: 'Best Session'
      };
    } else {
      return {
        total: activeDays.length,
        totalValue,
        average,
        max: maxDay,
        unit: '$',
        totalLabel: 'Days with Expenses',
        totalValueLabel: 'Total Spent',
        averageLabel: 'Avg Daily Spend',
        maxLabel: 'Highest Day'
      };
    }
  };

  const categories = [
    { 
      id: 'journal', 
      icon: PenTool, 
      label: 'Journal',
      color: 'purple'
    },
    { 
      id: 'climbing', 
      icon: Mountain, 
      label: 'Climbing',
      color: 'blue'
    },
    { 
      id: 'expenses', 
      icon: DollarSign, 
      label: 'Expenses',
      color: 'emerald'
    }
  ];

  const stats = getStats();

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = yearData.length - 1; i >= 0; i--) {
      const dayData = yearData[i];
      const dayDate = new Date(dayData.date);
      dayDate.setHours(0, 0, 0, 0);
      
      // Skip future dates
      if (dayDate > today) continue;
      
      // If we haven't started counting and found a day with no activity, continue
      if (streak === 0 && dayData.value === 0) continue;
      
      // If we found activity, increment streak
      if (dayData.value > 0) {
        streak++;
      } else {
        // If we were counting and found no activity, stop
        if (streak > 0) break;
      }
    }
    
    return streak;
  };

  const currentStreak = calculateStreak();

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Category Slider */}
        <div className="mb-8">
          <motion.div 
            className="flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {categories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setActiveCategory(category.id as any)}
                className={`relative px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  activeCategory === category.id
                    ? `${settings.darkMode ? 'text-white' : 'text-white'}`
                    : `${settings.darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {activeCategory === category.id && (
                  <motion.div
                    layoutId="activeCategory"
                    className={`absolute inset-0 rounded-2xl ${
                      category.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                      category.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    }`}
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <category.icon size={18} />
                  {category.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
          
          <motion.p 
            className={`text-sm mt-4 text-center ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {categories.find(c => c.id === activeCategory)?.label} contributions in the last year
          </motion.p>
        </div>

        {/* Stats Cards */}
        <div 
          key={activeCategory}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          {/* Primary Stat Card */}
          <div
            className={`p-6 rounded-3xl backdrop-blur-lg ${
              settings.darkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } shadow-xl border ${
              settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            } transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                activeCategory === 'journal' ? 'bg-purple-500/20' :
                activeCategory === 'climbing' ? 'bg-blue-500/20' :
                'bg-emerald-500/20'
              }`}>
                <Calendar className={`w-6 h-6 ${
                  activeCategory === 'journal' ? 'text-purple-500' :
                  activeCategory === 'climbing' ? 'text-blue-500' :
                  'text-emerald-500'
                }`} />
              </div>
              <div 
                className={`text-xs px-3 py-1 rounded-full ${
                  settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                {Math.round((stats.total / 365) * 100)}% of days
              </div>
            </div>
            <h3 
              className={`text-4xl font-bold mb-2 ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {stats.total}
            </h3>
            <p className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {stats.totalLabel}
            </p>
          </div>

          {/* Secondary Stat Card */}
          <div
            className={`p-6 rounded-3xl backdrop-blur-lg ${
              settings.darkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } shadow-xl border ${
              settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            } transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                activeCategory === 'journal' ? 'bg-purple-500/20' :
                activeCategory === 'climbing' ? 'bg-blue-500/20' :
                'bg-emerald-500/20'
              }`}>
                <TrendingUp className={`w-6 h-6 ${
                  activeCategory === 'journal' ? 'text-purple-500' :
                  activeCategory === 'climbing' ? 'text-blue-500' :
                  'text-emerald-500'
                }`} />
              </div>
              <div 
                className={`flex items-center gap-1 text-xs ${
                  currentStreak > 0 && activeCategory === 'journal' ? 'text-purple-500' : 'text-gray-400'
                }`}
              >
                {activeCategory === 'journal' && (
                  <span>🔥 {currentStreak}d streak</span>
                )}
              </div>
            </div>
            <h3 
              className={`text-4xl font-bold mb-2 ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {activeCategory === 'expenses' && '$'}
              {stats.totalValue.toLocaleString()}
            </h3>
            <p className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {stats.totalValueLabel}
            </p>
          </div>

          {/* Tertiary Stat Card */}
          <div
            className={`p-6 rounded-3xl backdrop-blur-lg ${
              settings.darkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } shadow-xl border ${
              settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            } transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                activeCategory === 'journal' ? 'bg-purple-500/20' :
                activeCategory === 'climbing' ? 'bg-blue-500/20' :
                'bg-emerald-500/20'
              }`}>
                <Target className={`w-6 h-6 ${
                  activeCategory === 'journal' ? 'text-purple-500' :
                  activeCategory === 'climbing' ? 'text-blue-500' :
                  'text-emerald-500'
                }`} />
              </div>
              <Award className={`w-5 h-5 ${
                activeCategory === 'journal' ? 'text-purple-400' :
                activeCategory === 'climbing' ? 'text-blue-400' :
                'text-emerald-400'
              }`} />
            </div>
            <h3 
              className={`text-4xl font-bold mb-2 ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {activeCategory === 'expenses' && '$'}
              {stats.average}
            </h3>
            <p className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {stats.averageLabel}
            </p>
          </div>

          {/* Fourth Stat Card - Best Day */}
          <div
            className={`p-6 rounded-3xl backdrop-blur-lg ${
              settings.darkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } shadow-xl border ${
              settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            } transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                activeCategory === 'journal' ? 'bg-purple-500/20' :
                activeCategory === 'climbing' ? 'bg-blue-500/20' :
                'bg-emerald-500/20'
              }`}>
                <Award className={`w-6 h-6 ${
                  activeCategory === 'journal' ? 'text-purple-500' :
                  activeCategory === 'climbing' ? 'text-blue-500' :
                  'text-emerald-500'
                }`} />
              </div>
              <div 
                className={`text-xs px-3 py-1 rounded-full ${
                  activeCategory === 'journal' ? 'bg-purple-500/20' :
                  activeCategory === 'climbing' ? 'bg-blue-500/20' :
                  'bg-emerald-500/20'
                }`}
              >
                Peak Day
              </div>
            </div>
            <h3 
              className={`text-4xl font-bold mb-2 ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {activeCategory === 'expenses' && '$'}
              {stats.max.toLocaleString()}
            </h3>
            <p className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {stats.maxLabel}
            </p>
          </div>
        </div>

        {/* Contribution Graph */}
        <div 
          className={`p-8 rounded-3xl backdrop-blur-lg ${
            settings.darkMode ? 'bg-gray-800/50' : 'bg-white/80'
          } shadow-xl border ${
            settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
          } transition-all duration-300`}
        >
          {/* Month labels */}
          <div className="flex mb-3 relative">
            {(() => {
              const monthPositions: Map<string, number> = new Map();
              
              // Go through each week and record where each month starts
              weeks.forEach((week, weekIndex) => {
                // Check the first valid date in this week
                const firstDateInWeek = week.find(day => day.date)?.date;
                if (firstDateInWeek) {
                  const monthKey = `${firstDateInWeek.getFullYear()}-${firstDateInWeek.getMonth()}`;
                  const monthName = firstDateInWeek.toLocaleDateString('en-US', { month: 'short' });
                  
                  // Only record the first occurrence of each month
                  if (!monthPositions.has(monthKey)) {
                    monthPositions.set(monthKey, weekIndex);
                  }
                }
              });
              
              // Convert to array and render each month
              const monthLabels: Array<{key: string, name: string, position: number}> = [];
              monthPositions.forEach((position, key) => {
                const [year, month] = key.split('-');
                const date = new Date(parseInt(year), parseInt(month));
                const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                monthLabels.push({ key, name: monthName, position });
              });
              
              // Sort by position
              monthLabels.sort((a, b) => a.position - b.position);
              
              return monthLabels.map((label) => {
                // Calculate the left position: day labels offset + (week index * week width)
                const leftPosition = 48 + (label.position * 16);
                
                return (
                  <div 
                    key={label.key} 
                    className={`text-xs font-medium ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    style={{ 
                      position: 'absolute',
                      left: `${leftPosition}px`
                    }}
                  >
                    {label.name}
                  </div>
                );
              });
            })()}
          </div>
          
          <div className="flex gap-1 mt-8">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-2">
              {dayLabels.map((day, index) => (
                <div 
                  key={day} 
                  className={`text-xs h-3 flex items-center justify-end w-10 ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {index % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>
            
            {/* Contribution cells */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => {
                    if (day.value === -1) {
                      return <div key={dayIndex} className="w-3 h-3" />;
                    }
                    
                    const intensity = getIntensity(day.value);
                    const isCurrentDay = isToday(day.date);
                    
                    return (
                      <div
                        key={dayIndex}
                        onClick={() => openDayPopup(day.date)}
                        className={`w-3 h-3 rounded-sm cursor-pointer relative group transition-transform duration-150 hover:scale-[1.4] hover:z-10 ${
                          getCellColor(intensity)
                        } ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        {/* Tooltip */}
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap hidden group-hover:block pointer-events-none z-20 ${
                          settings.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'
                        } shadow-xl`}>
                          <div className="font-semibold">
                            {day.date.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="mt-1">
                            {day.value > 0 ? (
                              <span>
                                {activeCategory === 'expenses' && '$'}
                                {day.value.toLocaleString()} {stats.unit}
                              </span>
                            ) : (
                              `No ${activeCategory} activity`
                            )}
                          </div>
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-2 mt-8 justify-end text-xs">
            <span className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Less
            </span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((intensity) => (
                <div
                  key={intensity}
                  className={`w-3 h-3 rounded-sm ${getCellColor(intensity)}`}
                />
              ))} 
            </div>
            <span className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'}>
              More
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearView;