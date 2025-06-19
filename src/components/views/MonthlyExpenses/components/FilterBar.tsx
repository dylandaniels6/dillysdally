import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown,
  Calendar,
  DollarSign,
  Tag
} from 'lucide-react';
import { categoryColors } from "../utils/categoryColors";
import { formatCurrencyPrecise } from "../utils/expenseHelpers";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

interface FilterBarProps {
  filters: {
    categories: string[];
    minAmount?: number;
    maxAmount?: number;
    searchQuery: string;
    dateRange: { start: Date; end: Date };
  };
  onFiltersChange: (filters: any) => void;
  categories: string[];
  settings: { darkMode: boolean };
  expenses?: Transaction[]; // Make expenses optional with safety
}

interface SearchResult {
  id: string;
  type: 'transaction';
  date: string;
  title: string;
  content: string;
  highlightedContent: string;
  data: Transaction;
  score: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  filters, 
  onFiltersChange, 
  categories, 
  settings,
  expenses = [] // Default to empty array to prevent crashes
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [localMinAmount, setLocalMinAmount] = useState(filters.minAmount?.toString() || '');
  const [localMaxAmount, setLocalMaxAmount] = useState(filters.maxAmount?.toString() || '');
  
  // Apple-like search modal states
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    onFiltersChange({ ...filters, categories: newCategories });
  };
  
  const handleAmountChange = () => {
    onFiltersChange({
      ...filters,
      minAmount: localMinAmount ? parseFloat(localMinAmount) : undefined,
      maxAmount: localMaxAmount ? parseFloat(localMaxAmount) : undefined
    });
  };

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
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

  // Perform search with safety checks
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    // Safety check: ensure expenses is an array
    if (!Array.isArray(expenses)) {
      console.warn('FilterBar: expenses prop is not an array, skipping search');
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    try {
      const searchResults: SearchResult[] = [];

      // Search transactions
      expenses.forEach(expense => {
        // Safety checks for expense properties
        if (!expense || typeof expense !== 'object') return;
        
        const description = expense.description || '';
        const category = expense.category || '';
        const amount = expense.amount || 0;
        
        const searchableText = `${description} ${category} ${amount}`.trim();
        const score = calculateScore(searchableText, query);
        
        if (score > 0) {
          const context = getSearchContext(searchableText, query);
          const highlightedContent = highlightText(context, query);
          
          searchResults.push({
            id: expense.id || `temp-${Math.random()}`,
            type: 'transaction',
            date: expense.date || new Date().toISOString().split('T')[0],
            title: description || 'Untitled Transaction',
            content: context,
            highlightedContent,
            data: expense,
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
    } catch (error) {
      console.error('FilterBar search error:', error);
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query, expenses]);

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
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

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
    // Apply the search filter to the main filter bar
    onFiltersChange({ ...filters, searchQuery: result.data.description || result.title });
    setIsOpen(false);
  };

  const formatResultDate = (dateString: string): string => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString; // Fallback to original string if date parsing fails
    }
  };
  
  const activeFilterCount = 
    filters.categories.length + 
    (filters.minAmount ? 1 : 0) + 
    (filters.maxAmount ? 1 : 0) +
    (filters.searchQuery ? 1 : 0);
  
  return (
    <>
      {/* Apple-like Search Modal with proper blur coverage */}
      {isOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '100vh',
            width: '100vw'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-2xl mx-4 transform transition-all duration-300 ease-out"
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
                  placeholder="Search transactions, descriptions, categories..."
                  className={`flex-1 py-4 pr-4 text-lg placeholder-gray-400 bg-transparent outline-none ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}
                  autoComplete="off"
                  spellCheck="false"
                />
                
                <button
                  onClick={() => setIsOpen(false)}
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
                        className={`px-6 py-4 transition-all duration-200 hover:scale-[1.02] ${
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
                            <DollarSign className="text-purple-500" size={18} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-semibold truncate ${
                                settings.darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {result.title}
                              </h4>
                              <span className={`text-sm flex-shrink-0 ml-3 font-semibold ${
                                settings.darkMode ? 'text-green-400' : 'text-green-600'
                              }`}>
                                {formatCurrencyPrecise(result.data.amount || 0)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs mb-1">
                              <Tag size={12} />
                              <span className="capitalize text-gray-500">{result.data.category || 'Uncategorized'}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{formatResultDate(result.date)}</span>
                            </div>
                            
                            <div 
                              className={`text-sm leading-relaxed ${
                                settings.darkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}
                              dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <DollarSign className={`mx-auto mb-3 ${
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

            {/* Search Tips - when no query */}
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
                    Search your transactions
                  </h3>
                  <p className={`text-sm mb-4 ${
                    settings.darkMode ? 'text-gray-500' : 'text-gray-600'
                  }`}>
                    {expenses.length > 0 
                      ? `Search through ${expenses.length} transactions`
                      : 'No transactions to search through yet'
                    }
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="flex items-center gap-3">
                      <DollarSign className="text-green-500" size={16} />
                      <span className={`text-sm ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Transactions
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Tag className="text-blue-500" size={16} />
                      <span className={`text-sm ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Categories
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <div className="space-y-4">
        <div className={`flex items-center gap-4 p-4 rounded-2xl ${
          settings.darkMode 
            ? 'bg-gray-800/50 border border-gray-700/50' 
            : 'bg-white border border-gray-200'
        } backdrop-blur-sm`}>
          {/* Modern Search Button */}
          <div className="flex-1 relative">
            <button
              onClick={() => setIsOpen(true)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                settings.darkMode
                  ? 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-600'
              } focus:outline-none text-left`}
            >
              <Search size={20} className="flex-shrink-0" />
              <span className="flex-1 text-sm">Search transactions, descriptions, categories...</span>
            </button>
            
            {/* Show current search query if any */}
            {filters.searchQuery && (
              <div className="absolute -bottom-2 left-2 px-2 py-1 bg-purple-500 text-white text-xs rounded-full flex items-center gap-1">
                <span>Filtered: "{filters.searchQuery}"</span>
                <button
                  onClick={() => onFiltersChange({ ...filters, searchQuery: '' })}
                  className="hover:bg-purple-600 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          
          {/* Advanced Filters Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'bg-purple-500 text-white shadow-lg'
                : settings.darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={18} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown 
              size={16} 
              className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
            />
          </motion.button>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-2xl overflow-hidden ${
                settings.darkMode 
                  ? 'bg-gray-800/50 border border-gray-700/50' 
                  : 'bg-white border border-gray-200'
              } backdrop-blur-sm`}
            >
              <div className="p-6 space-y-6">
                {/* Amount Range */}
                <div>
                  <h3 className={`text-sm font-semibold mb-3 ${
                    settings.darkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Amount Range
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Min Amount
                      </label>
                      <div className="relative">
                        <DollarSign size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                          settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <input
                          type="number"
                          placeholder="0"
                          value={localMinAmount}
                          onChange={(e) => setLocalMinAmount(e.target.value)}
                          onBlur={handleAmountChange}
                          className={`w-full pl-9 pr-4 py-2 rounded-lg border ${
                            settings.darkMode
                              ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 placeholder-gray-400'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Max Amount
                      </label>
                      <div className="relative">
                        <DollarSign size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                          settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <input
                          type="number"
                          placeholder="No limit"
                          value={localMaxAmount}
                          onChange={(e) => setLocalMaxAmount(e.target.value)}
                          onBlur={handleAmountChange}
                          className={`w-full pl-9 pr-4 py-2 rounded-lg border ${
                            settings.darkMode
                              ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 placeholder-gray-400'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className={`text-sm font-semibold mb-3 ${
                    settings.darkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => {
                      const isSelected = filters.categories.includes(category);
                      const colorScheme = categoryColors[category] || categoryColors.other;
                      
                      return (
                        <motion.button
                          key={category}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCategoryToggle(category)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? `${colorScheme.bg} ${colorScheme.text} shadow-lg`
                              : settings.darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Tag size={14} className="inline mr-2" />
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        onFiltersChange({
                          categories: [],
                          searchQuery: '',
                          dateRange: filters.dateRange
                        });
                        setLocalMinAmount('');
                        setLocalMaxAmount('');
                      }}
                      className={`text-sm font-medium transition-colors ${
                        settings.darkMode
                          ? 'text-gray-400 hover:text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default FilterBar;