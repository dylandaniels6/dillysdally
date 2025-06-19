import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Calendar, DollarSign, TrendingUp, Target, Mountain, BookOpen } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';

type TimeRange = 'day' | 'week' | 'month' | '6months' | 'year' | 'all';

interface ClimbingData {
  date: string;
  V6: number;
  V7: number;
  V8: number;
  V9: number;
  V10: number;
  total: number;
}

const Overview: React.FC = () => {
  const { 
    journalEntries, 
    expenses, 
    netWorthEntries, 
    settings,
    habits,
    climbingSessions,
    setCurrentView,
    user
  } = useAppContext();

  const [selectedTimeRange, setSelectedTimeRange] = React.useState<TimeRange>('month');

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Get today's journal entry
  const todayEntry = journalEntries.find(entry => entry.date === today);

  // Calculate this month's expenses
  const monthlyExpenses = expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    })
    .reduce((total, expense) => total + expense.amount, 0);

  // Get latest net worth - FIXED to handle both old and new formats and calculate cash net worth
  const latestNetWorth = netWorthEntries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Calculate cash net worth (cash equivalents - credit cards) - handles both formats
  const cashNetWorth = latestNetWorth ? 
    (latestNetWorth.cashEquivalents || latestNetWorth.cashAccounts || 0) - 
    (latestNetWorth.creditCards || latestNetWorth.liabilities || 0) : 0;

  // Calculate total net worth for reference (but we'll display cash net worth)
  const totalAssetValue = latestNetWorth && latestNetWorth.assets ? 
    (Array.isArray(latestNetWorth.assets) ? 
      latestNetWorth.assets.filter(asset => asset.isActive).reduce((sum, asset) => sum + asset.value, 0) : 
      latestNetWorth.assets) : 0;
  const totalNetWorth = cashNetWorth + totalAssetValue;

  // Calculate habit completion rate
  const todayHabits = habits.filter(h => h.date === today);
  const completedHabits = todayHabits.filter(h => h.progress >= h.target).length;
  const habitCompletionRate = todayHabits.length > 0 
    ? Math.round((completedHabits / todayHabits.length) * 100)
    : 0;

  // Time range options
  const timeRangeOptions = [
    { key: 'day' as TimeRange, label: '1d', days: 1 },
    { key: 'week' as TimeRange, label: '7d', days: 7 },
    { key: 'month' as TimeRange, label: '30d', days: 30 },
    { key: '6months' as TimeRange, label: '6M', days: 180 },
    { key: 'year' as TimeRange, label: '1Y', days: 365 },
    { key: 'all' as TimeRange, label: 'All', days: null }
  ];

  // Get account creation date for "All Time" view
  const accountCreationDate = React.useMemo(() => {
    const allDates = [
      ...climbingSessions.map(s => new Date(s.date)),
      ...journalEntries.map(e => new Date(e.date))
    ].filter(date => !isNaN(date.getTime()));
    
    return allDates.length > 0 
      ? new Date(Math.min(...allDates.map(d => d.getTime())))
      : new Date('2020-01-01');
  }, [climbingSessions, journalEntries]);

  // Calculate date range for climbing data
  const dateRange = React.useMemo(() => {
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

  // Calculate climbing progress data
  const climbingData = React.useMemo((): ClimbingData[] => {
    const grades = ['V6', 'V7', 'V8', 'V9', 'V10'];
    const data = grades.map(grade => ({ grade, count: 0 }));

    // Get all entries in date range
    const allEntries = [...climbingSessions, ...journalEntries];
    
    allEntries.forEach(entry => {
      const date = new Date(entry.date);
      if (date >= dateRange.startDate && date <= dateRange.endDate) {
        // Handle climbing sessions format
        if (entry.routes) {
          entry.routes.forEach(route => {
            if (route.completed && grades.includes(route.grade)) {
              const gradeData = data.find(d => d.grade === route.grade);
              if (gradeData) gradeData.count += 1;
            }
          });
        }
        // Handle journal entry sends format
        else if (entry.sends) {
          Object.entries(entry.sends).forEach(([grade, count]) => {
            if (grades.includes(grade)) {
              const gradeData = data.find(d => d.grade === grade);
              if (gradeData) gradeData.count += count;
            }
          });
        }
      }
    });

    return data.map(({ grade, count }) => ({
      date: '',
      V6: grade === 'V6' ? count : 0,
      V7: grade === 'V7' ? count : 0,
      V8: grade === 'V8' ? count : 0,
      V9: grade === 'V9' ? count : 0,
      V10: grade === 'V10' ? count : 0,
      total: count
    }));
  }, [climbingSessions, journalEntries, dateRange]);

  // Calculate total sends
  const totalSends = climbingData.reduce((sum, entry) => sum + entry.total, 0);

  // Generate chart data for visualization
  const chartData = React.useMemo(() => {
    const grades = ['V6', 'V7', 'V8', 'V9', 'V10'];
    return grades.map(grade => {
      const gradeEntry = climbingData.find(d => d[grade as keyof ClimbingData] > 0);
      return {
        grade,
        value: gradeEntry ? gradeEntry[grade as keyof ClimbingData] as number : 0
      };
    });
  }, [climbingData]);

  const maxCount = Math.max(...chartData.map(g => g.value), 10);
  const roundedMax = Math.ceil(maxCount / 10) * 10;

  // StatCard component definition
  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    onClick?: () => void;
  }> = ({ title, value, icon, color, subtitle, onClick }) => (
    <div 
      className={`p-6 rounded-2xl transition-all duration-200 hover:scale-105 cursor-pointer ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
      <h3 className={`text-sm font-medium mb-1 ${
        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {title}
      </h3>
      <p className={`text-2xl font-semibold ${
        settings.darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-sm mt-1 ${
          settings.darkMode ? 'text-gray-500' : 'text-gray-500'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-3xl font-bold mb-2 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Overview
        </h1>
        <p className={`text-lg ${
          settings.darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Your daily progress and insights
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Habits"
          value={`${habitCompletionRate}%`}
          icon={<Target className="text-white" size={20} />}
          color="bg-blue-500"
          subtitle="Completion rate"
          onClick={() => setCurrentView('habits')}
        />
        
        <StatCard
          title="Day Rating"
          value={todayEntry ? `${todayEntry.dayRating}/5` : 'Not rated'}
          icon={<Calendar className="text-white" size={20} />}
          color="bg-green-500"
          subtitle="Today's mood"
          onClick={() => setCurrentView('journal')}
        />
        
        <StatCard
          title="Monthly Spending"
          value={`$${monthlyExpenses.toFixed(0)}`}
          icon={<DollarSign className="text-white" size={20} />}
          color="bg-orange-500"
          subtitle="This month"
          onClick={() => setCurrentView('expenses')}
        />
        
        <StatCard
          title="Net Worth"
          value={`$${cashNetWorth.toLocaleString()}`}
          icon={<TrendingUp className="text-white" size={20} />}
          color="bg-purple-500"
          subtitle="Cash & Cash Equivalents - Credit Cards"
          onClick={() => setCurrentView('networth')}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Journal Summary */}
        <div className={`p-6 rounded-2xl ${
          settings.darkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Journal Entries
            </h3>
            <BookOpen 
              size={20} 
              className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'} 
            />
          </div>
          
          {journalEntries.length > 0 ? (
            <div className="space-y-3">
              {journalEntries.slice(0, 3).map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`p-3 rounded-lg ${
                    settings.darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-medium text-sm ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {entry.title}
                    </h4>
                    <span className={`text-xs ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm line-clamp-2 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <p>No journal entries yet</p>
            </div>
          )}
        </div>

        {/* Climbing Progress Chart */}
        <div className={`p-6 rounded-2xl ${
          settings.darkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Climbing Progress
            </h3>
            <Mountain 
              size={20} 
              className={settings.darkMode ? 'text-gray-400' : 'text-gray-600'} 
            />
          </div>

          {/* Time Range Selector */}
          <div className={`flex rounded-lg p-1 mb-4 ${
            settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
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

          {/* Chart */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <RechartsBarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barCategoryGap={20}
              >
                <defs>
                  <linearGradient id="climbingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={settings.darkMode ? '#374151' : '#E5E7EB'} 
                />
                <XAxis 
                  dataKey="grade" 
                  stroke={settings.darkMode ? '#D1D5DB' : '#374151'}
                  fontSize={12}
                />
                <YAxis 
                  domain={[0, roundedMax]} 
                  stroke={settings.darkMode ? '#D1D5DB' : '#374151'}
                  fontSize={12}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  fill="url(#climbingGradient)"
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          {/* Total sends */}
          <div className="mt-4 text-center">
            <div className={`text-2xl font-bold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {totalSends}
            </div>
            <div className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Total Sends ({selectedTimeRange})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;