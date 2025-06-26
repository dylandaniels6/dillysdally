import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// Types
interface ClimbTypeFilters {
  gym: boolean;
  kilter: boolean;
}

interface ClimbData {
  V6: number;
  V7: number;
  V8: number;
  V9: number;
  V10: number;
}

interface StackedClimbData {
  grade: string;
  gym: number;
  kilter: number;
  total: number;
}

interface ChartFilterDropdownProps {
  filters: ClimbTypeFilters;
  onFiltersChange: (filters: ClimbTypeFilters) => void;
  darkMode?: boolean;
}

// Chart Filter Dropdown Component
export const ChartFilterDropdown: React.FC<ChartFilterDropdownProps> = ({
  filters,
  onFiltersChange,
  darkMode = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (filterType: keyof ClimbTypeFilters, checked: boolean) => {
    const newFilters = { ...filters, [filterType]: checked };
    onFiltersChange(newFilters);
  };

  const getActiveFilterText = () => {
    if (filters.gym && filters.kilter) return 'All Climbs';
    if (filters.gym) return 'Gym Only';
    if (filters.kilter) return 'Kilter Only';
    return 'No Data';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          darkMode
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
        }`}
      >
        <span>{getActiveFilterText()}</span>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-2 space-y-1">
            {/* Gym filter */}
            <label className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer group transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={filters.gym}
                  onChange={(e) => handleFilterChange('gym', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  filters.gym
                    ? 'bg-blue-500 border-blue-500'
                    : darkMode
                    ? 'border-gray-500 group-hover:border-gray-400'
                    : 'border-gray-400 group-hover:border-gray-500'
                }`}>
                  {filters.gym && (
                    <Check size={12} className="text-white absolute inset-0 m-auto" />
                  )}
                </div>
              </div>
              <span className={`text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Gym Climbs
              </span>
              <div className="flex-1" />
              <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-400 to-blue-700" />
            </label>

            {/* Kilter filter */}
            <label className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer group transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={filters.kilter}
                  onChange={(e) => handleFilterChange('kilter', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  filters.kilter
                    ? 'bg-purple-500 border-purple-500'
                    : darkMode
                    ? 'border-gray-500 group-hover:border-gray-400'
                    : 'border-gray-400 group-hover:border-gray-500'
                }`}>
                  {filters.kilter && (
                    <Check size={12} className="text-white absolute inset-0 m-auto" />
                  )}
                </div>
              </div>
              <span className={`text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Kilter Climbs
              </span>
              <div className="flex-1" />
              <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-800 to-purple-500" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// Chart Color Utilities - Seamless Blue-to-Purple Transition
export const getGymGradient = () => 'linear-gradient(to top, #60A5FA, #1E40AF)'; // Light blue to dark blue
export const getKilterGradient = () => 'linear-gradient(to top, #1E40AF 0%, #1E40AF 12%, #8B5CF6 100%)'; // Dark blue holds for 12%, then to purple

export const getStackedGradient = (gymCount: number, kilterCount: number, maxCount: number) => {
  const total = gymCount + kilterCount;
  if (total === 0) return '#374151'; // Gray for empty bars

  const gymPercentage = (gymCount / total) * 100;
  
  if (gymCount > 0 && kilterCount > 0) {
    // Seamless transition: gym ends at dark blue, kilter holds dark blue for 12% then transitions to purple
    const bridgeColor = '#1E40AF'; // Dark blue - the bridge between gym and kilter
    const kilterStartPercentage = gymPercentage;
    const kilterTransitionStart = gymPercentage + ((100 - gymPercentage) * 0.12); // 12% into kilter section
    
    return `linear-gradient(to top, 
      #60A5FA 0%, 
      ${bridgeColor} ${gymPercentage}%, 
      ${bridgeColor} ${kilterTransitionStart}%,
      #8B5CF6 100%)`;
  } else if (gymCount > 0) {
    // Only gym - light blue to dark blue
    return 'linear-gradient(to top, #60A5FA, #1E40AF)';
  } else {
    // Only kilter - dark blue holds for 12%, then to purple
    return 'linear-gradient(to top, #1E40AF 0%, #1E40AF 12%, #8B5CF6 100%)';
  }
};

// Data Processing Utilities
export const combineClimbData = (
  gymData: ClimbData, 
  kilterData: ClimbData
): StackedClimbData[] => {
  const grades = ['V6', 'V7', 'V8', 'V9', 'V10'] as const;
  
  return grades.map(grade => ({
    grade,
    gym: gymData[grade] || 0,
    kilter: kilterData[grade] || 0,
    total: (gymData[grade] || 0) + (kilterData[grade] || 0)
  }));
};

export const filterClimbData = (
  stackedData: StackedClimbData[],
  filters: ClimbTypeFilters
): StackedClimbData[] => {
  return stackedData.map(item => ({
    ...item,
    gym: filters.gym ? item.gym : 0,
    kilter: filters.kilter ? item.kilter : 0,
    total: (filters.gym ? item.gym : 0) + (filters.kilter ? item.kilter : 0)
  }));
};

// Session Preview Utilities (always shows both types)
export const getSessionPreviewData = (
  gymCounts: ClimbData,
  kilterCounts: ClimbData
): StackedClimbData[] => {
  return combineClimbData(gymCounts, kilterCounts);
};

export const getMaxCount = (stackedData: StackedClimbData[]): number => {
  return Math.max(...stackedData.map(item => item.total), 1); // Minimum 1 to avoid division by zero
};

// Chart Rendering Utilities
export const renderStackedBar = (
  data: StackedClimbData,
  maxCount: number,
  heightPx: number = 120
) => {
  const heightPixels = data.total > 0 ? (data.total / maxCount) * heightPx : 0;
  
  return {
    height: `${heightPixels}px`,
    background: getStackedGradient(data.gym, data.kilter, maxCount),
    minHeight: data.total > 0 ? '24px' : '4px'
  };
};

// Chart Component for Session Preview
interface SessionPreviewChartProps {
  gymCounts: ClimbData;
  kilterCounts: ClimbData;
  darkMode?: boolean;
}

export const SessionPreviewChart: React.FC<SessionPreviewChartProps> = ({
  gymCounts,
  kilterCounts,
  darkMode = false
}) => {
  const stackedData = getSessionPreviewData(gymCounts, kilterCounts);
  const maxCount = getMaxCount(stackedData);
  const totalClimbs = stackedData.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex items-end justify-between space-x-3 h-32">
      {stackedData.map((data) => {
        const barStyle = renderStackedBar(data, maxCount);
        
        return (
          <div key={data.grade} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t-lg transition-all duration-500 ease-out relative flex items-end justify-center"
              style={barStyle}
            >
              {data.total > 0 && (
                <span className={`text-white font-bold text-sm ${data.total === 1 ? 'pb-1' : 'pb-2'}`}>
                  {data.total}
                </span>
              )}
            </div>
            <span className={`text-xs mt-2 font-medium ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {data.grade}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default {
  ChartFilterDropdown,
  SessionPreviewChart,
  combineClimbData,
  filterClimbData,
  getSessionPreviewData,
  getMaxCount,
  renderStackedBar,
  getGymGradient,
  getKilterGradient,
  getStackedGradient
};