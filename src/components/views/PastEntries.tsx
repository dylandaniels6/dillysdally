import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Edit, Trash, ChevronDown, ChevronUp, X, Sparkles, Clock, Moon, Sun, Activity, ChevronRight, Search, Filter, TrendingUp, Award } from 'lucide-react';
import { JournalEntry } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { Button, IconButton } from '../common/Button';
import { designSystem } from '../../utils/designSystem';

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
    
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(timeStr)) return timeStr;
    
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get past entries excluding current entry
  const pastEntries = journalEntries
    .filter(entry => entry.date !== currentEntry?.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Get all entries for modal with filtering
  const allEntries = journalEntries
    .filter(entry => entry.date !== currentEntry?.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply search and mood filters
  const searchFilteredEntries = allEntries.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMood = !selectedMood || entry.mood === selectedMood;
    
    return matchesSearch && matchesMood;
  });

  // Get visible entries for modal (with pagination)
  const visibleModalEntries = searchFilteredEntries.slice(0, loadedEntriesCount);

  // Load more entries when scrolling in modal
  useEffect(() => {
    if (!showAllEntriesModal) return;

    const handleScroll = (e: Event) => {
      const element = e.target as HTMLElement;
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 100) {
        setLoadedEntriesCount(prev => Math.min(prev + 10, searchFilteredEntries.length));
      }
    };

    const modalContent = document.getElementById('entries-modal-content');
    modalContent?.addEventListener('scroll', handleScroll);
    return () => modalContent?.removeEventListener('scroll', handleScroll);
  }, [showAllEntriesModal, searchFilteredEntries.length]);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setLoadedEntriesCount(10);
  }, [searchQuery, selectedMood]);

  // Calculate mood statistics
  const moodStats = allEntries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonMood = Object.entries(moodStats).sort(([,a], [,b]) => b - a);
  const moodIcon = mostCommonMood.length > 0 ? getMoodIcon(mostCommonMood[0][0]) || '😐' : '😐';

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
    <div className="w-full space-y-6">
      
      {/* Professional Header with proper bottom spacing */}
      <div className="flex items-center justify-between pb-2 mb-6 border-b border-white/5">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Calendar size={24} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Previous Entries
            </h3>
            <p className="text-sm text-white/60">
              {allEntries.length} journal entries
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowAllEntriesModal(true)}
            variant="secondary"
            size="sm"
            icon={<ChevronRight size={16} />}
            iconPosition="right"
          >
            View All
          </Button>
          
          <IconButton
            icon={showPastEntries ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            onClick={() => setShowPastEntries(!showPastEntries)}
            variant="ghost"
            size="md"
            className="text-white/60"
          />
        </div>
      </div>

      {/* Recent Entries - Collapsible */}
      {showPastEntries && (
        <div className="space-y-4">
          {pastEntries.length > 0 ? (
            pastEntries.map((entry, index) => (
              <div
                key={entry.id}
                onClick={() => setViewingEntry(entry as DailyEntry)}
                className="relative p-6 rounded-2xl border cursor-pointer bg-white/5 border-white/10 transition-colors duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getMoodIcon(entry.mood)}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white mb-1">
                        {formatEntryDate(entry.date)}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-white/50 capitalize">
                          {entry.mood}
                        </span>
                        {entry.ai_reflection && (
                          <>
                            <span className="text-white/30">•</span>
                            <div className="flex items-center space-x-1">
                              <Sparkles size={12} className="text-purple-400" />
                              <span className="text-xs text-purple-400">
                                AI Reflection
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Always visible, no hover effects */}
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEntry(entry as DailyEntry);
                      }}
                      className="p-2 rounded-lg text-blue-400 transition-colors duration-200"
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
                      className="p-2 rounded-lg text-red-400 transition-colors duration-200"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Content Preview */}
                <p className="text-sm text-white/70 line-clamp-3 mb-4">
                  {entry.content}
                </p>

                {/* Progress Indicators */}
                {(entry as DailyEntry).habitData && (
                  <div className="flex space-x-2">
                    {Object.entries((entry as DailyEntry).habitData!).slice(0, 4).map(([key, value]: [string, any]) => (
                      <div
                        key={key}
                        className="h-1.5 w-12 rounded-full overflow-hidden bg-white/10"
                      >
                        <div
                          className={
                            'h-full transition-all duration-500 ' +
                            (value.completed ? 'bg-gradient-to-r from-green-400 to-emerald-500' : '')
                          }
                          style={{ width: value.completed ? '100%' : '0%' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={32} className="text-blue-400" />
              </div>
              <p className="text-base text-white/60 mb-2">
                No previous entries yet
              </p>
              <p className="text-sm text-white/40">
                Start journaling to see your entries here
              </p>
            </div>
          )}
        </div>
      )}

      {/* View All Entries Modal */}
      {showAllEntriesModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={designSystem.typography.heading.lg + ' text-white'}>
                    All Journal Entries
                  </h3>
                  <p className={designSystem.typography.body.sm + ' text-white/60'}>
                    {allEntries.length} total entries
                  </p>
                </div>
                <IconButton
                  icon={<X size={20} />}
                  onClick={() => setShowAllEntriesModal(false)}
                  variant="ghost"
                  size="md"
                />
              </div>

              {/* Search and Filter Bar */}
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={designSystem.utils.cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border',
                      'bg-white/5 border-white/10 text-white placeholder-white/40',
                      'focus:outline-none focus:border-blue-500/50',
                      designSystem.typography.body.sm
                    )}
                  />
                </div>
                
                <select
                  value={selectedMood || ''}
                  onChange={(e) => setSelectedMood(e.target.value || null)}
                  className={designSystem.utils.cn(
                    'px-4 py-3 rounded-xl border',
                    'bg-white/5 border-white/10 text-white',
                    'focus:outline-none focus:border-blue-500/50',
                    designSystem.typography.body.sm
                  )}
                >
                  <option value="">All moods</option>
                  <option value="happy">😊 Happy</option>
                  <option value="sad">😢 Sad</option>
                  <option value="excited">🤩 Excited</option>
                  <option value="neutral">😐 Neutral</option>
                  <option value="anxious">😰 Anxious</option>
                  <option value="grateful">🙏 Grateful</option>
                </select>
              </div>
            </div>

            {/* Modal Content */}
            <div id="entries-modal-content" className="overflow-y-auto max-h-[60vh] p-6">
              {visibleModalEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleModalEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => setViewingEntry(entry as DailyEntry)}
                      className={designSystem.utils.cn(
                        'group relative p-6 rounded-2xl border cursor-pointer',
                        'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
                        'transition-all duration-200'
                      )}
                    >
                      {/* Entry Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{getMoodIcon(entry.mood)}</span>
                          <div>
                            <h4 className={designSystem.typography.body.md + ' font-semibold text-white'}>
                              {formatEntryDate(entry.date)}
                            </h4>
                            <span className={designSystem.typography.body.xs + ' text-white/50 capitalize'}>
                              {entry.mood}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Preview */}
                      <p className={designSystem.typography.body.sm + ' text-white/70 line-clamp-3'}>
                        {entry.content}
                      </p>

                      {/* AI Reflection Indicator */}
                      {entry.ai_reflection && (
                        <div className="mt-3 flex items-center space-x-2">
                          <Sparkles size={14} className="text-purple-400" />
                          <span className={designSystem.typography.body.xs + ' text-purple-400'}>
                            AI Reflection
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                        <IconButton
                          icon={<Edit size={14} />}
                          onClick={(e: any) => {
                            e.stopPropagation();
                            onEditEntry(entry as DailyEntry);
                            setShowAllEntriesModal(false);
                          }}
                          variant="ghost"
                          size="sm"
                          className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        />
                        <IconButton
                          icon={<Trash size={14} />}
                          onClick={(e: any) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this entry?')) {
                              onDeleteEntry(entry.id);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-blue-400" />
                  </div>
                  <p className={designSystem.typography.body.md + ' text-white/60 mb-2'}>
                    No entries found
                  </p>
                  <p className={designSystem.typography.body.sm + ' text-white/40'}>
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}

              {/* Loading Indicator */}
              {loadedEntriesCount < searchFilteredEntries.length && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center space-x-2 text-white/50">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    </div>
                    <span className={designSystem.typography.body.sm}>Loading more entries...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Individual Entry View Modal */}
      {viewingEntry && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            
            {/* Entry Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{getMoodIcon(viewingEntry.mood)}</span>
                  <div>
                    <h3 className={designSystem.typography.heading.lg + ' text-white'}>
                      {formatEntryDate(viewingEntry.date)}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={designSystem.typography.body.sm + ' text-white/60 capitalize'}>
                        {viewingEntry.mood}
                      </span>
                      {viewingEntry.ai_reflection && (
                        <>
                          <span className="text-white/30">•</span>
                          <Sparkles size={14} className="text-purple-400" />
                          <span className={designSystem.typography.body.sm + ' text-purple-400'}>
                            AI Reflection
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <IconButton
                  icon={<X size={20} />}
                  onClick={() => {
                    setViewingEntry(null);
                    setIsEditingInModal(false);
                    setEditingContent('');
                  }}
                  variant="ghost"
                  size="md"
                />
              </div>
            </div>

            {/* Entry Content */}
            <div className="overflow-y-auto max-h-[60vh] p-6">
              <div className="space-y-6">
                
                {/* Main Content */}
                <div className={designSystem.utils.cn(
                  'p-6 rounded-2xl border',
                  'bg-white/5 border-white/10'
                )}>
                  {isEditingInModal ? (
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className={designSystem.utils.cn(
                        'w-full min-h-[300px] p-4 rounded-xl border resize-none',
                        'bg-white/5 border-white/10 text-white',
                        'focus:outline-none focus:border-blue-500/50',
                        designSystem.typography.body.md
                      )}
                      autoFocus
                    />
                  ) : (
                    <p className={designSystem.typography.body.md + ' text-white/80 leading-relaxed whitespace-pre-line'}>
                      {viewingEntry.content}
                    </p>
                  )}
                </div>

                {/* AI Reflection */}
                {viewingEntry.ai_reflection && (
                  <div className={designSystem.utils.cn(
                    'p-6 rounded-2xl border',
                    'bg-purple-500/10 border-purple-500/20'
                  )}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <h4 className={designSystem.typography.body.md + ' font-semibold text-purple-300'}>
                        AI Reflection
                      </h4>
                    </div>
                    <p className={designSystem.typography.body.sm + ' text-white/80 leading-relaxed'}>
                      {viewingEntry.ai_reflection}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Entry Actions */}
            <div className="p-6 border-t border-gray-700">
              <div className="flex justify-between">
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      onEditEntry(viewingEntry);
                      setViewingEntry(null);
                    }}
                    variant="secondary"
                    size="sm"
                    icon={<Edit size={16} />}
                  >
                    Edit Entry
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this entry?')) {
                        onDeleteEntry(viewingEntry.id);
                        setViewingEntry(null);
                      }
                    }}
                    variant="danger"
                    size="sm"
                    icon={<Trash size={16} />}
                  >
                    Delete
                  </Button>
                </div>

                {isEditingInModal && (
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => {
                        setIsEditingInModal(false);
                        setEditingContent('');
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      variant="primary"
                      size="sm"
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PastEntries;