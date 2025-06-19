import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Brush
} from 'recharts';
import { formatCurrency } from '../utils/expenseHelpers';
import { categoryColors, purpleGradient } from '../utils/categoryColors';
import { Calendar, TrendingUp } from 'lucide-react';

interface ExpenseTimelineProps {
  expenses: any[];
  timeRange: string;
  settings: { darkMode: boolean };
}

const ExpenseTimeline: React.FC<ExpenseTimelineProps> = ({ expenses, timeRange, settings }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Process data for the chart based on time range
  const chartData = useMemo(() => {
    if (expenses.length === 0) return [];
    
    const now = new Date();
    const totals = new Map<string, Record<string, number>>();
    const allCategories = new Set<string>();
    
    // Determine aggregation level and date range based on timeRange
    let aggregationLevel: 'day' | 'week' | 'month' = 'day';
    let dateRange: { start: Date; end: Date };
    
    if (timeRange === 'week' || timeRange === 'month') {
      aggregationLevel = 'day';
    } else if (timeRange === '3months' || timeRange === '6months') {
      aggregationLevel = 'week';
    } else {
      aggregationLevel = 'month';
    }
    
    // Calculate date range
    if (timeRange === 'all') {
      const allDates = expenses.map(exp => new Date(exp.date));
      dateRange = {
        start: new Date(Math.min(...allDates.map(d => d.getTime()))),
        end: new Date(Math.max(...allDates.map(d => d.getTime())))
      };
    } else {
      const days = {
        'week': 7,
        'month': 30,
        '3months': 90,
        '6months': 180,
        'year': 365
      }[timeRange] || 30;
      
      dateRange = {
        start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
        end: now
      };
    }
    
    // Group expenses by the appropriate time period
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      
      // Skip expenses outside our date range
      if (expenseDate < dateRange.start || expenseDate > dateRange.end) {
        return;
      }
      
      let periodKey: string;
      let displayKey: string;
      
      if (aggregationLevel === 'day') {
        periodKey = expenseDate.toISOString().split('T')[0];
        displayKey = expenseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (aggregationLevel === 'week') {
        // Get the Monday of the week
        const monday = new Date(expenseDate);
        monday.setDate(expenseDate.getDate() - expenseDate.getDay() + 1);
        periodKey = monday.toISOString().split('T')[0];
        displayKey = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        // Month aggregation
        periodKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
        displayKey = expenseDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      if (!totals.has(periodKey)) {
        totals.set(periodKey, { displayKey });
      }
      
      const periodData = totals.get(periodKey)!;
      periodData[expense.category] = (periodData[expense.category] || 0) + expense.amount;
      periodData.total = (periodData.total || 0) + expense.amount;
      allCategories.add(expense.category);
    });
    
    // Generate complete time series with missing periods filled in
    const data = [];
    const sortedPeriods = Array.from(totals.keys()).sort();
    
    if (sortedPeriods.length === 0) return [];
    
    // For daily/weekly aggregation, fill in missing dates
    if (aggregationLevel === 'day') {
      const startDate = new Date(Math.min(new Date(sortedPeriods[0]).getTime(), dateRange.start.getTime()));
      const endDate = new Date(Math.max(new Date(sortedPeriods[sortedPeriods.length - 1]).getTime(), dateRange.end.getTime()));
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const periodData = totals.get(dateStr) || { displayKey: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
        
        data.push({
          date: dateStr,
          displayDate: periodData.displayKey,
          total: periodData.total || 0,
          ...Object.fromEntries(
            Array.from(allCategories).map(cat => [cat, periodData[cat] || 0])
          )
        });
      }
    } else if (aggregationLevel === 'week') {
      // Generate weekly periods
      let currentWeek = new Date(dateRange.start);
      currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Get Monday
      
      while (currentWeek <= dateRange.end) {
        const weekKey = currentWeek.toISOString().split('T')[0];
        const periodData = totals.get(weekKey) || { displayKey: currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
        
        data.push({
          date: weekKey,
          displayDate: periodData.displayKey,
          total: periodData.total || 0,
          ...Object.fromEntries(
            Array.from(allCategories).map(cat => [cat, periodData[cat] || 0])
          )
        });
        
        currentWeek.setDate(currentWeek.getDate() + 7);
      }
    } else {
      // Monthly aggregation - generate monthly periods
      let currentMonth = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1);
      const endMonth = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), 1);
      
      while (currentMonth <= endMonth) {
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const periodData = totals.get(monthKey) || { displayKey: currentMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) };
        
        data.push({
          date: monthKey,
          displayDate: periodData.displayKey,
          total: periodData.total || 0,
          ...Object.fromEntries(
            Array.from(allCategories).map(cat => [cat, periodData[cat] || 0])
          )
        });
        
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    }
    
    return data;
  }, [expenses, timeRange]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, max: 0, trend: 0 };
    
    const totals = chartData.map(d => d.total);
    const avg = totals.reduce((sum, val) => sum + val, 0) / totals.length;
    const max = Math.max(...totals);
    
    // Simple trend calculation
    const firstHalf = totals.slice(0, Math.floor(totals.length / 2));
    const secondHalf = totals.slice(Math.floor(totals.length / 2));
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length || 0;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length || 0;
    const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    
    return { avg, max, trend };
  }, [chartData]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 rounded-xl shadow-xl border backdrop-blur-md ${
          settings.darkMode
            ? 'bg-gray-900/95 border-gray-700'
            : 'bg-white/95 border-gray-200'
        }`}
      >
        <div className={`text-sm font-medium mb-2 ${
          settings.darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {data.displayDate}
        </div>
        <div className={`text-xl font-bold mb-3 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {formatCurrency(data.total)}
        </div>
        <div className="space-y-1">
          {Object.entries(data)
            .filter(([key, value]) => 
              key !== 'date' && 
              key !== 'displayDate' && 
              key !== 'total' && 
              typeof value === 'number' && 
              value > 0
            )
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColors[category] || categoryColors.other }}
                  />
                  <span className={`text-sm ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {category}
                  </span>
                </div>
                <span className={`text-sm font-medium ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {formatCurrency(amount as number)}
                </span>
              </div>
            ))}
        </div>
      </motion.div>
    );
  };
  
  // Get appropriate label for the period
  const getPeriodLabel = () => {
    switch (timeRange) {
      case 'week': return 'Daily Average';
      case 'month': return 'Daily Average';
      case '3months': return 'Weekly Average';
      case '6months': return 'Weekly Average';
      case 'year': return 'Monthly Average';
      case 'all': return 'Monthly Average';
      default: return 'Daily Average';
    }
  };
  
  return (
    <div className="p-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <Calendar size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Spending Timeline
            </h3>
            <p className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Spending patterns over {timeRange === 'all' ? 'all time' : timeRange}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-sm ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {getPeriodLabel()}
            </div>
            <div className={`text-lg font-semibold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {formatCurrency(stats.avg)}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full flex items-center gap-1 ${
            stats.trend > 0 
              ? 'bg-red-500/20 text-red-500' 
              : 'bg-green-500/20 text-green-500'
          }`}>
            <TrendingUp size={14} className={stats.trend < 0 ? 'rotate-180' : ''} />
            <span className="text-sm font-medium">
              {Math.abs(stats.trend).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-80">
        {chartData.length === 0 ? (
          <div className={`h-full flex items-center justify-center ${
            settings.darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            No expense data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
            >
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={purpleGradient.light} stopOpacity={0.8} />
                  <stop offset="50%" stopColor={purpleGradient.start} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={purpleGradient.mid} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={settings.darkMode ? '#374151' : '#E5E7EB'}
                opacity={0.3}
              />
              
              <XAxis 
                dataKey="displayDate"
                stroke={settings.darkMode ? '#9CA3AF' : '#6B7280'}
                fontSize={12}
                tick={{ fill: settings.darkMode ? '#9CA3AF' : '#6B7280' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              
              <YAxis 
                stroke={settings.darkMode ? '#9CA3AF' : '#6B7280'}
                fontSize={12}
                tick={{ fill: settings.darkMode ? '#9CA3AF' : '#6B7280' }}
                tickFormatter={(value) => `$${value}`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <ReferenceLine 
                y={stats.avg} 
                stroke={settings.darkMode ? '#6B7280' : '#9CA3AF'}
                strokeDasharray="5 5"
                opacity={0.5}
              />
              
              <Area
                type="monotone"
                dataKey="total"
                stroke={purpleGradient.start}
                strokeWidth={2}
                fill="url(#purpleGradient)"
                animationDuration={1000}
                onClick={(data) => setSelectedDate(data.date)}
                style={{ cursor: 'pointer' }}
              />
              
              {chartData.length > 30 && (
                <Brush
                  dataKey="displayDate"
                  height={30}
                  stroke={settings.darkMode ? '#374151' : '#E5E7EB'}
                  fill={settings.darkMode ? '#1F2937' : '#F9FAFB'}
                  travellerWidth={10}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Category Legend */}
      <div className="mt-6 flex flex-wrap gap-4">
        {Object.entries(categoryColors)
          .filter(([cat]) => expenses.some(e => e.category === cat))
          .map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className={`text-sm ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ExpenseTimeline;