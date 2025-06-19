import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Search, 
  ChevronDown,
  Calendar
} from 'lucide-react';
import { ViewMode, viewModeLabels } from './types';
import { useAppContext } from '../../../context/AppContext';

interface CalendarHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onSearch: () => void;
  onClose: () => void;
  settings: any;
}

// Define consistent colors for habits
const HABIT_COLORS: { [key: string]: string } = {
  'Hangboard': '#8B5CF6', // Purple
  'Cold Shower': '#3B82F6', // Blue
  'Tech Usage': '#EF4444', // Red
  'Porn Free': '#10B981', // Green
  'Climbing': '#F59E0B', // Amber
};

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewMode,
  setViewMode,
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  onSearch,
  onClose,
  settings
}) => {
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { habitDefinitions } = useAppContext();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowViewDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (viewMode === 'year') {
      return currentDate.getFullYear().toString();
    } else if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return '';
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  return (
    <div className={`px-6 py-4 border-b ${
      settings.darkMode ? 'border-gray-800' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Calendar className={`w-6 h-6 ${
              settings.darkMode ? 'text-purple-400' : 'text-purple-600'
            }`} />
            <h2 className={`text-2xl font-semibold ${
              settings.darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Calendar
            </h2>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleToday}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              settings.darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Today
          </motion.button>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateDate('prev')}
              className={`p-2 rounded-lg transition-all ${
                settings.darkMode 
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <ChevronLeft size={20} />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateDate('next')}
              className={`p-2 rounded-lg transition-all ${
                settings.darkMode 
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>

          <h3 className={`text-lg font-medium ${
            settings.darkMode ? 'text-gray-100' : 'text-gray-800'
          }`}>
            {getViewTitle()}
          </h3>

          {/* Habit Legend - Only show in month view */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-3 ml-6 pl-6 border-l border-gray-300 dark:border-gray-700">
              {habitDefinitions && habitDefinitions.map((habitDef: any) => (
                <div key={habitDef.id} className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: HABIT_COLORS[habitDef.name] || '#6B7280' }}
                  />
                  <span className={`text-xs ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {habitDef.name}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: HABIT_COLORS['Climbing'] }}
                />
                <span className={`text-xs ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Climbing
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* View Mode Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                settings.darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {viewModeLabels[viewMode]}
              <ChevronDown size={16} className={`transition-transform ${
                showViewDropdown ? 'rotate-180' : ''
              }`} />
            </motion.button>

            <AnimatePresence>
              {showViewDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute right-0 mt-2 w-40 rounded-lg shadow-xl overflow-hidden z-10 ${
                    settings.darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}
                >
                  {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setViewMode(mode);
                        setShowViewDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left transition-all ${
                        viewMode === mode
                          ? settings.darkMode
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-100 text-purple-700'
                          : settings.darkMode
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {viewModeLabels[mode]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSearch}
            className={`p-2 rounded-lg transition-all ${
              settings.darkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search size={20} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={`p-2 rounded-lg transition-all ${
              settings.darkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;