import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Edit, Trash, ChevronDown, ChevronUp, X, Sparkles, Clock, Moon, Sun, Activity, ChevronRight, Search, Filter, TrendingUp, Award } from 'lucide-react';
import { formatCurrencyPrecise } from '../utils/expenseHelpers';
import { categoryColors } from '../utils/categoryColors';
import EditExpenseModal from './EditExpenseModal';
import { AnimatePresence } from 'framer-motion';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

interface TransactionTableProps {
  expenses: Transaction[];
  settings: { darkMode: boolean; categories: string[] };
  onEdit: (expense: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  expenses,
  settings,
  onEdit,
  onDelete
}) => {
  const [showPastTransactions, setShowPastTransactions] = useState(true);
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [loadedTransactionsCount, setLoadedTransactionsCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = expenses;

  if (filteredTransactions.length === 0) return null;

  const searchFilteredTransactions = filteredTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || transaction.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalTransactions: filteredTransactions.length,
    currentStreak: calculateStreak(filteredTransactions),
    avgCategory: calculateAverageCategory(filteredTransactions)
  };

  function calculateStreak(transactions: Transaction[]) {
    // Simple streak calculation
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sortedTransactions.length; i++) {
      const transactionDate = new Date(sortedTransactions[i].date);
      const daysDiff = Math.floor((today.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  function calculateAverageCategory(transactions: Transaction[]) {
    const categoryMap: { [key: string]: string } = {
      'Food': '🍔',
      'Transport': '🚗',
      'Shopping': '🛍️',
      'Entertainment': '🎬',
      'Bills': '💡',
      'Other': '📝'
    };
    
    const categoryCounts: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      if (transaction.category) {
        categoryCounts[transaction.category] = (categoryCounts[transaction.category] || 0) + 1;
      }
    });
    
    const mostCommonCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    return mostCommonCategory ? categoryMap[mostCommonCategory[0]] || '📝' : '📝';
  }

  const getCategoryIcon = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'Food': '🍔',
      'Transport': '🚗',
      'Shopping': '🛍️',
      'Entertainment': '🎬',
      'Bills': '💡',
      'Other': '📝'
    };
    return <span>{categoryMap[category] || '📝'}</span>;
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTransaction(null);
  };

  return (
    <>
      {/* Past Transactions Section - Collapsible with Modern Design */}
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
            onClick={() => setShowPastTransactions(!showPastTransactions)}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`}>
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Recent Transactions
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTransactionsModal(true);
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
                {showPastTransactions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </div>
          
          {/* Collapsible Content with Staggered Animation */}
          {showPastTransactions && (
            <div className="mt-6 space-y-3 animate-fadeIn">
              {searchFilteredTransactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((transaction, index) => (
                  <div 
                    key={transaction.id}
                    className={`group relative p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] animate-slideIn border ${
                      settings.darkMode 
                        ? 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-gray-600/50' 
                        : 'bg-white/50 hover:bg-gray-50/50 border-gray-200/50 hover:border-gray-300/50'
                    } backdrop-blur-sm hover:shadow-xl`}
                    style={{ animationDelay: `${index * 50}ms` }}

                  >
                    {/* Hover Gradient Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 rounded-xl transition-all duration-300" />
                    
                    <div className="relative flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            settings.darkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100/50 text-gray-600'
                          }`}>
                            <Clock size={14} />
                            <span>{new Date(transaction.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(transaction.category)}
                          </div>
                        </div>
                        
                        <h4 className={`font-semibold text-lg mb-1 ${
                          settings.darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {transaction.description || new Date(transaction.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </h4>
                        
                        <p className={`text-sm line-clamp-2 ${
                          settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {formatCurrencyPrecise(transaction.amount)} • {transaction.category}
                        </p>

                        {/* Visual Progress Indicators */}
                        <div className="mt-3 flex gap-2">
                          <div
                            className={`h-1.5 w-12 rounded-full overflow-hidden ${
                              settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'
                            }`}
                          >
                            <div
                              className="h-full transition-all duration-500 bg-gradient-to-r from-green-400 to-emerald-500"
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTransaction(transaction);
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
                            if (confirm('Are you sure you want to delete this transaction?')) {
                              onDelete(transaction.id);
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

      {/* View Transaction Modal */}
      {viewingTransaction && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => {
            setViewingTransaction(null);
          }}
        >
          <div 
            className={`max-w-4xl w-full rounded-2xl shadow-2xl ${
              settings.darkMode ? 'bg-gray-900/95' : 'bg-white/95'
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
                      <span className="text-lg font-medium">{new Date(viewingTransaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(viewingTransaction.category)}
                        <span className="capitalize text-sm">{viewingTransaction.category}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setViewingTransaction(null);
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
              {/* Main Transaction Content */}
              <div className={`mt-4 p-6 rounded-2xl border-2 transition-all duration-300 ${
                settings.darkMode 
                  ? 'bg-gray-800/50 border-gray-700/50' 
                  : 'bg-gray-50/50 border-gray-200/50'
              }`}>
                <p className={`whitespace-pre-line leading-relaxed ${
                  settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {viewingTransaction.description}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="mt-6 relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10" />
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <h4 className="font-semibold text-lg">Transaction Details</h4>
                  </div>
                  <div className={`grid grid-cols-2 gap-4 ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <div>
                      <span className="text-sm opacity-75">Amount</span>
                      <p className="font-semibold text-lg">{formatCurrencyPrecise(viewingTransaction.amount)}</p>
                    </div>
                    <div>
                      <span className="text-sm opacity-75">Category</span>
                      <p className="font-semibold text-lg">{viewingTransaction.category}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t dark:border-gray-700/50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setViewingTransaction(null);
                  }}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${
                    settings.darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleEditTransaction(viewingTransaction);
                    setViewingTransaction(null);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Edit Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All Transactions Modal */}
      {showAllTransactionsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`max-w-6xl w-full h-[90vh] rounded-2xl shadow-2xl ${
            settings.darkMode ? 'bg-gray-900/95' : 'bg-white/95'
          } backdrop-blur-xl border border-white/20 flex flex-col animate-slideIn`}>
            
            {/* Header */}
            <div className="p-6 border-b dark:border-gray-700/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    All Transactions
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowAllTransactionsModal(false);
                    setLoadedTransactionsCount(10);
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
                    placeholder="Search transactions..."
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
                  {['Food', 'Transport', 'Shopping'].map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                      className={`p-2.5 rounded-xl transition-all duration-200 hover:scale-105 ${
                        selectedCategory === category
                          ? 'bg-blue-500/20 border-2 border-blue-500'
                          : settings.darkMode
                          ? 'bg-gray-800/50 border-2 border-gray-700 hover:border-gray-600'
                          : 'bg-white/50 border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {getCategoryIcon(category)}
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
                  if (loadedTransactionsCount < searchFilteredTransactions.length) {
                    setLoadedTransactionsCount(prev => Math.min(prev + 10, searchFilteredTransactions.length));
                  }
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchFilteredTransactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, loadedTransactionsCount)
                  .map((transaction, index) => (
                    <div 
                      key={transaction.id}
                      className={`group relative p-5 rounded-xl transition-all duration-300 hover:scale-[1.02] animate-fadeIn border ${
                        settings.darkMode 
                          ? 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50' 
                          : 'bg-white/50 hover:bg-gray-50/50 border-gray-200/50'
                      } backdrop-blur-sm hover:shadow-xl`}
                      style={{ animationDelay: `${(index % 10) * 50}ms` }}
                      onClick={() => {
                        setViewingTransaction(transaction);
                        setShowAllTransactionsModal(false);
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="text-sm font-medium">{new Date(transaction.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getCategoryIcon(transaction.category)}
                        </div>
                      </div>
                      
                      <h4 className={`font-semibold mb-2 ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {transaction.description || new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </h4>
                      
                      <p className={`text-sm line-clamp-3 ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {formatCurrencyPrecise(transaction.amount)} • {transaction.category}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-medium text-purple-400">Transaction Details</span>
                      </div>

                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTransaction(transaction);
                            setShowAllTransactionsModal(false);
                          }}
                          className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this transaction?')) {
                              onDelete(transaction.id);
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
              {loadedTransactionsCount < searchFilteredTransactions.length && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    </div>
                    <span>Loading more transactions...</span>
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchFilteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Calendar size={48} className="mx-auto opacity-50" />
                  </div>
                  <p className="text-gray-500">No transactions found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Entry Modal for Editing */}
      <AnimatePresence>
        {showEditModal && editingTransaction && (
          <EditExpenseModal 
  onClose={handleCloseEditModal}
  settings={settings}
  editingTransaction={editingTransaction}
  onEdit={onEdit}
/>
        )}
      </AnimatePresence>

      {/* Add these animation styles */}
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
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
        
        .animate-gradient {
          animation: gradient 10s ease infinite;
        }
      `}</style>
    </>
  );
};

export default TransactionTable;