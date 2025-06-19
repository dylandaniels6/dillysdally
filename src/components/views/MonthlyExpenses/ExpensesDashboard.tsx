import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../../context/AppContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Search,
  Filter,
  Plus,
  Download,
  AlertCircle
} from 'lucide-react';
import ExpenseTimeline from './components/ExpenseTimeline';
import TransactionTable from './components/TransactionTable';
import CategoryInsights from './components/CategoryInsights';
import QuickEntry from './components/QuickEntry';
import AddIncome from './components/AddIncome';
import FilterBar from './components/FilterBar';
import ExpenseSankey from './components/ExpenseSankey';
import ExpenseChart from './components/ExpenseChart';
import { formatCurrency, getDateRange } from './utils/expenseHelpers';

interface DynamicCategoryDisplayProps {
  category: string;
  darkMode: boolean;
}

const DynamicCategoryDisplay: React.FC<DynamicCategoryDisplayProps> = ({ category, darkMode }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(22);
  const [isLoaded, setIsLoaded] = useState(false);

  const categoryEmojis: Record<string, string> = {
    'eating out': '🍽️',
    'groceries': '🛒',
    'transportation': '🚗',
    'entertainment': '🎮',
    'shopping': '🛍️',
    'subscriptions': '📱',
    'bills': '📄'
  };

  const formatCategoryName = (cat: string) => {
    return cat?.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || '';
  };

  const emoji = categoryEmojis[category] || '📝';
  const displayName = formatCategoryName(category);

  // Dynamic font sizing algorithm - fine-tuned for optimal balance
  useEffect(() => {
    if (!textRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const text = textRef.current;
    
    // Available width with just a bit more padding for perfect balance
    const availableWidth = container.offsetWidth - 22; // Slightly increased padding - 11px on each side
    const availableHeight = 42; // Slightly reduced height
    
    let currentFontSize = 24; // Start a bit smaller
    text.style.fontSize = `${currentFontSize}px`;
    
    // Binary search for optimal font size
    let minSize = 15;
    let maxSize = 24; // Reduced max size slightly
    
    while (minSize <= maxSize) {
      currentFontSize = Math.floor((minSize + maxSize) / 2);
      text.style.fontSize = `${currentFontSize}px`;
      
      const textWidth = text.offsetWidth;
      const textHeight = text.offsetHeight;
      
      if (textWidth <= availableWidth && textHeight <= availableHeight) {
        minSize = currentFontSize + 1;
      } else {
        maxSize = currentFontSize - 1;
      }
    }
    
    // Use the largest size that fits - fine-tuned balance
    const finalSize = Math.max(Math.min(maxSize, 23), 15);
    setFontSize(finalSize);
    setIsLoaded(true);
  }, [category, displayName]);

  return (
    <div 
      ref={containerRef}
      className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex flex-col items-center justify-center min-h-[60px] px-3`}
    >
      {/* Emoji - slightly larger */}
      <span className="text-lg mb-1 flex-shrink-0">
        {emoji}
      </span>
      
      {/* Dynamic text - larger and better balanced */}
      <span
        ref={textRef}
        className="leading-tight font-semibold tracking-tight text-center"
        style={{ 
          fontSize: `${fontSize}px`,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out, font-size 0.3s ease-in-out'
        }}
      >
        {displayName}
      </span>
    </div>
  );
};

type TimeRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';
type ViewMode = 'timeline' | 'flow' | 'analytics';

interface ExpenseFilter {
  categories: string[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery: string;
  dateRange: { start: Date; end: Date };
}

const ExpensesDashboard: React.FC = () => {
  const { expenses, settings, isAuthenticated } = useAppContext();
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilter>({
    categories: [],
    searchQuery: '',
    dateRange: getDateRange('month')
  });

  // Time range options
  const timeRangeOptions: { key: TimeRange; label: string; days: number | null }[] = [
    { key: 'week', label: 'Week', days: 7 },
    { key: 'month', label: 'Month', days: 30 },
    { key: '3months', label: '3M', days: 90 },
    { key: '6months', label: '6M', days: 180 },
    { key: 'year', label: 'Year', days: 365 },
    { key: 'all', label: 'All', days: null }
  ];

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const matchesDate = expenseDate >= filters.dateRange.start && expenseDate <= filters.dateRange.end;
      const matchesCategory = filters.categories.length === 0 || filters.categories.includes(expense.category);
      const matchesSearch = filters.searchQuery === '' || 
        expense.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesAmount = (!filters.minAmount || expense.amount >= filters.minAmount) &&
        (!filters.maxAmount || expense.amount <= filters.maxAmount);
      
      return matchesDate && matchesCategory && matchesSearch && matchesAmount;
    });
  }, [expenses, filters]);

  // Calculate totals and trends
  const metrics = useMemo(() => {
    const currentTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Get previous period for comparison
    const currentDays = timeRangeOptions.find(opt => opt.key === selectedTimeRange)?.days || 30;
    const previousStart = new Date(filters.dateRange.start);
    previousStart.setDate(previousStart.getDate() - currentDays);
    const previousEnd = new Date(filters.dateRange.start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    
    const previousExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= previousStart && expenseDate <= previousEnd;
    });
    
    const previousTotal = previousExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const change = currentTotal - previousTotal;
    const changePercent = previousTotal > 0 ? (change / previousTotal) * 100 : 0;
    
    // Category breakdown
    const categoryTotals = new Map<string, number>();
    filteredExpenses.forEach(exp => {
      categoryTotals.set(exp.category, (categoryTotals.get(exp.category) || 0) + exp.amount);
    });
    
    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return {
      currentTotal,
      previousTotal,
      change,
      changePercent,
      transactionCount: filteredExpenses.length,
      avgTransaction: filteredExpenses.length > 0 ? currentTotal / filteredExpenses.length : 0,
      topCategories,
      dailyAverage: currentDays ? currentTotal / currentDays : 0
    };
  }, [filteredExpenses, expenses, selectedTimeRange, filters.dateRange]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setShowQuickEntry(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${
            settings.darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Monthly Expenses
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddIncome(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              settings.darkMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <Plus size={18} />
            Add Income
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQuickEntry(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              settings.darkMode 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            <Plus size={18} />
            Add Expense
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-2 rounded-xl transition-all ${
              settings.darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <Download size={18} />
          </motion.button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          } backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Spent
            </span>
            <DollarSign size={18} className="text-purple-500" />
          </div>
          <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatCurrency(metrics.currentTotal)}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            metrics.change >= 0 ? 'text-red-500' : 'text-green-500'
          }`}>
            {metrics.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(metrics.changePercent).toFixed(1)}%</span>
            <span className={settings.darkMode ? 'text-gray-500' : 'text-gray-400'}>
              vs last period
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-2xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          } backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Transactions
            </span>
            <Calendar size={18} className="text-blue-500" />
          </div>
          <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {metrics.transactionCount}
          </div>
          <div className={`text-sm mt-2 ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Avg: {formatCurrency(metrics.avgTransaction)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-2xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          } backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Daily Average
            </span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {formatCurrency(metrics.dailyAverage)}
          </div>
          <div className={`text-sm mt-2 ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Per day
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-2xl ${
            settings.darkMode 
              ? 'bg-gray-800/50 border border-gray-700/50' 
              : 'bg-white border border-gray-200'
          } backdrop-blur-sm overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Top Category
            </span>
            <AlertCircle size={18} className="text-amber-500" />
          </div>
          
          {metrics.topCategories[0] ? (
            <DynamicCategoryDisplay 
              category={metrics.topCategories[0][0]} 
              darkMode={settings.darkMode}
            />
          ) : (
            <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
              None
            </div>
          )}
          
          <div className={`text-sm mt-2 text-center ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {metrics.topCategories[0] ? formatCurrency(metrics.topCategories[0][1]) : '$0'}
          </div>
        </motion.div>
      </div>
      
      {/* NEW: Expense Chart */}
      <ExpenseChart 
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={(range) => {
          setSelectedTimeRange(range);
          setFilters(prev => ({ ...prev, dateRange: getDateRange(range) }));
        }}
      />
      
      {/* Time Range Selector */}
      <div className="flex justify-center">
        <div className={`inline-flex rounded-xl p-1 ${
          settings.darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
        } backdrop-blur-sm`}>
          {timeRangeOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setSelectedTimeRange(option.key);
                setFilters(prev => ({ ...prev, dateRange: getDateRange(option.key) }));
              }}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                selectedTimeRange === option.key
                  ? `${settings.darkMode ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'} shadow-lg scale-105`
                  : `${settings.darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl ${
        settings.darkMode ? 'bg-gray-800/30' : 'bg-gray-100/50'
      }`}>
        {(['timeline', 'flow', 'analytics'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
              viewMode === mode
                ? settings.darkMode 
                  ? 'bg-gray-700 text-white shadow-sm' 
                  : 'bg-white text-gray-900 shadow-sm'
                : settings.darkMode
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <FilterBar 
        filters={filters}
        onFiltersChange={setFilters}
        categories={settings.categories}
        settings={settings}
        expenses={expenses}
      />

      {/* Main Content Area - Single Column Layout */}
      <div className="space-y-6">
        {/* Timeline/Flow/Analytics */}
        <AnimatePresence mode="wait">
          {viewMode === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`rounded-2xl ${
                settings.darkMode 
                  ? 'bg-gray-800/50 border border-gray-700/50' 
                  : 'bg-white border border-gray-200'
              } backdrop-blur-sm overflow-hidden`}
            >
              <ExpenseTimeline 
                expenses={filteredExpenses}
                timeRange={selectedTimeRange}
                settings={settings}
              />
            </motion.div>
          )}
          
          {viewMode === 'flow' && (
            <motion.div
              key="flow"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-6 rounded-2xl ${
                settings.darkMode 
                  ? 'bg-gray-800/50 border border-gray-700/50' 
                  : 'bg-white border border-gray-200'
              } backdrop-blur-sm`}
            >
              <ExpenseSankey 
                expenses={filteredExpenses}
                income={5000} // You can make this dynamic based on user settings
                settings={settings}
                timeRange={selectedTimeRange}
              />
            </motion.div>
          )}
          
          {viewMode === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-6 rounded-2xl ${
                settings.darkMode 
                  ? 'bg-gray-800/50 border border-gray-700/50' 
                  : 'bg-white border border-gray-200'
              } backdrop-blur-sm`}
            >
              {/* Analytics component will go here */}
              <div className="h-96 flex items-center justify-center text-gray-500">
                Advanced analytics coming soon...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* AI Insights */}
        <CategoryInsights 
          expenses={filteredExpenses}
          settings={settings}
          timeRange={selectedTimeRange} 
        />
        
        {/* Recent Transactions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <TransactionTable 
            expenses={filteredExpenses} 
            settings={settings}
            onEdit={(expense) => console.log('Edit expense:', expense)}
            onDelete={(id) => console.log('Delete expense:', id)} 
          /> 
        </motion.div>

      </div>

      {/* Quick Entry Modal */}
      <AnimatePresence>
        {showAddIncome && (
          <AddIncome 
            onClose={() => setShowAddIncome(false)}
            settings={settings}
          />
        )}
        
        {showQuickEntry && (
          <QuickEntry 
            onClose={() => setShowQuickEntry(false)}
            settings={settings}
          />
        )}
      </AnimatePresence>
    </div> 
  );
};

export default ExpensesDashboard;