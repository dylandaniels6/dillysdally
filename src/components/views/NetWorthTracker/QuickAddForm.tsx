import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  DollarSign, 
  CreditCard, 
  Save, 
  X, 
  Sparkles,
  Wallet,
  TrendingUp,
  Edit3,
  Trash2,
  Check,
  Building,
  PiggyBank,
  Smartphone,
  Banknote,
  Watch,
  Gamepad2,
  Package
} from 'lucide-react';
import { QuickAddFormData } from './types/networth.types';
import { PrimaryButton, SecondaryButton } from './shared/SpringButton';
import { GlassCard } from './shared/GlassCard';

interface QuickAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuickAddFormData) => Promise<boolean>;
  onAddAsset?: (data: { name: string; value: string; category: string }) => Promise<boolean>;
  isLoading?: boolean;
  isDarkMode?: boolean;
  initialData?: Partial<QuickAddFormData>;
}

type UpdateMode = 'cash' | 'assets';

interface CategoryBalance {
  id: string;
  name: string;
  value: number;
  lastUpdated: string;
  icon: React.ReactNode;
  isLiability?: boolean;
}

interface AssetCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const INITIAL_CASH_CATEGORIES: CategoryBalance[] = [
  { id: 'schwab', name: 'Charles Schwab', value: 0, lastUpdated: '', icon: <Building size={16} /> },
  { id: 'robinhood', name: 'Robinhood', value: 0, lastUpdated: '', icon: <TrendingUp size={16} /> },
  { id: 'sofi-banking', name: 'SoFi Banking', value: 0, lastUpdated: '', icon: <PiggyBank size={16} /> },
  { id: 'sofi-invest', name: 'SoFi Invest', value: 0, lastUpdated: '', icon: <TrendingUp size={16} /> },
  { id: 'webull', name: 'WeBull', value: 0, lastUpdated: '', icon: <TrendingUp size={16} /> },
  { id: 'etrade', name: 'E-Trade', value: 0, lastUpdated: '', icon: <Building size={16} /> },
  { id: 'wealthfront', name: 'Wealthfront', value: 0, lastUpdated: '', icon: <TrendingUp size={16} /> },
  { id: 'apple-cash', name: 'Apple Cash', value: 0, lastUpdated: '', icon: <Smartphone size={16} /> },
  { id: 'cash', name: 'Cash', value: 0, lastUpdated: '', icon: <Banknote size={16} /> },
  { id: 'credit-card', name: 'Credit Card', value: 0, lastUpdated: '', icon: <CreditCard size={16} />, isLiability: true },
];

const INITIAL_ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'watches', name: 'Watches', icon: <Watch size={16} /> },
  { id: 'video-games', name: 'Video Games', icon: <Gamepad2 size={16} /> },
  { id: 'other', name: 'Other', icon: <Package size={16} /> },
];

export const QuickAddForm: React.FC<QuickAddFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onAddAsset,
  isLoading = false,
  isDarkMode = false,
}) => {
  const [updateMode, setUpdateMode] = useState<UpdateMode>('cash');
  const [inputText, setInputText] = useState('');
  const [categories, setCategories] = useState<CategoryBalance[]>(INITIAL_CASH_CATEGORIES);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>(INITIAL_ASSET_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>('');
  const [assetName, setAssetName] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const smartInputRef = useRef<HTMLInputElement>(null);

  // Parse input text for cash mode
  const parsedCashData = React.useMemo(() => {
    if (updateMode !== 'cash') return { amount: 0, description: '', category: '', netWorthImpact: 0 };
    
    const text = inputText.trim();
    if (!text) return { amount: 0, description: '', category: '', netWorthImpact: 0 };

    const amountMatch = text.match(/[-]?\$?(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace('$', '')) : 0;
    
    let description = text.replace(/[-]?\$?\d+(?:\.\d{2})?/, '').trim();
    
    let matchedCategory = '';
    for (const category of categories) {
      const categoryWords = category.name.toLowerCase().split(' ');
      const inputWords = description.toLowerCase().split(' ');
      
      if ((inputWords.includes('cc') || inputWords.includes('credit')) && category.id === 'credit-card') {
        matchedCategory = category.id;
        break;
      }
      
      if (categoryWords.some(word => inputWords.includes(word)) || 
          inputWords.some(word => categoryWords.includes(word)) ||
          description.toLowerCase().includes(category.name.toLowerCase())) {
        matchedCategory = category.id;
        break;
      }
    }
    
    let netWorthImpact = amount;
    const category = categories.find(c => c.id === (matchedCategory || selectedCategory));
    
    if (category?.isLiability) {
      netWorthImpact = -amount;
    }
    
    return {
      amount,
      description: description || 'Balance Update',
      category: matchedCategory || selectedCategory,
      netWorthImpact
    };
  }, [inputText, categories, selectedCategory, updateMode]);

  // Parse input text for assets mode
  const parsedAssetData = React.useMemo(() => {
    if (updateMode !== 'assets') return { amount: 0, name: '', category: '', netWorthImpact: 0 };
    
    const text = inputText.trim();
    if (!text) return { amount: 0, name: assetName.trim(), category: selectedAssetCategory, netWorthImpact: 0 };

    // For assets, only parse the amount from the first input
    const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace('$', '')) : 0;
    
    // Parse category keywords from the first input
    let matchedCategory = selectedAssetCategory;
    const lowerText = text.toLowerCase();
    if (lowerText.includes('watch') || lowerText.includes('watches')) {
      matchedCategory = 'watches';
    } else if (lowerText.includes('game') || lowerText.includes('games') || lowerText.includes('gaming')) {
      matchedCategory = 'video-games';
    } else if (lowerText.includes('other') && !selectedAssetCategory) {
      matchedCategory = 'other';
    }
    
    // Name comes exclusively from the second input field
    const finalName = assetName.trim() || 'New Asset';
    
    return {
      amount,
      name: finalName,
      category: matchedCategory,
      netWorthImpact: amount // Assets always add to net worth
    };
  }, [inputText, assetName, selectedAssetCategory, updateMode]);

  const currentParsedData = updateMode === 'cash' ? parsedCashData : parsedAssetData;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => smartInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setInputText('');
      setSelectedCategory('');
      setSelectedAssetCategory('');
      setAssetName('');
      setShowAdvanced(false);
      setEditMode(false);
      setShowSuccess(false);
      setShowAddNew(false);
      setNewCategoryName('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    
    if (updateMode === 'cash') {
      const newCategory: CategoryBalance = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName.trim(),
        value: 0,
        lastUpdated: '',
        icon: <Wallet size={16} />
      };
      setCategories([...categories, newCategory]);
    } else {
      const newCategory: AssetCategory = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName.trim(),
        icon: <Package size={16} />
      };
      setAssetCategories([...assetCategories, newCategory]);
    }
    
    setNewCategoryName('');
    setShowAddNew(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (updateMode === 'cash') {
      setCategories(categories.filter(cat => cat.id !== id));
    } else {
      setAssetCategories(assetCategories.filter(cat => cat.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (updateMode === 'cash') {
        if (Math.abs(parsedCashData.amount) <= 0 || !parsedCashData.category) return;
        
        const updatedCategories = categories.map(cat => 
          cat.id === parsedCashData.category 
            ? { ...cat, value: parsedCashData.amount, lastUpdated: new Date().toISOString() }
            : cat
        );
        
        setCategories(updatedCategories);
        
        const totalNetWorth = updatedCategories.reduce((sum, cat) => {
          if (cat.isLiability) {
            return sum - cat.value;
          }
          return sum + cat.value;
        }, 0);
        
        const submissionData = {
          mode: updateMode,
          category: parsedCashData.category,
          amount: parsedCashData.amount,
          totalNetWorth,
          categories: updatedCategories,
          timestamp: new Date().toISOString(),
          cashEquivalents: totalNetWorth.toString(),
          creditCards: '0',
          notes: `Updated ${categories.find(c => c.id === parsedCashData.category)?.name}: $${Math.abs(parsedCashData.amount)}${parsedCashData.amount < 0 ? ' (Credit)' : ''}`,
          date: new Date().toISOString().split('T')[0],
        };
        
        const success = await onSubmit(submissionData);
        if (success) {
          setShowSuccess(true);
          setTimeout(() => {
            setInputText('');
            setSelectedCategory('');
            setShowSuccess(false);
            onClose();
          }, 250);
        }
      } else {
        // Assets mode - bypass cash validation entirely
        if (Math.abs(parsedAssetData.amount) <= 0 || !parsedAssetData.category || !parsedAssetData.name.trim()) return;
        
        if (!onAddAsset) {
          console.error('onAddAsset prop is required for asset submissions');
          return;
        }

        const success = await onAddAsset({
          name: parsedAssetData.name,
          value: parsedAssetData.amount.toString(),
          category: parsedAssetData.category,
        });
        
        if (success) {
          setShowSuccess(true);
          setTimeout(() => {
            setInputText('');
            setAssetName('');
            setSelectedAssetCategory('');
            setShowSuccess(false);
            onClose();
          }, 250);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentParsedData]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl mx-auto"
          >
            <GlassCard
              variant="elevated"
              padding="none"
              blur="strong"
              isDarkMode={isDarkMode}
              className="w-full"
            >
              <div className={`px-6 py-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'
                    }`}>
                      <Sparkles size={20} className="text-purple-500" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Update Net Worth
                      </h2>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {updateMode === 'cash' 
                          ? 'Type naturally, like "1000 Schwab" or "200 CC"'
                          : 'Enter value and category keywords, then name your asset'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.div 
                      className={`relative flex p-1 rounded-lg ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <motion.div
                        className="absolute top-1 bottom-1 bg-purple-500 rounded-md shadow-sm"
                        initial={false}
                        animate={{
                          left: updateMode === 'cash' ? 4 : '50%',
                          right: updateMode === 'cash' ? '50%' : 4,
                        }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      />
                      
                      <button
                        onClick={() => setUpdateMode('cash')}
                        className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          updateMode === 'cash' 
                            ? 'text-white' 
                            : isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        <Wallet size={14} className="inline mr-1" />
                        Cash
                      </button>
                      
                      <button
                        onClick={() => setUpdateMode('assets')}
                        className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          updateMode === 'assets' 
                            ? 'text-white' 
                            : isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        <TrendingUp size={14} className="inline mr-1" />
                        Assets
                      </button>
                    </motion.div>

                    <button
                      onClick={onClose}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-400' 
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="relative">
                    <DollarSign size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <input
                      ref={smartInputRef}
                      type="text"
                      placeholder={updateMode === 'cash' ? "e.g., 1000 Schwab or 200 CC" : "e.g., 5000 watches"}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 text-lg rounded-xl border transition-all ${
                        isDarkMode
                          ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                          : 'bg-gray-50 border-gray-200 placeholder-gray-400 focus:border-purple-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>

                  {updateMode === 'assets' && (
                    <div className="relative">
                      <Package size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <input
                        type="text"
                        placeholder="e.g., Rolex Submariner or Nintendo Switch"
                        value={assetName}
                        onChange={(e) => setAssetName(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 text-lg rounded-xl border transition-all ${
                          isDarkMode
                            ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                            : 'bg-gray-50 border-gray-200 placeholder-gray-400 focus:border-purple-500'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                      />
                    </div>
                  )}

                  <AnimatePresence>
                    {Math.abs(currentParsedData.amount) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-4 rounded-xl border ${
                          isDarkMode
                            ? 'bg-purple-900/20 border-purple-700/50'
                            : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className={`text-xs mb-1 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {updateMode === 'cash' ? 'Amount' : 'Value'}
                            </div>
                            <div className={`font-semibold text-lg ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              ${Math.abs(currentParsedData.amount).toLocaleString()}
                              {updateMode === 'cash' && currentParsedData.amount < 0 && ' (Credit)'}
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs mb-1 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {updateMode === 'cash' ? 'Account' : 'Asset Name'}
                            </div>
                            <div className={`font-semibold ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {updateMode === 'cash' 
                                ? (categories.find(c => c.id === currentParsedData.category)?.name || 'Select account')
                                : (currentParsedData.name || 'Enter asset name')
                              }
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs mb-1 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {updateMode === 'cash' ? 'Net Worth Impact' : 'Category'}
                            </div>
                            <div className={`font-semibold ${
                              updateMode === 'cash' 
                                ? (currentParsedData.netWorthImpact >= 0 ? 'text-green-500' : 'text-red-500')
                                : (isDarkMode ? 'text-white' : 'text-gray-900')
                            }`}>
                              {updateMode === 'cash' 
                                ? `${currentParsedData.netWorthImpact >= 0 ? '+' : ''}$${currentParsedData.netWorthImpact.toLocaleString()}`
                                : (assetCategories.find(c => c.id === currentParsedData.category)?.name || 'Select category')
                              }
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Quick Select {updateMode === 'cash' ? 'Account' : 'Category'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddNew(true)}
                      className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Plus size={14} className="inline mr-1" />
                      Add New
                    </button>
                  </div>

                  {updateMode === 'cash' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <motion.button
                          key={category.id}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-3 rounded-lg border transition-all text-left ${
                            selectedCategory === category.id || parsedCashData.category === category.id
                              ? isDarkMode
                                ? 'bg-purple-900/50 border-purple-600 text-white'
                                : 'bg-purple-100 border-purple-300 text-purple-900'
                              : isDarkMode
                                ? category.isLiability 
                                  ? 'bg-red-900/20 border-red-700/50 text-gray-300 hover:border-red-600/50'
                                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                                : category.isLiability
                                  ? 'bg-red-50 border-red-200 text-gray-700 hover:border-red-300'
                                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {category.icon}
                              <span className="font-medium text-sm">
                                {category.name}
                                {category.isLiability && (
                                  <span className="text-xs ml-1 opacity-75">(Liability)</span>
                                )}
                              </span>
                            </div>
                            {editMode && !category.isLiability && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(category.id);
                                }}
                                className="p-1 rounded text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          {category.value !== 0 && (
                            <div className="mt-1 text-xs opacity-75">
                              Current: ${Math.abs(category.value).toLocaleString()}
                              {category.isLiability && (
                                <span className={category.value > 0 ? "text-red-400" : "text-green-400"}>
                                  {category.value > 0 ? " (Owed)" : " (Credit)"}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {assetCategories.map((category) => (
                        <motion.button
                          key={category.id}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedAssetCategory(category.id)}
                          className={`p-3 rounded-lg border transition-all text-center ${
                            selectedAssetCategory === category.id || parsedAssetData.category === category.id
                              ? isDarkMode
                                ? 'bg-purple-900/50 border-purple-600 text-white'
                                : 'bg-purple-100 border-purple-300 text-purple-900'
                              : isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            {category.icon}
                            <span className="font-medium text-sm">{category.name}</span>
                            {editMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(category.id);
                                }}
                                className="p-1 rounded text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showAddNew && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 rounded-xl border ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <h4 className={`font-medium mb-3 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Add New {updateMode === 'cash' ? 'Account' : 'Category'}
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={updateMode === 'cash' ? "e.g., Fidelity" : "e.g., Electronics"}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className={`flex-1 px-3 py-2 rounded-lg border ${
                            isDarkMode
                              ? 'bg-gray-900 border-gray-700 text-white'
                              : 'bg-gray-50 border-gray-200'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                        />
                        <button
                          type="button"
                          onClick={handleAddNewCategory}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddNew(false)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`text-sm ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
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
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Edit {updateMode === 'cash' ? 'accounts' : 'categories'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditMode(!editMode)}
                            className={`p-2 rounded-lg transition-colors ${
                              editMode
                                ? 'bg-purple-500 text-white'
                                : isDarkMode
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex space-x-3 pt-4">
                  <SecondaryButton
                    onClick={onClose}
                    fullWidth
                    disabled={isSubmitting}
                    isDarkMode={isDarkMode}
                  >
                    Cancel
                  </SecondaryButton>
                  <PrimaryButton
                    type="submit"
                    fullWidth
                    disabled={
                      isSubmitting || isLoading ||
                      (Math.abs(currentParsedData.amount) <= 0 || 
                       (updateMode === 'cash' && !currentParsedData.category) ||
                       (updateMode === 'assets' && (!currentParsedData.category || !currentParsedData.name.trim())))
                    }
                    loading={isSubmitting || isLoading}
                    isDarkMode={isDarkMode}
                    icon={showSuccess ? <Check size={16} /> : <Save size={16} />}
                  >
                    {showSuccess ? 'Updated!' : `${updateMode === 'cash' ? 'Update Balance' : 'Add Asset'}`}
                  </PrimaryButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickAddForm;