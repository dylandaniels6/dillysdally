import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';  // Fixed path
import { BarChart3 } from 'lucide-react';
import { Card } from '../../common/Card';  // Added Card import
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';

interface GradeSendsChartProps {
  selectedTimeRange: 'week' | 'month' | '6months' | 'year' | 'all';
  onTimeRangeChange: (range: 'week' | 'month' | '6months' | 'year' | 'all') => void;
}

const GradeSendsChart: React.FC<GradeSendsChartProps> = ({ selectedTimeRange, onTimeRangeChange }) => {
  const { climbingSessions, journalEntries, settings } = useAppContext();
  const [hoveredBar, setHoveredBar] = useState<{ grade: string; value: number; x: number; y: number } | null>(null);

  const timeRangeOptions = [
    { key: 'week', label: 'Week', days: 7 },
    { key: 'month', label: 'Month', days: 30 },
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

  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      V6: 0, V7: 0, V8: 0, V9: 0, V10: 0,
    };

    const allEntries = [...climbingSessions, ...journalEntries];

    allEntries.forEach(entry => {
      const date = new Date(entry.date);
      if (selectedTimeRange === 'all' || date >= startDate) {
        if ('routes' in entry && entry.routes) {
          entry.routes.forEach(r => {
            if (r.completed && counts[r.grade] !== undefined) {
              counts[r.grade] += 1;
            }
          });
        } else if ('sends' in entry && entry.sends) {
          Object.entries(entry.sends).forEach(([grade, count]) => {
            if (counts[grade] !== undefined) {
              counts[grade] += count;
            }
          });
        }
      }
    });

    return Object.entries(counts).map(([grade, value]) => ({ grade, value }));
  }, [climbingSessions, journalEntries, selectedTimeRange, startDate]);

  const maxCount = Math.max(...gradeCounts.map(g => g.value), 10);
  const roundedMax = Math.ceil(maxCount / 10) * 10;
  const gradientId = 'barGradient';

  const chartTitle = selectedTimeRange === 'all'
    ? 'Sends (All Time)'
    : `Sends This ${timeRangeOptions.find(opt => opt.key === selectedTimeRange)?.label}`;

  const handleBarMouseEnter = (data: any, index: number, event: any) => {
    if (data.value > 0) {
      const rect = event.target.getBoundingClientRect();
      const containerRect = event.target.closest('.recharts-wrapper').getBoundingClientRect();
      
      setHoveredBar({
        grade: data.grade,
        value: data.value,
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 10
      });
    }
  };

  const handleBarMouseLeave = () => {
    setHoveredBar(null);
  };

  return (
    <Card className={`p-6 ${settings.darkMode ? 'bg-gray-800' : 'bg-white'} border ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{chartTitle}</h3>
        <div className={`flex rounded-lg p-1 ${settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          {timeRangeOptions.map(option => (
            <button
              key={option.key}
              onClick={() => onTimeRangeChange(option.key as any)}
              className={`px-3 py-2 text-sm rounded-md font-medium transition-all duration-200 ${
                selectedTimeRange === option.key
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
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
                  onMouseEnter={(e: any) => {
                    if (entry.value > 0) {
                      e.target.style.transform = 'scaleY(1.08)';
                      e.target.style.filter = 'brightness(1.1)';
                      handleBarMouseEnter(entry, index, e);
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    e.target.style.transform = 'scaleY(1)';
                    e.target.style.filter = 'brightness(1)';
                    handleBarMouseLeave();
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Custom Tooltip */}
        {hoveredBar && (
          <div
            className={`absolute z-10 rounded-md px-3 py-2 text-sm shadow-md border pointer-events-none ${
              settings.darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
            }`}
            style={{
              left: hoveredBar.x,
              top: hoveredBar.y,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold">{hoveredBar.grade}</div>
            <div className="text-blue-500">{hoveredBar.value} Sends</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GradeSendsChart;