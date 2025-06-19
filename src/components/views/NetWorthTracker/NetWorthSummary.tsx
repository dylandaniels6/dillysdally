import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar } from 'lucide-react';
import { NetWorthSummary as SummaryType } from './types/networth.types';
import { useNetWorthAnimations } from './hooks/useNetWorthAnimations';
import { AnimatedCurrency, AnimatedPercentage } from './shared/AnimatedNumber';
import { MetricCard } from './shared/GlassCard';
import { motionVariants, staggerDelays } from './utils/animationPresets';
import { formatCurrency, formatPercentage } from './utils/netWorthCalculations';

interface NetWorthSummaryProps {
  summary: SummaryType;
  isLoading?: boolean;
  isDarkMode?: boolean;
  className?: string;
}

export const NetWorthSummary: React.FC<NetWorthSummaryProps> = ({
  summary,
  isLoading = false,
  isDarkMode = false,
  className = '',
}) => {
  const { numberSprings, cardSprings, successPulse } = useNetWorthAnimations(
    summary,
    isLoading
  );

  // Determine trend colors and icons
  const getTrendInfo = (value: number, percentage: number) => {
    if (value > 0) {
      return {
        color: isDarkMode ? 'text-green-400' : 'text-green-600',
        bgColor: isDarkMode ? 'bg-green-500/20' : 'bg-green-50',
        icon: TrendingUp,
        gradient: 'from-green-500 to-green-400',
      };
    } else if (value < 0) {
      return {
        color: isDarkMode ? 'text-red-400' : 'text-red-600',
        bgColor: isDarkMode ? 'bg-red-500/20' : 'bg-red-50',
        icon: TrendingDown,
        gradient: 'from-red-500 to-red-400',
      };
    }
    return {
      color: isDarkMode ? 'text-gray-400' : 'text-gray-600',
      bgColor: isDarkMode ? 'bg-gray-500/20' : 'bg-gray-50',
      icon: DollarSign,
      gradient: 'from-gray-500 to-gray-400',
    };
  };

  const monthlyTrend = getTrendInfo(summary.monthlyChange, summary.monthlyChangePercent);
  const yearlyTrend = getTrendInfo(summary.yearToDateChange, summary.yearToDateChangePercent);

  return (
    <motion.div
      className={`space-y-6 ${className}`}
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Main Net Worth Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Net Worth */}
        <motion.div variants={motionVariants.slideUp}>
          <MetricCard
            isDarkMode={isDarkMode}
            gradient={true}
            className="relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Cash Net Worth
                </h3>
                <div className={`p-2 rounded-lg ${
                  isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <DollarSign size={16} className="text-purple-600" />
                </div>
              </div>
              
              <div className="mb-4">
                <AnimatedCurrency
                  value={summary.cashNetWorth}
                  size="xl"
                  weight="bold"
                  color="primary"
                  isDarkMode={isDarkMode}
                  enablePulse={true}
                  className="block"
                />
                <p className={`text-xs mt-1 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Cash & Cash Equivalents - Credit Cards
                </p>
              </div>

              {/* Cash breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Cash & Equivalents
                  </span>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    +{formatCurrency(summary.cashNetWorth + Math.abs(summary.totalNetWorth - summary.cashNetWorth - summary.totalAssetValue || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Credit Cards
                  </span>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    -{formatCurrency(Math.abs(summary.totalNetWorth - summary.cashNetWorth - summary.totalAssetValue || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10 opacity-0"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </MetricCard>
        </motion.div>

        {/* Total Net Worth */}
        <motion.div variants={motionVariants.slideUp}>
          <MetricCard
            isDarkMode={isDarkMode}
            gradient={true}
            glow={true}
            className="relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Total Net Worth
                </h3>
                <div className={`p-2 rounded-lg ${
                  isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <Target size={16} className="text-purple-600" />
                </div>
              </div>
              
              <div className="mb-4">
                <AnimatedCurrency
                  value={summary.totalNetWorth}
                  size="xl"
                  weight="bold"
                  color="primary"
                  isDarkMode={isDarkMode}
                  enablePulse={true}
                  className="block"
                />
                <p className={`text-xs mt-1 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Cash Net Worth + Assets
                </p>
              </div>

              {/* Asset value */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Cash Net Worth
                  </span>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {formatCurrency(summary.cashNetWorth)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Total Assets
                  </span>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    +{formatCurrency(summary.totalAssetValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Success pulse animation */}
            <motion.div
              style={successPulse}
              className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10"
            />
          </MetricCard>
        </motion.div>
      </div>

      {/* Change Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Change */}
        <motion.div variants={motionVariants.slideUp}>
          <MetricCard
            isDarkMode={isDarkMode}
            variant="subtle"
            className="relative"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Monthly Change
              </h3>
              <div className={`p-2 rounded-lg ${monthlyTrend.bgColor}`}>
                <monthlyTrend.icon size={16} className={monthlyTrend.color} />
              </div>
            </div>

            <div className="space-y-2">
              <AnimatedCurrency
                value={summary.monthlyChange}
                size="large"
                weight="bold"
                color={summary.monthlyChange > 0 ? 'success' : summary.monthlyChange < 0 ? 'danger' : 'neutral'}
                isDarkMode={isDarkMode}
                showChange={true}
                enablePulse={true}
              />
              
              <div className="flex items-center space-x-2">
                <AnimatedPercentage
                  value={summary.monthlyChangePercent}
                  precision={1}
                  color={summary.monthlyChangePercent > 0 ? 'success' : summary.monthlyChangePercent < 0 ? 'danger' : 'neutral'}
                  isDarkMode={isDarkMode}
                  size="small"
                />
                <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  vs. last month
                </span>
              </div>
            </div>
          </MetricCard>
        </motion.div>

        {/* Year to Date Change */}
        <motion.div variants={motionVariants.slideUp}>
          <MetricCard
            isDarkMode={isDarkMode}
            variant="subtle"
            className="relative"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Year to Date
              </h3>
              <div className={`p-2 rounded-lg ${yearlyTrend.bgColor}`}>
                <Calendar size={16} className={yearlyTrend.color} />
              </div>
            </div>

            <div className="space-y-2">
              <AnimatedCurrency
                value={summary.yearToDateChange}
                size="large"
                weight="bold"
                color={summary.yearToDateChange > 0 ? 'success' : summary.yearToDateChange < 0 ? 'danger' : 'neutral'}
                isDarkMode={isDarkMode}
                enablePulse={true}
              />
              
              <div className="flex items-center space-x-2">
                <AnimatedPercentage
                  value={summary.yearToDateChangePercent}
                  precision={1}
                  color={summary.yearToDateChangePercent > 0 ? 'success' : summary.yearToDateChangePercent < 0 ? 'danger' : 'neutral'}
                  isDarkMode={isDarkMode}
                  size="small"
                />
                <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  since Jan 1st
                </span>
              </div>
            </div>
          </MetricCard>
        </motion.div>
      </div>

      {/* All-Time Records */}
      <motion.div variants={motionVariants.slideUp}>
        <MetricCard
          isDarkMode={isDarkMode}
          variant="default"
          padding="medium"
          className="relative"
        >
          <h3 className={`text-sm font-medium mb-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            All-Time Records
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                All-Time High
              </div>
              <AnimatedCurrency
                value={summary.allTimeHigh}
                size="medium"
                weight="semibold"
                color="success"
                isDarkMode={isDarkMode}
                compact={true}
              />
            </div>

            <div className="text-center">
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                All-Time Low
              </div>
              <AnimatedCurrency
                value={summary.allTimeLow}
                size="medium"
                weight="semibold"
                color="neutral"
                isDarkMode={isDarkMode}
                compact={true}
              />
            </div>
          </div>
        </MetricCard>
      </motion.div>
    </motion.div>
  );
};

export default NetWorthSummary;