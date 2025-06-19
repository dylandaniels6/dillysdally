import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { DollarSign } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';

interface ExpenseChartProps {
  selectedTimeRange: 'week' | 'month' | '3months' | '6months' | 'year' | 'all';
  onTimeRangeChange: (range: 'week' | 'month' | '3months' | '6months' | 'year' | 'all') => void;
}

// Particle Component
const StarryParticle: React.FC<{ 
  x: number; 
  y: number; 
  size: number; 
  opacity: number; 
  duration: number;
  delay: number;
  darkMode: boolean;
}> = ({ x, y, size, opacity, duration, delay, darkMode }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: `${size}px`,
      height: `${size}px`,
      background: darkMode 
        ? `radial-gradient(circle, rgba(147, 197, 253, ${opacity}) 0%, rgba(196, 181, 253, ${opacity * 0.8}) 50%, transparent 100%)`
        : `radial-gradient(circle, rgba(59, 130, 246, ${opacity}) 0%, rgba(139, 92, 246, ${opacity * 0.8}) 50%, transparent 100%)`,
      animation: `floatParticle ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      filter: 'blur(0.5px)',
    }}
  />
);

// Starry Background Component
const StarryBackground: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const particles = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1, // 1-4px
      opacity: Math.random() * 0.4 + 0.1, // 0.1-0.5 opacity
      duration: Math.random() * 20 + 25, // 25-45 seconds (faster but still slow)
      delay: Math.random() * 15, // 0-15 second delay
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <StarryParticle
          key={particle.id}
          x={particle.x}
          y={particle.y}
          size={particle.size}
          opacity={particle.opacity}
          duration={particle.duration}
          delay={particle.delay}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
};

const ExpenseChart: React.FC<ExpenseChartProps> = ({ selectedTimeRange, onTimeRangeChange }) => {
  const { expenses, settings } = useAppContext();
  const [hoveredBar, setHoveredBar] = useState<{ period: string; value: number; x: number; y: number; isVisible: boolean } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const timeRangeOptions = [
    { key: 'week', label: 'Week', days: 7 },
    { key: 'month', label: 'Month', days: 30 },
    { key: '3months', label: '3 Months', days: 90 },
    { key: '6months', label: '6 Months', days: 180 },
    { key: 'year', label: 'Year', days: 365 },
    { key: 'all', label: 'All Time', days: null },
  ];

  const now = new Date();
  const startDate = useMemo(() => {
    const option = timeRangeOptions.find(opt => opt.key === selectedTimeRange);
    if (!option || !option.days) return new Date(0);
    const start = new Date();
    start.setDate(now.getDate() - option.days);
    return start;
  }, [selectedTimeRange]);

  // Get the date range for all time view
  const allTimeRange = useMemo(() => {
    if (selectedTimeRange !== 'all' || expenses.length === 0) return null;
    
    const allDates = expenses.map(exp => new Date(exp.date));
    const firstDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const lastDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    return { firstDate, lastDate };
  }, [expenses, selectedTimeRange]);

  const periodTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const now = new Date();

    // Get filtered expenses based on time range
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      if (selectedTimeRange === 'all') {
        return true; // Include all expenses for 'all time' view
      }
      return expenseDate >= startDate;
    });

    // Group expenses by time period
    filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      let periodKey: string;

      if (selectedTimeRange === 'week') {
        // Use actual date for week view (last 7 days)
        periodKey = `${expenseDate.getMonth() + 1}/${expenseDate.getDate()}`;
      } else if (selectedTimeRange === 'month') {
        // Use week numbers relative to today for month view (last 4 weeks)
        const daysDiff = Math.floor((now.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor(daysDiff / 7) + 1;
        periodKey = `${weekNumber}w ago`;
      } else if (selectedTimeRange === '3months') {
        // Use actual month names for 3 months (last 3 months)
        periodKey = expenseDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else if (selectedTimeRange === '6months') {
        // Use actual month names for 6 months (last 6 months)
        periodKey = expenseDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else if (selectedTimeRange === 'year') {
        // Use actual month names for year view (last 12 months)
        periodKey = expenseDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        // Group by quarter for all time
        const quarter = Math.floor(expenseDate.getMonth() / 3) + 1;
        periodKey = `${expenseDate.getFullYear()} Q${quarter}`;
      }

      totals[periodKey] = (totals[periodKey] || 0) + expense.amount;
    });

    // Generate ALL periods for the selected range (rolling window)
    let allPeriods: { period: string; value: number }[];

    if (selectedTimeRange === 'week') {
      // Last 7 days
      allPeriods = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - i));
        const periodKey = `${date.getMonth() + 1}/${date.getDate()}`;
        return {
          period: periodKey,
          value: Math.round((totals[periodKey] || 0) * 100) / 100
        };
      });
    } else if (selectedTimeRange === 'month') {
      // Last 4 weeks
      allPeriods = Array.from({ length: 4 }, (_, i) => {
        const weekNumber = 4 - i;
        const periodKey = `${weekNumber}w ago`;
        return {
          period: periodKey,
          value: Math.round((totals[periodKey] || 0) * 100) / 100
        };
      });
    } else if (selectedTimeRange === '3months') {
      // Last 3 months
      allPeriods = Array.from({ length: 3 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
        const periodKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return {
          period: periodKey,
          value: Math.round((totals[periodKey] || 0) * 100) / 100
        };
      });
    } else if (selectedTimeRange === '6months') {
      // Last 6 months
      allPeriods = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const periodKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return {
          period: periodKey,
          value: Math.round((totals[periodKey] || 0) * 100) / 100
        };
      });
    } else if (selectedTimeRange === 'year') {
      // Last 12 months (rolling year)
      allPeriods = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const periodKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return {
          period: periodKey,
          value: Math.round((totals[periodKey] || 0) * 100) / 100
        };
      });
    } else {
      // All time - show all quarters from first entry to latest entry
      if (!allTimeRange) {
        allPeriods = ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => ({
          period: quarter,
          value: 0
        }));
      } else {
        const { firstDate, lastDate } = allTimeRange;
        const firstYear = firstDate.getFullYear();
        const lastYear = lastDate.getFullYear();
        
        allPeriods = [];
        for (let year = firstYear; year <= lastYear; year++) {
          for (let quarter = 1; quarter <= 4; quarter++) {
            const quarterKey = `Q${quarter}`;
            const yearQuarterKey = `${year} Q${quarter}`;
            
            // Calculate total for this specific year-quarter
            const quarterTotal = filteredExpenses
              .filter(expense => {
                const expenseDate = new Date(expense.date);
                const expenseYear = expenseDate.getFullYear();
                const expenseQuarter = Math.floor(expenseDate.getMonth() / 3) + 1;
                return expenseYear === year && expenseQuarter === quarter;
              })
              .reduce((sum, expense) => sum + expense.amount, 0);
            
            allPeriods.push({
              period: yearQuarterKey,
              value: Math.round(quarterTotal * 100) / 100
            });
          }
        }
      }
    }

    return allPeriods;
  }, [expenses, selectedTimeRange, startDate, now, allTimeRange]);

  const maxAmount = Math.max(...periodTotals.map(p => p.value), 0);
  
  // Dynamic scaling logic that works for any amount range
  const roundedMax = useMemo(() => {
    if (maxAmount === 0) return 100;
    
    // Get the order of magnitude
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxAmount)));
    const normalized = maxAmount / magnitude;
    
    // Round up to nice numbers: 1, 2, 5, 10
    let multiplier;
    if (normalized <= 1) multiplier = 1;
    else if (normalized <= 2) multiplier = 2;
    else if (normalized <= 5) multiplier = 5;
    else multiplier = 10;
    
    return multiplier * magnitude;
  }, [maxAmount]);

  const gradientId = 'expenseBarGradient';

  // Clear any existing timeout when hiding tooltip
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleBarMouseEnter = useCallback((data: any, index: number, event: any) => {
    if (data.value <= 0) return;
    
    // Clear any pending hide timeout
    clearHideTimeout();
    
    const rect = event.target.getBoundingClientRect();
    const chartRect = chartRef.current?.getBoundingClientRect();
    if (!chartRect) return;

    // Real-time positioning - center of the bar
    const x = rect.left + rect.width / 2 - chartRect.left;
    const y = rect.top - chartRect.top - 15;

    setHoveredBar({
      period: data.period,
      value: data.value,
      x,
      y,
      isVisible: true
    });
  }, [clearHideTimeout]);

  const handleBarMouseLeave = useCallback(() => {
    // Clear any existing timeout
    clearHideTimeout();
    
    // Set a very short timeout before hiding to make it feel snappy
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredBar(null);
    }, 50); // 50ms delay for ultra-responsive feel
  }, [clearHideTimeout]);

  const handleChartMouseMove = useCallback((event: React.MouseEvent) => {
    // Check if mouse is over a bar element
    const target = event.target as Element;
    const isOverBar = target.closest('.recharts-bar-rectangle') || target.classList.contains('recharts-bar-rectangle');
    
    if (!isOverBar && hoveredBar) {
      // Mouse is in chart but not over any bar - hide tooltip immediately
      clearHideTimeout();
      setHoveredBar(null);
    }
  }, [hoveredBar, clearHideTimeout]);

  const handleChartMouseLeave = useCallback(() => {
    // Clear any existing timeout
    clearHideTimeout();
    
    // Immediately hide tooltip when leaving chart area
    setHoveredBar(null);
  }, [clearHideTimeout]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative rounded-lg overflow-hidden ${settings.darkMode ? 'bg-gray-800' : 'bg-white'} border ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Starry Background */}
      <StarryBackground darkMode={settings.darkMode} />
      
      {/* CSS for chart container and floating particles */}
      <style>{`
        .chart-container {
          height: 400px;
        }
        @media (max-width: 768px) {
          .chart-container {
            height: 300px;
          }
        }
        
        /* Ultra-responsive tooltip transitions */
        .tooltip-container {
          transition: all 0.08s cubic-bezier(0.23, 1, 0.32, 1);
          will-change: transform, opacity;
        }
        
        .tooltip-content {
          transition: all 0.08s cubic-bezier(0.23, 1, 0.32, 1);
          will-change: transform, filter;
        }
        
        /* Faster floating particle animation */
        @keyframes floatParticle {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
            opacity: var(--particle-opacity);
          }
          25% {
            transform: translateY(-12px) translateX(6px) rotate(90deg);
            opacity: calc(var(--particle-opacity) * 0.6);
          }
          50% {
            transform: translateY(-18px) translateX(-8px) rotate(180deg);
            opacity: var(--particle-opacity);
          }
          75% {
            transform: translateY(-6px) translateX(10px) rotate(270deg);
            opacity: calc(var(--particle-opacity) * 0.7);
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(360deg);
            opacity: var(--particle-opacity);
          }
        }
      `}</style> 
      
      <div 
        ref={chartRef}
        className="relative z-10 chart-container" 
        onMouseMove={handleChartMouseMove}
        onMouseLeave={handleChartMouseLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={periodTotals}
            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            barCategoryGap="15%"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            
            {/* Minimal Grid */}
            <CartesianGrid 
              strokeDasharray="1 4" 
              stroke={settings.darkMode ? '#374151' : '#E5E7EB'} 
              strokeOpacity={0.3}
              horizontal={true}
              vertical={false}
            />
            
            {/* X-Axis - positioned at bottom edge */}
            <XAxis 
              dataKey="period" 
              axisLine={true}
              tickLine={true}
              tick={{ 
                fontSize: 14, 
                fontWeight: 600,
                fill: settings.darkMode ? '#D1D5DB' : '#374151'
              }}
              tickMargin={8}
              stroke={settings.darkMode ? '#374151' : '#E5E7EB'}
            />
            
            {/* Y-Axis - positioned at left edge */}
            <YAxis 
              domain={[0, roundedMax]} 
              axisLine={true}
              tickLine={true}
              tickCount={5}
              tick={{ 
                fontSize: 13, 
                fontWeight: 500,
                fill: settings.darkMode ? '#9CA3AF' : '#6B7280'
              }}
              tickMargin={8}
              stroke={settings.darkMode ? '#374151' : '#E5E7EB'}
              tickFormatter={(value) => {
                if (value === 0) return '0';
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                return `${value}`;
              }}
            />
            
            {/* Bars */}
            <Bar
              dataKey="value"
              radius={[12, 12, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              isAnimationActive={true}
            >
              {periodTotals.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value > 0 ? `url(#${gradientId})` : 'transparent'}
                  style={{
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    transformOrigin: 'bottom center',
                    cursor: entry.value > 0 ? 'pointer' : 'default',
                    filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.15))'
                  }}
                  onMouseEnter={(e: any) => {
                    if (entry.value > 0) {
                      e.target.style.transform = 'scaleY(1.02) scaleX(1.05)';
                      e.target.style.filter = 'brightness(1.1) drop-shadow(0 8px 25px rgba(59, 130, 246, 0.25))';
                      handleBarMouseEnter(entry, index, e);
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    e.target.style.transform = 'scaleY(1) scaleX(1)';
                    e.target.style.filter = 'brightness(1) drop-shadow(0 4px 12px rgba(59, 130, 246, 0.15))';
                    handleBarMouseLeave();
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Ultra-Responsive Tooltip */}
        {hoveredBar && (
          <div
            ref={tooltipRef}
            className="tooltip-container absolute z-50 pointer-events-none"
            style={{
              left: hoveredBar.x,
              top: hoveredBar.y - 20,
              transform: 'translateX(-50%) translateY(0px)',
              opacity: hoveredBar.isVisible ? 1 : 0,
            }}
          >
            <div className={`tooltip-content px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
              settings.darkMode 
                ? 'bg-gray-900/95 border-gray-700/50' 
                : 'bg-white/95 border-gray-200/50'
            }`}>
              {/* Instant glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              
              <div className="relative text-center min-w-[90px]">
                <div className={`text-xs font-medium tracking-wide ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {hoveredBar.period}
                </div>
                <div className={`text-lg font-bold mt-1 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent`}>
                  ${hoveredBar.value >= 1000 
                    ? `${(hoveredBar.value / 1000).toFixed(1)}K` 
                    : hoveredBar.value.toFixed(0)}
                </div>
              </div>
              
              {/* Tooltip arrow */}
              <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
                settings.darkMode ? 'bg-gray-900/95' : 'bg-white/95'
              }`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseChart;