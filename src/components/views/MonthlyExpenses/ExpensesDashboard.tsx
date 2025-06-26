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
import ExpenseChart from './components/ExpenseChart';
import { formatCurrency, getDateRange } from './utils/expenseHelpers';

// Create inline Card components since we need to fix the import path
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'metric' | 'hero';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
  loading?: boolean;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'metric',
  size = 'md',
  padding = 'lg',
  hover = false,
  glow = true,
  gradient = true,
  loading = false,
  className = '',
  ...props
}) => {
  const cardVariants = {
    default: 'bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-md transition-all duration-300 ease-out',
    elevated: 'bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-2xl shadow-lg transition-all duration-300 ease-out',
    interactive: 'bg-gray-800/40 backdrop-blur-md border border-gray-700/50 hover:border-purple-500/50 rounded-2xl shadow-md hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer group transition-all duration-300 ease-out',
    metric: 'bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-2xl shadow-lg transition-all duration-300 ease-out',
    hero: 'bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-3xl shadow-xl transition-all duration-300 ease-out',
  };

  const sizeVariants = {
    sm: 'min-h-[120px]',
    md: 'min-h-[160px]',
    lg: 'min-h-[200px]',
    xl: 'min-h-[280px]',
  };

  const paddingVariants = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const getCardStyle = (): React.CSSProperties => {
    let style: React.CSSProperties = {};

    if (gradient) {
      style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)';
    }

    if (glow) {
      style.boxShadow = '0 10px 25px rgba(139, 92, 246, 0.15), 0 4px 10px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    }

    return style;
  };

  const cardClasses = [
    cardVariants[variant],
    sizeVariants[size],
    paddingVariants[padding],
    loading && 'animate-pulse',
    className
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      className={cardClasses}
      style={getCardStyle()}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
      
      <div className="absolute inset-[1px] rounded-inherit pointer-events-none bg-gradient-to-b from-white/5 to-transparent" />
    </motion.div>
  );
};

const CardGrid: React.FC<{
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, cols = 2, gap = 'md', className }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gridGap = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  const gridClasses = [
    'grid',
    gridCols[cols],
    gridGap[gap],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

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
          
          {/* UPDATED: Download button with design system theme */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-3 rounded-xl font-medium transition-all duration-300 ease-out bg-gray-800/40 backdrop-blur-md border border-gray-700/50 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 text-gray-300 hover:text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
              boxShadow: '0 10px 25px rgba(139, 92, 246, 0.15), 0 4px 10px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <Download size={18} />
          </motion.button>
        </div>
      </div>

      {/* Metrics Cards - Updated with Card Component */}
      <CardGrid cols={4} gap="md">
        <Card variant="metric" size="md" padding="lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              Total Spent
            </span>
            <DollarSign size={18} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(metrics.currentTotal)}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            metrics.change >= 0 ? 'text-red-500' : 'text-green-500'
          }`}>
            {metrics.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(metrics.changePercent).toFixed(1)}%</span>
            <span className="text-gray-500">
              vs last period
            </span>
          </div>
        </Card>

        <Card variant="metric" size="md" padding="lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              Transactions
            </span>
            <Calendar size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.transactionCount}
          </div>
          <div className="text-sm mt-2 text-gray-500">
            Avg: {formatCurrency(metrics.avgTransaction)}
          </div>
        </Card>

        <Card variant="metric" size="md" padding="lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              Daily Average
            </span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(metrics.dailyAverage)}
          </div>
          <div className="text-sm mt-2 text-gray-500">
            Per day
          </div>
        </Card>

        <Card variant="metric" size="md" padding="lg" className="overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
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
            <div className="text-2xl font-bold text-white">
              None
            </div>
          )}
          
          <div className="text-sm mt-2 text-center text-gray-500">
            {metrics.topCategories[0] ? formatCurrency(metrics.topCategories[0][1]) : '$0'}
          </div>
        </Card>
      </CardGrid>
      
      {/* NEW: Expense Chart */}
      <ExpenseChart 
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={(range) => {
          setSelectedTimeRange(range);
          setFilters(prev => ({ ...prev, dateRange: getDateRange(range) }));
        }}
      />
      
      {/* UPDATED: Time Range Selector with design system theme */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl p-1.5 bg-gray-800/40 backdrop-blur-md border border-gray-700/50"
             style={{
               background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
               boxShadow: '0 10px 25px rgba(139, 92, 246, 0.15), 0 4px 10px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
             }}>
          {timeRangeOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setSelectedTimeRange(option.key);
                setFilters(prev => ({ ...prev, dateRange: getDateRange(option.key) }));
              }}
              className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                selectedTimeRange === option.key
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
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
        {/* Timeline */}
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <ExpenseTimeline 
            expenses={filteredExpenses}
            timeRange={selectedTimeRange}
            settings={settings}
          />
        </Card>
        
        {/* AI Insights */}
        <CategoryInsights 
          expenses={filteredExpenses}
          settings={settings}
          timeRange={selectedTimeRange} 
        />
        
        {/* Recent Transactions */}
        <Card 
          variant="elevated" 
          padding="none" 
          className="mt-6 overflow-hidden"
        >
          <TransactionTable 
            expenses={filteredExpenses} 
            settings={settings}
            onEdit={(expense) => console.log('Edit expense:', expense)}
            onDelete={(id) => console.log('Delete expense:', id)} 
          /> 
        </Card>

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