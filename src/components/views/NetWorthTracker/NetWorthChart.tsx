import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  Area, 
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Eye, 
  EyeOff,
  Calendar,
  Zap
} from 'lucide-react';
import { ChartDataPoint, ChartConfig } from './types/networth.types';
import { GlassCard, ChartCard } from './shared/GlassCard';
import { SecondaryButton } from './shared/SpringButton';
import { AnimatedCurrency, AnimatedPercentage } from './shared/AnimatedNumber';
import { motionVariants } from './utils/animationPresets';
import { formatCurrency, calculateTrend } from './utils/netWorthCalculations';

interface NetWorthChartProps {
  data: ChartDataPoint[];
  config: ChartConfig;
  onConfigChange: (config: Partial<ChartConfig>) => void;
  isLoading?: boolean;
  isDarkMode?: boolean;
  className?: string;
}

interface TooltipData {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({
  data,
  config,
  onConfigChange,
  isLoading = false,
  isDarkMode = false,
  className = '',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Chart theme colors
  const chartColors = {
    primary: isDarkMode ? '#8B5CF6' : '#7C3AED',
    secondary: isDarkMode ? '#06B6D4' : '#0891B2',
    success: isDarkMode ? '#10B981' : '#059669',
    grid: isDarkMode ? '#374151' : '#E5E7EB',
    text: isDarkMode ? '#9CA3AF' : '#6B7280',
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
  };

  // Time range options
  const timeRangeOptions = [
    { key: '3M', label: '3M', fullLabel: '3 Months' },
    { key: '6M', label: '6M', fullLabel: '6 Months' },
    { key: '1Y', label: '1Y', fullLabel: '1 Year' },
    { key: '2Y', label: '2Y', fullLabel: '2 Years' },
    { key: 'ALL', label: 'All', fullLabel: 'All Time' },
  ];

  // Chart metrics
  const chartMetrics = useMemo(() => {
    if (data.length === 0) return null;

    const latest = data[data.length - 1];
    const earliest = data[0];
    const change = latest.totalNetWorth - earliest.totalNetWorth;
    const changePercent = earliest.totalNetWorth !== 0 
      ? (change / earliest.totalNetWorth) * 100 
      : 0;

    const trend = calculateTrend(data);
    const highestPoint = Math.max(...data.map(d => d.totalNetWorth));
    const lowestPoint = Math.min(...data.map(d => d.totalNetWorth));

    return {
      current: latest.totalNetWorth,
      change,
      changePercent,
      trend,
      highest: highestPoint,
      lowest: lowestPoint,
      dataPoints: data.length,
    };
  }, [data]);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setChartDimensions({
          width: rect.width,
          height: Math.min(400, Math.max(300, rect.width * 0.4)),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Empty tooltip component - no popup content
  const CustomTooltip = ({ active, payload, label }: TooltipData) => {
    return null; // Return null to hide the tooltip popup
  };

  // Custom dot for active point
  const CustomActiveDot = (props: any) => {
    const { cx, cy } = props;
    return (
      <motion.g
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.05, ease: "easeOut" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={chartColors.primary}
          stroke={chartColors.background}
          strokeWidth={3}
          className="drop-shadow-lg"
        />
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill={chartColors.primary}
          fillOpacity={0.2}
          className="animate-pulse"
        />
      </motion.g>
    );
  };

  // Handle mouse events
  const handleMouseMove = useCallback((e: any) => {
    if (e && e.activePayload && e.activePayload[0]) {
      setHoveredPoint(e.activePayload[0].payload);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  // Chart gradient definitions
  const gradientId = `gradient-${config.type}-${isDarkMode ? 'dark' : 'light'}`;

  return (
    <div className={`space-y-6 ${className}`} ref={containerRef}>
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h3 className={`text-lg font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Net Worth Progress
          </h3>
          {chartMetrics && (
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {chartMetrics.dataPoints} data points
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {chartMetrics.trend === 'up' ? (
                  <TrendingUp size={16} className="text-green-500" />
                ) : chartMetrics.trend === 'down' ? (
                  <TrendingDown size={16} className="text-red-500" />
                ) : (
                  <BarChart3 size={16} className="text-gray-500" />
                )}
                <AnimatedPercentage
                  value={chartMetrics.changePercent}
                  precision={1}
                  size="small"
                  color={chartMetrics.trend === 'up' ? 'success' : chartMetrics.trend === 'down' ? 'danger' : 'neutral'}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className={`flex items-center rounded-lg border p-1 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}>
            {timeRangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => onConfigChange({ timeRange: option.key as any })}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
                  ${config.timeRange === option.key
                    ? isDarkMode 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'bg-white text-purple-600 shadow-sm'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* View Options */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onConfigChange({ showAssets: !config.showAssets })}
              className={`
                p-2 rounded-lg transition-colors
                ${config.showAssets
                  ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600'
                  : isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
              title={config.showAssets ? 'Hide asset breakdown' : 'Show asset breakdown'}
            >
              {config.showAssets ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            
            <button
              onClick={() => onConfigChange({ 
                type: config.type === 'area' ? 'line' : 'area' 
              })}
              className={`
                p-2 rounded-lg transition-colors
                ${isDarkMode 
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
              title={`Switch to ${config.type === 'area' ? 'line' : 'area'} chart`}
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ChartCard
        isDarkMode={isDarkMode}
        padding="small"
        className="relative overflow-hidden"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/50 to-transparent animate-pulse z-10" />
        )}
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {config.type === 'area' ? (
              <AreaChart
                data={data}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.3} />
                    <stop offset="50%" stopColor={chartColors.primary} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                
                {config.showGrid && (
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={chartColors.grid}
                    opacity={0.3}
                  />
                )}
                
                <XAxis 
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ 
                    fill: chartColors.text, 
                    fontSize: 12,
                    fontWeight: 500 
                  }}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ 
                    fill: chartColors.text, 
                    fontSize: 12,
                    fontWeight: 500 
                  }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: chartColors.primary,
                    strokeWidth: 2,
                    strokeDasharray: '5 5',
                    opacity: 0.7,
                  }}
                />
                
                <Area
                  type="monotone"
                  dataKey="totalNetWorth"
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={<CustomActiveDot />}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                
                {config.showAssets && (
                  <Area
                    type="monotone"
                    dataKey="cashNetWorth"
                    stroke={chartColors.secondary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="transparent"
                    dot={false}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart
                data={data}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                {config.showGrid && (
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={chartColors.grid}
                    opacity={0.3}
                  />
                )}
                
                <XAxis 
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ 
                    fill: chartColors.text, 
                    fontSize: 12,
                    fontWeight: 500 
                  }}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ 
                    fill: chartColors.text, 
                    fontSize: 12,
                    fontWeight: 500 
                  }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: chartColors.primary,
                    strokeWidth: 2,
                    strokeDasharray: '5 5',
                    opacity: 0.7,
                  }}
                />
                
                <Line
                  type="monotone"
                  dataKey="totalNetWorth"
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  dot={false}
                  activeDot={<CustomActiveDot />}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                
                {config.showAssets && (
                  <Line
                    type="monotone"
                    dataKey="cashNetWorth"
                    stroke={chartColors.secondary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        {config.showAssets && (
          <div className="flex justify-center space-x-6 mt-4 pb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-purple-600 rounded-full" />
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Net Worth
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-cyan-600" />
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Cash Net Worth
              </span>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Quick Stats */}
      {chartMetrics && (
        <motion.div
          variants={motionVariants.slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              animate={hoveredPoint ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <GlassCard
                variant="subtle"
                padding="medium"
                isDarkMode={isDarkMode}
                className="text-center"
              >
                <p className={`text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Date
                </p>
                {hoveredPoint ? (
                  <p className={`text-sm font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {hoveredPoint.formattedDate}
                  </p>
                ) : (
                  <p className={`text-sm font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    -
                  </p>
                )}
              </GlassCard>
            </motion.div>

            <motion.div
              animate={hoveredPoint ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
            >
              <GlassCard
                variant="subtle"
                padding="medium"
                isDarkMode={isDarkMode}
                className="text-center"
              >
                <p className={`text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Total Net Worth
                </p>
                {hoveredPoint ? (
                  <AnimatedCurrency
                    value={hoveredPoint.totalNetWorth}
                    size="small"
                    weight="semibold"
                    color="primary"
                    isDarkMode={isDarkMode}
                    compact={true}
                  />
                ) : (
                  <p className={`text-sm font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    -
                  </p>
                )}
              </GlassCard>
            </motion.div>

            <motion.div
              animate={hoveredPoint ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            >
              <GlassCard
                variant="subtle"
                padding="medium"
                isDarkMode={isDarkMode}
                className="text-center"
              >
                <p className={`text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Cash Net Worth
                </p>
                {hoveredPoint ? (
                  <AnimatedCurrency
                    value={hoveredPoint.cashNetWorth}
                    size="small"
                    weight="semibold"
                    color="neutral"
                    isDarkMode={isDarkMode}
                    compact={true}
                  />
                ) : (
                  <p className={`text-sm font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    -
                  </p>
                )}
              </GlassCard>
            </motion.div>

            <motion.div
              animate={hoveredPoint ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
            >
              <GlassCard
                variant="subtle"
                padding="medium"
                isDarkMode={isDarkMode}
                className="text-center"
              >
                <p className={`text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Assets
                </p>
                {hoveredPoint ? (
                  <AnimatedCurrency
                    value={hoveredPoint.totalAssets}
                    size="small"
                    weight="semibold"
                    color="success"
                    isDarkMode={isDarkMode}
                    compact={true}
                  />
                ) : (
                  <p className={`text-sm font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    -
                  </p>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {data.length === 0 && (
        <ChartCard
          isDarkMode={isDarkMode}
          padding="large"
          className="text-center"
        >
          <div className={`p-4 rounded-full inline-flex mb-4 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <BarChart3 size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
          </div>
          <h3 className={`text-lg font-medium mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            No data to display
          </h3>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Add some net worth entries to see your progress chart
          </p>
        </ChartCard>
      )}
    </div>
  );
};

export default NetWorthChart;