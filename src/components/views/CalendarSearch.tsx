import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Edit3, Mountain, Calendar, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatISODate, formatDate } from '../../utils/dateUtils';

interface SearchResult {
  id: string;
  type: 'journal' | 'climbing';
  date: string;
  title: string;
  content: string;
  highlightedContent: string;
  data: any;
  score: number;
}

interface CalendarSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

const CalendarSearch: React.FC<CalendarSearchProps> = ({ isOpen, onClose, onSelectDate }) => {
  const { journalEntries, climbingSessions, settings } = useAppContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input when opened - FIXED: Removed the problematic isAnimating state
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Highlight search terms in text
  const highlightText = (text: string, searchQuery: string): string => {
    if (!searchQuery.trim()) return text;
    
    const words = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    let highlightedText = text;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-300 text-yellow-900 rounded px-1">$1</mark>');
    });
    
    return highlightedText;
  };

  // Get context around search term
  const getSearchContext = (text: string, searchQuery: string, maxLength: number = 150): string => {
    if (!searchQuery.trim()) return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    
    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    const words = lowerQuery.split(/\s+/).filter(word => word.length > 0);
    
    let bestIndex = -1;
    let bestWord = '';
    
    // Find the first occurrence of any search word
    for (const word of words) {
      const index = lowerText.indexOf(word);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
        bestWord = word;
      }
    }
    
    if (bestIndex === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    // Calculate context window
    const contextRadius = Math.floor((maxLength - bestWord.length) / 2);
    const start = Math.max(0, bestIndex - contextRadius);
    const end = Math.min(text.length, bestIndex + bestWord.length + contextRadius);
    
    let context = text.substring(start, end);
    
    // Add ellipsis if needed
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  };

  // Calculate search score
  const calculateScore = (text: string, searchQuery: string): number => {
    if (!searchQuery.trim()) return 0;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    const words = lowerQuery.split(/\s+/).filter(word => word.length > 0);
    
    let score = 0;
    
    words.forEach(word => {
      // Exact word match (highest score)
      const exactMatches = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      score += exactMatches * 10;
      
      // Partial word match
      const partialMatches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      score += partialMatches * 5;
      
      // Bonus for matches at beginning
      if (lowerText.startsWith(word)) score += 5;
    });
    
    return score;
  };

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchResults: SearchResult[] = [];

    // Search journal entries
    journalEntries.forEach(entry => {
      const searchableText = `${entry.title || ''} ${entry.content || ''} ${entry.gratitude || ''}`.trim();
      const score = calculateScore(searchableText, query);
      
      if (score > 0) {
        const context = getSearchContext(searchableText, query);
        const highlightedContent = highlightText(context, query);
        
        searchResults.push({
          id: `journal-${entry.date}`,
          type: 'journal',
          date: entry.date,
          title: entry.title || 'Journal Entry',
          content: context,
          highlightedContent,
          data: entry,
          score
        });
      }
    });

    // Search climbing sessions
    climbingSessions.forEach(session => {
      const searchableText = `${session.location || ''} ${session.notes || ''} ${session.routes?.map(r => `${r.name} ${r.grade}`).join(' ') || ''}`.trim();
      const score = calculateScore(searchableText, query);
      
      if (score > 0) {
        const context = getSearchContext(searchableText, query);
        const highlightedContent = highlightText(context, query);
        
        searchResults.push({
          id: `climbing-${session.date}`,
          type: 'climbing',
          date: session.date,
          title: `Climbing at ${session.location || 'Unknown Location'}`,
          content: context,
          highlightedContent,
          data: session,
          score
        });
      }
    });

    // Sort by score (descending) and limit results
    const sortedResults = searchResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    setResults(sortedResults);
    setSelectedIndex(0);
  }, [query, journalEntries, climbingSessions]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

  const handleSelectResult = (result: SearchResult) => {
    const date = new Date(result.date + 'T00:00:00');
    onSelectDate(date);
    onClose();
  };

  const formatResultDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getResultIcon = (type: 'journal' | 'climbing') => {
    return type === 'journal' ? 
      <Edit3 className="text-blue-500" size={18} /> : 
      <Mountain className="text-green-500" size={18} />;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 animate-in fade-in-0 duration-300"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl mx-4 animate-in slide-in-from-top-4 duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className={`relative mb-4 shadow-2xl ${
          settings.darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl overflow-hidden border ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className="pl-6 pr-4 py-4">
              <Search className={`${
                settings.darkMode ? 'text-gray-400' : 'text-gray-500'
              } transition-colors duration-200`} size={20} />
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search journal entries and climbing sessions..."
              className={`flex-1 py-4 pr-4 text-lg placeholder-gray-400 bg-transparent outline-none ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}
              autoComplete="off"
              spellCheck="false"
            />
            
            <button
              onClick={onClose}
              className={`p-4 mr-2 rounded-xl transition-all duration-200 hover:scale-110 ${
                settings.darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Results */}
        {query.trim() && (
          <div 
            ref={resultsRef}
            className={`max-h-96 overflow-y-auto shadow-2xl rounded-2xl border ${
              settings.darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            } animate-in slide-in-from-top-2 duration-300`}
          >
            {results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={`px-6 py-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                      index === selectedIndex
                        ? settings.darkMode 
                          ? 'bg-blue-600/20 border-l-4 border-blue-500' 
                          : 'bg-blue-50 border-l-4 border-blue-500'
                        : settings.darkMode 
                          ? 'hover:bg-gray-700/50' 
                          : 'hover:bg-gray-50'
                    } ${index !== results.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getResultIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-semibold truncate ${
                            settings.darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {result.title}
                          </h4>
                          <span className={`text-sm flex-shrink-0 ml-3 ${
                            settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {formatResultDate(result.date)}
                          </span>
                        </div>
                        
                        <div 
                          className={`text-sm leading-relaxed ${
                            settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}
                          dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                        />
                        
                        <div className="flex items-center mt-2 text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            result.type === 'journal'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {result.type === 'journal' ? 'Journal' : 'Climbing'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <ChevronRight className={`${
                          settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                        }`} size={16} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Search className={`mx-auto mb-3 ${
                  settings.darkMode ? 'text-gray-600' : 'text-gray-400'
                }`} size={48} />
                <p className={`text-lg font-medium mb-2 ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  No results found
                </p>
                <p className={`text-sm ${
                  settings.darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Try searching for something else
                </p>
              </div>
            )}
          </div>
        )}

        {/* Search Tips */}
        {!query.trim() && (
          <div className={`mt-4 p-6 rounded-2xl border ${
            settings.darkMode 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-gray-50/50 border-gray-200'
          } animate-in fade-in-50 duration-300`}>
            <div className="text-center">
              <Search className={`mx-auto mb-3 ${
                settings.darkMode ? 'text-gray-600' : 'text-gray-400'
              }`} size={32} />
              <h3 className={`font-semibold mb-2 ${
                settings.darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Search your data
              </h3>
              <p className={`text-sm mb-4 ${
                settings.darkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>
                Find journal entries and climbing sessions instantly
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="flex items-center gap-3">
                  <Edit3 className="text-blue-500" size={16} />
                  <span className={`text-sm ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Journal entries
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mountain className="text-green-500" size={16} />
                  <span className={`text-sm ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Climbing sessions
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarSearch;