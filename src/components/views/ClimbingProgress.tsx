import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Calendar, TrendingUp, TrendingDown, Mountain, BarChart3, Target, Award, Zap, Clock } from 'lucide-react';
import GradeSendsChart from '../views/GradeSendsChart';
import MountainVisualization from '../views/ClimbingLog/MountainVisualization';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type TimeRange = 'week' | 'month' | '6months' | 'year' | 'all';

interface ClimbingData {
  date: string;
  totalClimbs: number;
  completedClimbs: number;
  gradeBreakdown: Record<string, number>;
  sessions: number;
}

interface ClimbingProgressProps {
  selectedTimeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const ClimbingProgress: React.FC<ClimbingProgressProps> = ({ 
  selectedTimeRange, 
  onTimeRangeChange 
}) => {
  const { climbingSessions, journalEntries, settings, user } = useAppContext();
  const [activeChart, setActiveChart] = useState<'overview' | 'performance' | 'analytics'>('overview');

  const timeRangeOptions = [
    { key: 'week' as TimeRange, label: 'Week', days: 7 },
    { key: 'month' as TimeRange, label: 'Month', days: 30 },
    { key: '6months' as TimeRange, label: '6 Months', days: 180 },
    { key: 'year' as TimeRange, label: 'Year', days: 365 },
    { key: 'all' as TimeRange, label: 'All Time', days: null }
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

  // Calculate previous period for comparison
  const previousDateRange = useMemo(() => {
    if (selectedTimeRange === 'all') return null;
    
    const selectedOption = timeRangeOptions.find(opt => opt.key === selectedTimeRange);
    if (!selectedOption?.days) return null;

    const currentStart = dateRange.startDate;
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - selectedOption.days + 1);
    
    return { startDate: previousStart, endDate: previousEnd };
  }, [selectedTimeRange, dateRange]);

  // Helper function to format time duration
  const formatTimeDuration = (totalMinutes: number): string => {
    if (totalMinutes === 0) return "0 min";
    
    const minutes = Math.floor(totalMinutes % 60);
    const hours = Math.floor((totalMinutes / 60) % 24);
    const days = Math.floor((totalMinutes / (60 * 24)) % 7);
    const weeks = Math.floor((totalMinutes / (60 * 24 * 7)) % 4.33);
    const months = Math.floor((totalMinutes / (60 * 24 * 30.44)) % 12);
    const years = Math.floor(totalMinutes / (60 * 24 * 365.25));

    const parts = [];
    
    if (years > 0) parts.push({ value: years, unit: years === 1 ? 'year' : 'y', abbrev: 'y' });
    if (months > 0) parts.push({ value: months, unit: months === 1 ? 'month' : 'mo', abbrev: 'mo' });
    if (weeks > 0) parts.push({ value: weeks, unit: weeks === 1 ? 'week' : 'w', abbrev: 'w' });
    if (days > 0) parts.push({ value: days, unit: days === 1 ? 'day' : 'd', abbrev: 'd' });
    if (hours > 0) parts.push({ value: hours, unit: 'h', abbrev: 'h' });
    if (minutes > 0) parts.push({ value: minutes, unit: 'm', abbrev: 'm' });

    // Single unit cases (use full words when clean)
    if (parts.length === 1) {
      const part = parts[0];
      if (part.unit === 'y' || part.unit === 'year') return `${part.value} ${part.value === 1 ? 'year' : 'years'}`;
      if (part.unit === 'mo' || part.unit === 'month') return `${part.value} ${part.value === 1 ? 'month' : 'months'}`;
      if (part.unit === 'w' || part.unit === 'week') return `${part.value} ${part.value === 1 ? 'week' : 'weeks'}`;
      if (part.unit === 'd' || part.unit === 'day') return `${part.value} ${part.value === 1 ? 'day' : 'days'}`;
      if (part.unit === 'h') return `${part.value} ${part.value === 1 ? 'hour' : 'hours'}`;
      if (part.unit === 'm') return `${part.value} min`;
    }

    // Multiple units - use abbreviations and show most significant 2-3 units
    const significantParts = parts.slice(0, Math.min(3, parts.length));
    
    // For 2+ units, always use abbreviations for cleaner look
    return significantParts.map(part => `${part.value}${part.abbrev}`).join(' ');
  };

  const climbingData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    const dataMap = new Map<string, ClimbingData>();

    const getDateKey = (date: Date) => {
      if (selectedTimeRange === 'week' || selectedTimeRange === 'month') {
        return date.toISOString().split('T')[0];
      } else if (selectedTimeRange === '6months' || selectedTimeRange === 'year') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    climbingSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      
      if (sessionDate >= startDate && sessionDate <= endDate) {
        const key = getDateKey(sessionDate);
        if (!dataMap.has(key)) {
          dataMap.set(key, { date: key, totalClimbs: 0, completedClimbs: 0, gradeBreakdown: {}, sessions: 0 });
        }
        const data = dataMap.get(key)!;
        data.sessions += 1;
        data.totalClimbs += session.routes.length;
        data.completedClimbs += session.routes.filter(r => r.completed).length;
        session.routes.forEach(route => {
          if (route.completed) {
            data.gradeBreakdown[route.grade] = (data.gradeBreakdown[route.grade] || 0) + 1;
          }
        });
      }
    });

    journalEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entry.climbed && entry.sends && entryDate >= startDate && entryDate <= endDate) {
        const key = getDateKey(entryDate);
        if (!dataMap.has(key)) {
          dataMap.set(key, { date: key, totalClimbs: 0, completedClimbs: 0, gradeBreakdown: {}, sessions: 0 });
        }
        const data = dataMap.get(key)!;
        Object.entries(entry.sends).forEach(([grade, count]) => {
          if (count > 0) {
            data.gradeBreakdown[grade] = (data.gradeBreakdown[grade] || 0) + count;
            data.completedClimbs += count;
            data.totalClimbs += count;
          }
        });
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [climbingSessions, journalEntries, dateRange, selectedTimeRange]);

  // Calculate previous period data for comparison
  const previousClimbingData = useMemo(() => {
    if (!previousDateRange) return null;
    
    const { startDate, endDate } = previousDateRange;
    let totalClimbs = 0;

    climbingSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      if (sessionDate >= startDate && sessionDate <= endDate) {
        totalClimbs += session.routes.filter(r => r.completed).length;
      }
    });

    journalEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entry.climbed && entry.sends && entryDate >= startDate && entryDate <= endDate) {
        Object.entries(entry.sends).forEach(([grade, count]) => {
          if (count > 0) {
            totalClimbs += count;
          }
        });
      }
    });

    return totalClimbs;
  }, [climbingSessions, journalEntries, previousDateRange]);

  const stats = useMemo(() => {
    const totalClimbs = climbingData.reduce((sum, d) => sum + d.totalClimbs, 0);
    const totalCompleted = climbingData.reduce((sum, d) => sum + d.completedClimbs, 0);
    const totalSessions = climbingData.reduce((sum, d) => sum + d.sessions, 0);
    
    // Calculate total time spent climbing in minutes
    const { startDate, endDate } = dateRange;
    const totalTimeMinutes = climbingSessions
      .filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startDate && sessionDate <= endDate;
      })
      .reduce((sum, session) => sum + (session.duration || 0), 0);
    
    const formattedTimeSpent = formatTimeDuration(totalTimeMinutes);
    
    // Calculate comparison with previous period
    let comparisonData = null;
    if (selectedTimeRange !== 'all' && previousClimbingData !== null) {
      const difference = totalCompleted - previousClimbingData;
      const isIncrease = difference > 0;
      const isDecrease = difference < 0;
      
      comparisonData = {
        value: previousClimbingData,
        difference,
        isIncrease,
        isDecrease,
        showIcon: true
      };
    } else if (selectedTimeRange === 'all') {
      comparisonData = {
        value: totalCompleted,
        difference: 0,
        isIncrease: false,
        isDecrease: false,
        showIcon: false
      };
    } else {
      // No previous data available
      comparisonData = {
        value: 0,
        difference: totalCompleted,
        isIncrease: true,
        isDecrease: false,
        showIcon: true
      };
    }
    
    return { totalClimbs, totalCompleted, totalSessions, formattedTimeSpent, comparisonData };
  }, [climbingData, selectedTimeRange, previousClimbingData, dateRange, climbingSessions, formatTimeDuration]);

  // Additional calculations for enhanced charts
  const progressionData = useMemo(() => {
    return climbingData.map(d => ({
      date: d.date,
      sends: d.completedClimbs,
      attempts: d.totalClimbs,
      successRate: d.totalClimbs > 0 ? (d.completedClimbs / d.totalClimbs * 100).toFixed(1) : 0
    }));
  }, [climbingData]);

  const gradeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    climbingData.forEach(d => {
      Object.entries(d.gradeBreakdown).forEach(([grade, count]) => {
        distribution[grade] = (distribution[grade] || 0) + count;
      });
    });
    
    return ['V6', 'V7', 'V8', 'V9', 'V10'].map(grade => ({
      grade,
      count: distribution[grade] || 0
    }));
  }, [climbingData]);

  const performanceMetrics = useMemo(() => {
    const grades = ['V6', 'V7', 'V8', 'V9', 'V10'];
    const metrics = grades.map(grade => {
      let attempts = 0;
      let sends = 0;
      
      climbingSessions.forEach(session => {
        session.routes.forEach(route => {
          if (route.grade === grade) {
            attempts++;
            if (route.completed) sends++;
          }
        });
      });
      
      return {
        grade,
        successRate: attempts > 0 ? (sends / attempts * 100) : 0,
        totalSends: sends
      };
    });
    
    return metrics;
  }, [climbingSessions]);

  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="flex justify-center mb-6">
        <div className={`inline-flex rounded-lg p-1 ${settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => setActiveChart('overview')}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              activeChart === 'overview'
                ? settings.darkMode
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : settings.darkMode
                ? 'text-gray-300 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveChart('performance')}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              activeChart === 'performance'
                ? settings.darkMode
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : settings.darkMode
                ? 'text-gray-300 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveChart('analytics')}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              activeChart === 'analytics'
                ? settings.darkMode
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : settings.darkMode
                ? 'text-gray-300 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeChart === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard 
              icon={<Mountain size={18} className="text-blue-500" />} 
              label="Total Climbs" 
              value={stats.totalClimbs} 
              settings={settings} 
            />
            <StatCard 
              icon={
                <div className="flex items-center space-x-1">
                  {stats.comparisonData?.showIcon && (
                    stats.comparisonData.isIncrease ? 
                      <TrendingUp size={18} className="text-green-500" /> :
                      stats.comparisonData.isDecrease ? 
                        <TrendingDown size={18} className="text-red-500" /> :
                        <TrendingUp size={18} className="text-green-500" />
                  )}
                  {!stats.comparisonData?.showIcon && <TrendingUp size={18} className="text-gray-500" />}
                </div>
              }
              label="Vs. Prior Period" 
              value={
                selectedTimeRange === 'all' ? 
                  stats.comparisonData?.value || 0 :
                  <div className="flex items-center space-x-2">
                    <span>{stats.comparisonData?.value || 0}</span>
                    {stats.comparisonData?.showIcon && (
                      <span className={`text-sm ${
                        stats.comparisonData.isIncrease ? 'text-green-500' : 
                        stats.comparisonData.isDecrease ? 'text-red-500' : 'text-green-500'
                      }`}>
                        ({stats.comparisonData.difference >= 0 ? '+' : ''}{stats.comparisonData.difference})
                      </span>
                    )}
                  </div>
              }
              settings={settings} 
            />
            <StatCard 
              icon={<BarChart3 size={18} className="text-orange-500" />} 
              label="Time Spent Climbing" 
              value={stats.formattedTimeSpent} 
              settings={settings} 
            />
            <StatCard 
              icon={<Calendar size={18} className="text-purple-500" />} 
              label="Sessions" 
              value={stats.totalSessions} 
              settings={settings} 
            />
          </div>

          <GradeSendsChart 
            selectedTimeRange={selectedTimeRange}
            onTimeRangeChange={onTimeRangeChange}
          />
        </>
      )}

      {/* Performance Tab */}
      {activeChart === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Success Rate by Grade */}
          <div className={`p-6 rounded-lg ${settings.darkMode ? 'bg-gray-800' : 'bg-white'} border ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
              Success Rate by Grade
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke={settings.darkMode ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="grade" stroke={settings.darkMode ? '#D1D5DB' : '#374151'} />
                <YAxis stroke={settings.darkMode ? '#D1D5DB' : '#374151'} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: settings.darkMode ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${settings.darkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="successRate" fill="#10B981" radius={[8, 8, 0, 0]}>
                  {performanceMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grade Distribution Pie Chart */}
          <div className={`p-6 rounded-lg ${settings.darkMode ? 'bg-gray-800' : 'bg-white'} border ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
              Grade Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeDistribution.filter(g => g.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({grade, percent}) => `${grade} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
{activeChart === 'analytics' && (
  <div className="space-y-6">
    {/* Mountain Visualization */}
    <MountainVisualization 
      climbingSessions={climbingSessions}
      journalEntries={journalEntries}
      settings={settings}
      height={500}
    />

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<Target size={20} />}
              label="Average Success Rate"
              value={`${(stats.totalCompleted / stats.totalClimbs * 100 || 0).toFixed(1)}%`}
              color="text-green-500"
              settings={settings}
            />
            <MetricCard
              icon={<Zap size={20} />}
              label="Climbs per Session"
              value={(stats.totalClimbs / stats.totalSessions || 0).toFixed(1)}
              color="text-yellow-500"
              settings={settings}
            />
            <MetricCard
              icon={<Clock size={20} />}
              label="Avg Session Duration"
              value={`${Math.round((climbingSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / climbingSessions.length) || 0)} min`}
              color="text-blue-500"
              settings={settings}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, settings }: { icon: JSX.Element; label: string; value: React.ReactNode; settings: any }) => (
  <div className={`p-4 rounded-lg ${settings.darkMode ? 'bg-gray-800' : 'bg-white'} border ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
    <div className="flex items-center space-x-2 mb-2">
      {icon}
      <span className={`text-sm font-medium ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
    </div>
    <p className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
  </div>
);

const MetricCard = ({ icon, label, value, color, settings }: { icon: JSX.Element; label: string; value: string | number; color: string; settings: any }) => (
  <div className={`p-4 rounded-lg ${settings.darkMode ? 'bg-gray-800' : 'bg-white'} border ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
    <div className={`flex items-center justify-center mb-3 ${color}`}>
      {icon}
    </div>
    <p className={`text-sm text-center ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
    <p className={`text-xl font-bold text-center mt-1 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
  </div>
);

export default ClimbingProgress;