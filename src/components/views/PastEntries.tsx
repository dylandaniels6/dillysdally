import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Edit, Trash, ChevronDown, ChevronUp, X, Sparkles, Clock, Moon, Sun, Activity, ChevronRight, Search, Filter, TrendingUp, Award } from 'lucide-react';
import { JournalEntry } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface AppSettings {
  darkMode: boolean;
  autoSave: boolean;
  [key: string]: any;
}

interface HabitData {
  [key: string]: {
    completed: boolean;
    streak: number;
  };
}

interface SleepData {
  phoneOff: string;
  wakeUp: string;
  quality: '😫' | '😔' | '😐' | '😊' | '🤩' | null;
}

interface DailyEntry extends JournalEntry {
  habitData?: HabitData;
  sleepData?: SleepData;
  meals?: string;
  dayRating?: number;
  miles?: number;
}

interface PastEntriesProps {
  journalEntries: JournalEntry[];
  currentEntry: DailyEntry | null;
  settings: AppSettings;
  onEditEntry: (entry: DailyEntry) => void;
  onDeleteEntry: (id: string) => void;
  getMoodIcon: (mood: string) => React.ReactNode;
}

const PastEntries: React.FC<PastEntriesProps> = ({
  journalEntries,
  currentEntry,
  settings,
  onEditEntry,
  onDeleteEntry,
  getMoodIcon
}) => {
  const [showPastEntries, setShowPastEntries] = useState(true);
  const [showAllEntriesModal, setShowAllEntriesModal] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<DailyEntry | null>(null);
  const [loadedEntriesCount, setLoadedEntriesCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [editingContent, setEditingContent] = useState('');

  // Fixed date parsing function to prevent timezone shifts
  const parseEntryDate = (dateStr: string): Date => {
    // Add noon time to prevent timezone shifting when parsing date strings
    return new Date(dateStr + 'T12:00:00');
  };

  // Enhanced formatDate function that handles timezone-safe dates
  const formatEntryDate = (dateStr: string): string => {
    const date = parseEntryDate(dateStr);
    return formatDate(date);
  };

  // Convert 24-hour time format to 12-hour format
  const formatTime12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    
    // Check if it matches HH:MM format (24-hour)
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(timeStr)) return timeStr; // Return as-is if not valid 24-hour format
    
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Show all entries except empty current entries (entries with no content saved yet)
  const filteredEntries = journalEntries.filter(entry => {
    // If this is the current entry's date, only show it if it has been saved (has content)
    if (entry.date === currentEntry?.date) {
      return entry.content && entry.content.trim().length > 0;
    }
    return true;
  });

  if (filteredEntries.length === 0) return null;

  const searchFilteredEntries = filteredEntries.filter(entry => {
    const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = !selectedMood || entry.mood === selectedMood;
    return matchesSearch && matchesMood;
  });

  const stats = {
    totalEntries: filteredEntries.length,
    currentStreak: calculateStreak(filteredEntries),
    avgMood: calculateAverageMood(filteredEntries)
  };

  function calculateStreak(entries: JournalEntry[]) {
    // Simple streak calculation with fixed date handling
    const sortedEntries = [...entries].sort((a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime());
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = parseEntryDate(sortedEntries[i].date);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  function calculateAverageMood(entries: JournalEntry[]) {
    const moodMap: { [key: string]: string } = {
      'great': '🤩',
      'good': '😊',
      'neutral': '😐',
      'bad': '😔',
      'terrible': '😫'
    };
    
    const moodCounts: { [key: string]: number } = {};
    entries.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });
    
    const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    return mostCommonMood ? moodMap[mostCommonMood[0]] || '😐' : '😐';
  }

  const handleEditInModal = () => {
    setIsEditingInModal(true);
    setEditingContent(viewingEntry?.content || '');
  };

  const handleSaveEdit = () => {
    if (viewingEntry) {
      const updatedEntry = { ...viewingEntry, content: editingContent };
      onEditEntry(updatedEntry);
      setIsEditingInModal(false);
      setViewingEntry(null);
    }
  };

  return (
    <>
      {/* Past Entries Section - Collapsible with Modern Design */}
      <div className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
        settings.darkMode 
          ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gray-700/50' 
          : 'bg-gradient-to-br from-white/90 to-gray-50/90 border border-gray-200/50'
      } backdrop-blur-xl shadow-2xl`}>
        
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient" />
        
        <div className="relative p-6">
          {/* Header Section */}
          <div 
            className="flex justify-between items-center cursor-pointer group"
            onClick={() => setShowPastEntries(!showPastEntries)}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`}>
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Previous Entries
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllEntriesModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                  settings.darkMode
                    ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20'
                }`}
              >
                <span>View All</span>
                <ChevronRight size={16} />
              </button>
              
              <div className={`p-2 rounded-xl transition-all duration-300 ${
                settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-200/50'
              }`}>
                {showPastEntries ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>
          
          {/* Collapsible Content with Staggered Animation */}
          {showPastEntries && (
            <div className="mt-6 space-y-3 animate-fadeIn">
              {searchFilteredEntries
                .sort((a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime())
                .slice(0, 5)
                .map((entry, index) => (
                  <div 
                    key={entry.id}
                    className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-slideIn border ${
                      settings.darkMode 
                        ? 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-gray-600/50' 
                        : 'bg-white/50 hover:bg-gray-50/50 border-gray-200/50 hover:border-gray-300/50'
                    } backdrop-blur-sm hover:shadow-xl`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => {
                      setViewingEntry(entry as DailyEntry);
                      setEditingContent(entry.content);
                    }}
                  >
                    {/* Hover Gradient Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 rounded-xl transition-all duration-300" />
                    
                    <div className="relative flex justify-between items-start">
                      <div className="flex-1">
                        {/* Enhanced Mood and Sleep Display */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            settings.darkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100/50 text-gray-600'
                          }`}>
                            <Clock size={14} />
                            <span>{formatEntryDate(entry.date)}</span>
                          </div>
                          
                          {/* Mood and Sleep Times Container */}
                          <div className="flex items-center gap-2">
                            {/* Mood Icon */}
                            <div className="relative group/mood">
                              <div className={`p-1.5 rounded-xl transition-all duration-300 hover:scale-110 ${
                                settings.darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50'
                              }`}>
                                {getMoodIcon(entry.mood)}
                              </div>
                            </div>
                            
                            {/* Sleep Times Display */}
                            {(entry as DailyEntry).sleepData && ((entry as DailyEntry).sleepData?.wakeUp || (entry as DailyEntry).sleepData?.phoneOff) && (
                              <div className="flex items-center gap-1.5">
                                {/* Wake Up Time */}
                                {(entry as DailyEntry).sleepData?.wakeUp && (
                                  <div className="group/wake relative">
                                    <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-300 hover:scale-105 ${
                                      settings.darkMode 
                                        ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 hover:from-orange-500/30 hover:to-yellow-500/30 border border-orange-500/30' 
                                        : 'bg-gradient-to-r from-orange-100/80 to-yellow-100/80 hover:from-orange-200/80 hover:to-yellow-200/80 border border-orange-300/50'
                                    } backdrop-blur-sm shadow-sm hover:shadow-md`}>
                                      {/* Animated Sun Icon */}
                                      <div className="relative">
                                        <span className="text-xs animate-pulse">☀️</span>
                                        <div className="absolute inset-0 animate-spin-slow opacity-30">
                                          <div className="w-full h-full rounded-full bg-gradient-radial from-yellow-400/20 to-transparent"></div>
                                        </div>
                                      </div>
                                      
                                      {/* Time Display */}
                                      <span className={`text-xs font-semibold tracking-wider font-mono ${
                                        settings.darkMode ? 'text-orange-200' : 'text-orange-700'
                                      }`}>
                                        {formatTime12Hour((entry as DailyEntry).sleepData?.wakeUp || '')}
                                      </span>
                                    </div>
                                    
                                    {/* Hover Tooltip */}
                                    <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover/wake:opacity-100 transition-all duration-200 pointer-events-none z-10 ${
                                      settings.darkMode 
                                        ? 'bg-gray-800 text-orange-300 border border-orange-500/30' 
                                        : 'bg-white text-orange-700 border border-orange-300 shadow-lg'
                                    }`}>
                                      Wake up
                                      <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent ${
                                        settings.darkMode ? 'border-t-gray-800' : 'border-t-white'
                                      }`}></div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Phone Off Time */}
                                {(entry as DailyEntry).sleepData?.phoneOff && (
                                  <div className="group/phone relative">
                                    <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-300 hover:scale-105 ${
                                      settings.darkMode 
                                        ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30' 
                                        : 'bg-gradient-to-r from-indigo-100/80 to-purple-100/80 hover:from-indigo-200/80 hover:to-purple-200/80 border border-indigo-300/50'
                                    } backdrop-blur-sm shadow-sm hover:shadow-md`}>
                                      {/* Animated Moon Icon */}
                                      <div className="relative">
                                        <span className="text-xs animate-pulse">🌙</span>
                                        <div className="absolute inset-0 animate-bounce-slow opacity-30">
                                          <div className="w-full h-full rounded-full bg-gradient-radial from-indigo-400/20 to-transparent"></div>
                                        </div>
                                      </div>
                                      
                                      {/* Time Display */}
                                      <span className={`text-xs font-semibold tracking-wider font-mono ${
                                        settings.darkMode ? 'text-indigo-200' : 'text-indigo-700'
                                      }`}>
                                        {formatTime12Hour((entry as DailyEntry).sleepData?.phoneOff || '')}
                                      </span>
                                    </div>
                                    
                                    {/* Hover Tooltip */}
                                    <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover/phone:opacity-100 transition-all duration-200 pointer-events-none z-10 ${
                                      settings.darkMode 
                                        ? 'bg-gray-800 text-indigo-300 border border-indigo-500/30' 
                                        : 'bg-white text-indigo-700 border border-indigo-300 shadow-lg'
                                    }`}>
                                      Phone off
                                      <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent ${
                                        settings.darkMode ? 'border-t-gray-800' : 'border-t-white'
                                      }`}></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <h4 className={`font-semibold text-lg mb-1 ${
                          settings.darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {formatEntryDate(entry.date)}
                        </h4>
                        
                        <p className={`text-sm line-clamp-2 ${
                          settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {entry.content}
                        </p>

                        {/* Visual Progress Indicators */}
                        {(entry as DailyEntry).habitData && (
                          <div className="mt-3 flex gap-2">
                            {Object.entries((entry as DailyEntry).habitData!).slice(0, 4).map(([key, value]: [string, any]) => (
                              <div
                                key={key}
                                className={`h-1.5 w-12 rounded-full overflow-hidden ${
                                  settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                              >
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    value.completed ? 'bg-gradient-to-r from-green-400 to-emerald-500' : ''
                                  }`}
                                  style={{ width: value.completed ? '100%' : '0%' }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {entry.ai_reflection && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="p-1.5 bg-purple-500/20 rounded-lg">
                              <Sparkles size={14} className="text-purple-400" />
                            </div>
                            <span className="text-xs font-medium text-purple-400">AI Reflection</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingEntry(entry as DailyEntry);
                            setIsEditingInModal(true);
                            setEditingContent(entry.content);
                          }}
                          className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                            settings.darkMode 
                              ? 'hover:bg-gray-600/50 text-gray-400 hover:text-white' 
                              : 'hover:bg-gray-200/50 text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this entry?')) {
                              onDeleteEntry(entry.id);
                            }
                          }}
                          className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                            settings.darkMode 
                              ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' 
                              : 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* View Entry Modal */}
      {viewingEntry && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[10002] p-4"
          onClick={() => {
            setViewingEntry(null);
            setIsEditingInModal(false);
            setEditingContent('');
          }}
        >
          <div 
            className={`max-w-4xl w-full rounded-2xl shadow-2xl ${
              settings.darkMode ? 'bg-gray-900/95 dark' : 'bg-white/95'
            } backdrop-blur-xl border border-white/20 animate-slideIn`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Gradient */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
              <div className="relative p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                      <Calendar className="text-white" size={20} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-medium ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>{formatEntryDate(viewingEntry.date)}</span>
                      <div className="flex items-center gap-2">
                        {getMoodIcon(viewingEntry.mood)}
                        <span className={`capitalize text-sm ${
                          settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>{viewingEntry.mood}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setViewingEntry(null);
                      setIsEditingInModal(false);
                      setEditingContent('');
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200 hover:scale-105"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-8 pb-8">
              {/* Main Journal Content */}
              <div className={`mt-4 p-6 rounded-2xl border-2 transition-all duration-300 ${
                settings.darkMode 
                  ? 'bg-gray-800/50 border-gray-700/50' 
                  : 'bg-gray-50/50 border-gray-200/50'
              }`}>
                {isEditingInModal ? (
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className={`w-full min-h-[300px] p-4 rounded-xl border-2 transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      settings.darkMode 
                        ? 'bg-gray-900/50 border-gray-700 text-white' 
                        : 'bg-white/50 border-gray-200 text-gray-900'
                    }`}
                    autoFocus
                  />
                ) : (
                  <p className={`whitespace-pre-line leading-relaxed ${
                    settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {viewingEntry.content}
                  </p>
                )}
              </div>

              {/* AI Reflection */}
              {viewingEntry.ai_reflection && (
                <div className="mt-6 relative overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10" />
                  <div className="relative p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                        <Sparkles size={20} className="text-white" />
                      </div>
                      <h4 className={`font-semibold text-lg ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>AI Reflection</h4>
                    </div>
                    <p className={`whitespace-pre-line leading-relaxed ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {viewingEntry.ai_reflection}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Data Cards */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Habit Data */}
                {viewingEntry.habitData && Object.keys(viewingEntry.habitData).length > 0 && (
                  <div className={`p-5 rounded-xl ${
                    settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'
                  } backdrop-blur-sm border ${
                    settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={18} className="text-green-500" />
                      <h5 className={`font-medium ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>Daily Habits</h5>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(viewingEntry.habitData).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className={`text-sm capitalize ${
                            settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className={`text-sm font-medium ${
                            value.completed ? 'text-green-500' : 'text-gray-400'
                          }`}>
                            {value.completed ? '✓' : '○'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sleep Data */}
                {viewingEntry.sleepData && (viewingEntry.sleepData.phoneOff || viewingEntry.sleepData.wakeUp) && (
                  <div className={`p-5 rounded-xl ${
                    settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'
                  } backdrop-blur-sm border ${
                    settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Moon size={18} className="text-blue-500" />
                      <h5 className={`font-medium ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>Sleep Data</h5>
                    </div>
                    <div className="space-y-2 text-sm">
                      {viewingEntry.sleepData.phoneOff && (
                        <div className={`flex justify-between ${
                          settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <span>Phone off</span>
                          <span className="font-medium">{formatTime12Hour(viewingEntry.sleepData.phoneOff)}</span>
                        </div>
                      )}
                      {viewingEntry.sleepData.wakeUp && (
                        <div className={`flex justify-between ${
                          settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <span>Wake up</span>
                          <span className="font-medium">{formatTime12Hour(viewingEntry.sleepData.wakeUp)}</span>
                        </div>
                      )}
                      {viewingEntry.sleepData.quality && (
                        <div className={`flex justify-between ${
                          settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <span>Quality</span>
                          <span className="font-medium">{viewingEntry.sleepData.quality}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Meals */}
              {viewingEntry.meals && (
                <div className={`mt-4 p-5 rounded-xl ${
                  settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'
                } backdrop-blur-sm border ${
                  settings.darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
                }`}>
                  <h5 className={`font-medium mb-2 ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>Meals</h5>
                  <p className={`text-sm whitespace-pre-line ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>{viewingEntry.meals}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t dark:border-gray-700/50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setViewingEntry(null);
                    setIsEditingInModal(false);
                    setEditingContent('');
                  }}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${
                    settings.darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Close
                </button>
                {isEditingInModal ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingInModal(false);
                      }}
                      className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${
                        settings.darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditInModal}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    Edit Entry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View All Entries Modal */}
      {showAllEntriesModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[10002] p-4">
          <div className={`max-w-6xl w-full h-[90vh] rounded-2xl shadow-2xl ${
            settings.darkMode ? 'bg-gray-900/95 dark' : 'bg-white/95'
          } backdrop-blur-xl border border-white/20 flex flex-col animate-slideIn`}>
            
            {/* Header */}
            <div className="p-6 border-b dark:border-gray-700/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    All Journal Entries
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowAllEntriesModal(false);
                    setLoadedEntriesCount(10);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search and Filter Bar */}
              <div className="mt-4 flex gap-3">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      settings.darkMode 
                        ? 'bg-gray-800/50 border-gray-700 text-white' 
                        : 'bg-white/50 border-gray-200'
                    }`}
                  />
                </div>
                
                <div className="flex gap-2">
                  {['great', 'good', 'neutral', 'bad', 'terrible'].map(mood => (
                    <button
                      key={mood}
                      onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                      className={`p-2.5 rounded-xl transition-all duration-200 hover:scale-105 ${
                        selectedMood === mood
                          ? 'bg-blue-500/20 border-2 border-blue-500'
                          : settings.darkMode
                          ? 'bg-gray-800/50 border-2 border-gray-700 hover:border-gray-600'
                          : 'bg-white/50 border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {getMoodIcon(mood)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div 
              className="flex-1 overflow-y-auto p-6"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;
                if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
                  if (loadedEntriesCount < searchFilteredEntries.length) {
                    setLoadedEntriesCount(prev => Math.min(prev + 10, searchFilteredEntries.length));
                  }
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchFilteredEntries
                  .sort((a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime())
                  .slice(0, loadedEntriesCount)
                  .map((entry, index) => (
                    <div 
                      key={entry.id}
                      className={`group relative p-5 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-fadeIn border ${
                        settings.darkMode 
                          ? 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50' 
                          : 'bg-white/50 hover:bg-gray-50/50 border-gray-200/50'
                      } backdrop-blur-sm hover:shadow-xl`}
                      style={{ animationDelay: `${(index % 10) * 50}ms` }}
                      onClick={() => {
                        setViewingEntry(entry as DailyEntry);
                        setShowAllEntriesModal(false);
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="text-sm font-medium">{formatEntryDate(entry.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getMoodIcon(entry.mood)}
                        </div>
                      </div>
                      
                      <h4 className={`font-semibold mb-2 ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {formatEntryDate(entry.date)}
                      </h4>
                      
                      <p className={`text-sm line-clamp-3 ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {entry.content}
                      </p>

                      {entry.ai_reflection && (
                        <div className="mt-3 flex items-center gap-2">
                          <Sparkles size={14} className="text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">AI Reflection</span>
                        </div>
                      )}

                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditEntry(entry as DailyEntry);
                            setShowAllEntriesModal(false);
                          }}
                          className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this entry?')) {
                              onDeleteEntry(entry.id);
                            }
                          }}
                          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Loading Indicator */}
              {loadedEntriesCount < searchFilteredEntries.length && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    </div>
                    <span>Loading more entries...</span>
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchFilteredEntries.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Calendar size={48} className="mx-auto opacity-50" />
                  </div>
                  <p className="text-gray-500">No entries found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Enhanced Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes gradient {
          0% { transform: rotate(0deg) scale(1.5); }
          50% { transform: rotate(180deg) scale(2); }
          100% { transform: rotate(360deg) scale(1.5); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
        
        .animate-gradient {
          animation: gradient 10s ease infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-to));
        }
        
        /* Enhanced micro-interactions */
        .group/wake:hover .animate-pulse {
          animation-duration: 0.8s;
        }
        
        .group/wake:hover .animate-spin-slow {
          animation-duration: 2s;
        }
        
        .group/phone:hover .animate-pulse {
          animation-duration: 0.8s;
        }
        
        .group/phone:hover .animate-bounce-slow {
          animation-duration: 1s;
        }
      `}</style>
    </>
  );
};

export default PastEntries;