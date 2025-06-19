import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  DollarSign, 
  Calendar, 
  Tag, 
  FileText,
  Sparkles,
  Check
} from 'lucide-react';
import { useAppContext } from '../../../../context/AppContext';
import { parseNaturalLanguageAmount } from '../utils/expenseHelpers';
import { categoryColors } from '../utils/categoryColors';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

interface EditExpenseModalProps {
  onClose: () => void;
  settings: { darkMode: boolean; categories: string[] };
  editingTransaction: Transaction;
  onEdit: (expense: Transaction) => void;
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ onClose, settings, editingTransaction, onEdit }) => {
  const { expenses, setExpenses } = useAppContext();
  const [input, setInput] = useState(`${editingTransaction.description} $${editingTransaction.amount}`);
  const [parsedData, setParsedData] = useState<{
    amount: number;
    description: string;
    category: string;
    date: string;
  }>({
    amount: editingTransaction.amount,
    description: editingTransaction.description,
    category: editingTransaction.category,
    date: editingTransaction.date
  });
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Parse natural language input
  useEffect(() => {
    if (input) {
      const parsed = parseNaturalLanguageAmount(input);
      setParsedData(prev => ({
        ...prev,
        amount: parsed.amount || prev.amount,
        description: parsed.description || prev.description,
        category: parsed.category || prev.category
      }));
    }
  }, [input]);
  
  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (parsedData.amount <= 0 || !parsedData.description) return;
    
    const updatedExpense = {
      ...editingTransaction,
      ...parsedData
    };
    
    onEdit(updatedExpense);
    
    // Show success animation
    setShowSuccess(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsedData]);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${
            settings.darkMode 
              ? 'bg-gray-800 border border-gray-700' 
              : 'bg-white border border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${
            settings.darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  settings.darkMode ? 'bg-purple-900/50' : 'bg-purple-100'
                }`}>
                  <Sparkles size={20} className="text-purple-500" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Edit Expense
                  </h2>
                  <p className={`text-xs ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Type naturally, like "Coffee at Starbucks $5"
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Main Input */}
          <div className="p-6">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="$50 dinner at Joe's Restaurant"
                className={`w-full px-4 py-4 pr-4 text-lg rounded-xl border-2 transition-all ${
                  settings.darkMode
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400'
                } focus:outline-none`}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              />
            </div>
            
            {/* Parsed Preview */}
            {input && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-xl ${
                  settings.darkMode ? 'bg-gray-900' : 'bg-gray-50'
                }`}
              >
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className={`text-xs mb-1 ${
                      settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Amount
                    </div>
                    <div className={`font-semibold ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      ${parsedData.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className={`text-xs mb-1 ${
                      settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Description
                    </div>
                    <div className={`font-semibold ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {parsedData.description || 'No description'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs mb-1 ${
                      settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Category
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: categoryColors[parsedData.category] || categoryColors.other }}
                      />
                      <span className={`font-semibold ${
                        settings.darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {parsedData.category}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Advanced Options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`mt-4 text-sm ${
                settings.darkMode ? 'text-purple-400' : 'text-purple-600'
              } hover:underline`}
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced options
            </button>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm mb-2 ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Date
                      </label>
                      <div className="relative">
                        <Calendar size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                          settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                        <input
                          type="date"
                          value={parsedData.date}
                          onChange={(e) => setParsedData({ ...parsedData, date: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                            settings.darkMode
                              ? 'bg-gray-900 border-gray-700 text-white'
                              : 'bg-white border-gray-200'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm mb-2 ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Category
                      </label>
                      <div className="relative">
                        <Tag size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                          settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                        <select
                          value={parsedData.category}
                          onChange={(e) => setParsedData({ ...parsedData, category: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2 rounded-lg border appearance-none ${
                            settings.darkMode
                              ? 'bg-gray-900 border-gray-700 text-white'
                              : 'bg-white border-gray-200'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        >
                          {settings.categories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm mb-2 ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Notes (optional)
                    </label>
                    <div className="relative">
                      <FileText size={18} className={`absolute left-3 top-3 ${
                        settings.darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <textarea
                        placeholder="Add any additional notes..."
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border resize-none ${
                          settings.darkMode
                            ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                            : 'bg-white border-gray-200 placeholder-gray-400'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        rows={3}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Footer */}
          <div className={`px-6 py-4 border-t ${
            settings.darkMode ? 'border-gray-700' : 'border-gray-200'
          } flex items-center justify-center`}>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  settings.darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={parsedData.amount <= 0 || !parsedData.description}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  parsedData.amount > 0 && parsedData.description
                    ? showSuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
                    : settings.darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {showSuccess ? (
                  <>
                    <Check size={18} />
                    Saved!
                  </>
                ) : (
                  <>
                    Update Expense
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditExpenseModal;