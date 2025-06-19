import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Home, 
  TrendingUp, 
  Car, 
  Gem, 
  Package, 
  Edit3, 
  Trash2, 
  DollarSign,
  Calendar,
  AlertCircle,
  Check
} from 'lucide-react';
import { Asset, AssetFormData, ValidationError } from './types/networth.types';
import { PrimaryButton, SecondaryButton, DangerButton } from './shared/SpringButton';
import { GlassCard, ActionCard } from './shared/GlassCard';
import { AnimatedCurrency } from './shared/AnimatedNumber';
import { motionVariants, staggerDelays } from './utils/animationPresets';
import { formatCurrency } from './utils/netWorthCalculations';

interface AssetManagerProps {
  assets: Asset[];
  onAddAsset: (data: AssetFormData) => Promise<boolean>;
  onUpdateAsset: (id: string, value: number) => Promise<boolean>;
  onDeleteAsset: (id: string) => Promise<boolean>;
  isLoading?: boolean;
  isDarkMode?: boolean;
  className?: string;
}

interface AssetFormState {
  isOpen: boolean;
  mode: 'add' | 'edit';
  editingAsset?: Asset;
}

export const AssetManager: React.FC<AssetManagerProps> = ({
  assets,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  isLoading = false,
  isDarkMode = false,
  className = '',
}) => {
  // Form state
  const [formState, setFormState] = useState<AssetFormState>({
    isOpen: false,
    mode: 'add',
  });
  
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    value: '',
    category: 'other',
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  // Asset category configuration - FIXED
  const categoryConfig = {
    real_estate: {
      label: 'Real Estate',
      icon: Home,
      color: 'text-blue-600',
      bgColor: isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100',
      gradient: 'from-blue-500 to-blue-400',
    },
    investments: {
      label: 'Investments',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: isDarkMode ? 'bg-green-500/20' : 'bg-green-100',
      gradient: 'from-green-500 to-green-400',
    },
    vehicles: {
      label: 'Vehicles',
      icon: Car,
      color: 'text-purple-600',
      bgColor: isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100',
      gradient: 'from-purple-500 to-purple-400',
    },
    valuables: {
      label: 'Valuables',
      icon: Gem,
      color: 'text-amber-600',
      bgColor: isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100',
      gradient: 'from-amber-500 to-amber-400',
    },
    other: {
      label: 'Other',
      icon: Package,
      color: 'text-gray-600',
      bgColor: isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100',
      gradient: 'from-gray-500 to-gray-400',
    },
  };

  // Calculate total asset value
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }, [assets]);

  // Group assets by category
  const groupedAssets = useMemo(() => {
    const grouped = assets.reduce((acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = [];
      }
      acc[asset.category].push(asset);
      return acc;
    }, {} as Record<Asset['category'], Asset[]>);

    // Sort each category by value (highest first)
    Object.keys(grouped).forEach(category => {
      grouped[category as Asset['category']].sort((a, b) => b.value - a.value);
    });

    return grouped;
  }, [assets]);

  // Validation
  const validateForm = useCallback((data: AssetFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.name.trim()) {
      errors.push({ field: 'name', message: 'Asset name is required' });
    } else if (data.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must be less than 100 characters' });
    }

    const value = parseFloat(data.value);
    if (isNaN(value) || value < 0) {
      errors.push({ field: 'value', message: 'Value must be a positive number' });
    }

    return errors;
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    
    if (validationErrors.length > 0) return;

    setIsSubmitting(true);
    
    try {
      const success = await onAddAsset(formData);
      if (success) {
        resetForm();
      }
    } catch (error) {
      console.error('Error adding asset:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormState({ isOpen: false, mode: 'add' });
    setFormData({ name: '', value: '', category: 'other' });
    setErrors([]);
    setIsSubmitting(false);
  };

  // Start editing asset value
  const startEditingValue = (asset: Asset) => {
    setEditingValues({ [asset.id]: asset.value.toString() });
  };

  // Save edited value
  const saveEditedValue = async (assetId: string) => {
    const newValue = parseFloat(editingValues[assetId]);
    if (isNaN(newValue) || newValue < 0) return;

    try {
      const success = await onUpdateAsset(assetId, newValue);
      if (success) {
        setEditingValues(prev => {
          const newState = { ...prev };
          delete newState[assetId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  // Cancel editing
  const cancelEditing = (assetId: string) => {
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[assetId];
      return newState;
    });
  };

  // Handle asset deletion
  const handleDeleteAsset = async (assetId: string) => {
    if (window.confirm('Are you sure you want to remove this asset? It will be marked as inactive from this month forward.')) {
      try {
        await onDeleteAsset(assetId);
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    }
  };

  // Get field error
  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Asset Portfolio
          </h2>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {assets.length} assets • Total value: {formatCurrency(totalValue)}
          </p>
        </div>
        
        <PrimaryButton
          onClick={() => setFormState({ isOpen: true, mode: 'add' })}
          icon={<Plus size={16} />}
          isDarkMode={isDarkMode}
        >
          Add Asset
        </PrimaryButton>
      </div>

      {/* Asset Categories */}
      <motion.div 
        className="space-y-6"
        variants={motionVariants.staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {Object.entries(groupedAssets).map(([category, categoryAssets]) => {
          const config = categoryConfig[category as Asset['category']];
          const categoryValue = categoryAssets.reduce((sum, asset) => sum + asset.value, 0);

          // Safety check for config
          if (!config) {
            console.warn(`No config found for category: ${category}`);
            return null;
          }

          return (
            <motion.div key={category} variants={motionVariants.slideUp}>
              <GlassCard
                variant="default"
                padding="medium"
                isDarkMode={isDarkMode}
                className="space-y-4"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <config.icon size={20} className={config.color} />
                    </div>
                    <div>
                      <h3 className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {config.label}
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {categoryAssets.length} asset{categoryAssets.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <AnimatedCurrency
                    value={categoryValue}
                    size="medium"
                    weight="semibold"
                    color="primary"
                    isDarkMode={isDarkMode}
                    compact={true}
                  />
                </div>

                {/* Assets in Category */}
                <div className="space-y-3">
                  {categoryAssets.map((asset, index) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ActionCard
                        padding="medium"
                        isDarkMode={isDarkMode}
                        className="group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium truncate ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {asset.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                Added {new Date(asset.addedDate).toLocaleDateString()}
                              </span>
                              <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>•</span>
                              <span className={`${config.color} font-medium`}>
                                {config.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {/* Asset Value - Editable */}
                            {editingValues[asset.id] !== undefined ? (
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <DollarSign size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingValues[asset.id]}
                                    onChange={(e) => setEditingValues(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditedValue(asset.id);
                                      if (e.key === 'Escape') cancelEditing(asset.id);
                                    }}
                                    className={`w-32 pl-6 pr-2 py-1 text-sm rounded border ${
                                      isDarkMode 
                                        ? 'bg-gray-800 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                    autoFocus
                                  />
                                </div>
                                <button
                                  onClick={() => saveEditedValue(asset.id)}
                                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => cancelEditing(asset.id)}
                                  className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                >
                                  <AlertCircle size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingValue(asset)}
                                className="text-right group-hover:bg-gray-100 dark:group-hover:bg-gray-700 p-2 rounded transition-colors"
                              >
                                <AnimatedCurrency
                                  value={asset.value}
                                  size="medium"
                                  weight="semibold"
                                  color="neutral"
                                  isDarkMode={isDarkMode}
                                  compact={true}
                                />
                              </button>
                            )}

                            {/* Actions */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                              <button
                                onClick={() => startEditingValue(asset)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isDarkMode 
                                    ? 'hover:bg-gray-700 text-gray-400' 
                                    : 'hover:bg-gray-100 text-gray-500'
                                }`}
                                title="Edit value"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteAsset(asset.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isDarkMode 
                                    ? 'hover:bg-red-900/50 text-red-400' 
                                    : 'hover:bg-red-100 text-red-500'
                                }`}
                                title="Remove asset"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </ActionCard>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Add Asset Form */}
      <AnimatePresence>
        {formState.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={resetForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 z-50 max-w-lg mx-auto"
            >
              <GlassCard
                variant="elevated"
                padding="large"
                isDarkMode={isDarkMode}
                className="max-h-[80vh] overflow-y-auto"
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="text-center">
                    <h3 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Add New Asset
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Add a new asset to track its value over time
                    </p>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Asset Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Primary Residence, Tesla Model 3, Investment Account"
                      className={`
                        w-full px-4 py-3 rounded-xl border backdrop-blur-sm
                        transition-all duration-200 focus:outline-none focus:ring-2
                        ${getFieldError('name')
                          ? 'border-red-300 focus:ring-red-500/50'
                          : 'focus:ring-purple-500/50'
                        }
                        ${isDarkMode 
                          ? 'bg-gray-800/60 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white/60 border-gray-300 text-gray-900 placeholder-gray-500'
                        }
                      `}
                      maxLength={100}
                    />
                    {getFieldError('name') && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-1 text-red-500 text-sm"
                      >
                        <AlertCircle size={14} />
                        <span>{getFieldError('name')?.message}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Value */}
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Current Value
                    </label>
                    <div className="relative">
                      <DollarSign size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="0.00"
                        className={`
                          w-full pl-10 pr-4 py-3 rounded-xl border backdrop-blur-sm
                          transition-all duration-200 focus:outline-none focus:ring-2
                          ${getFieldError('value')
                            ? 'border-red-300 focus:ring-red-500/50'
                            : 'focus:ring-purple-500/50'
                          }
                          ${isDarkMode 
                            ? 'bg-gray-800/60 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white/60 border-gray-300 text-gray-900 placeholder-gray-500'
                          }
                        `}
                      />
                    </div>
                    {getFieldError('value') && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-1 text-red-500 text-sm"
                      >
                        <AlertCircle size={14} />
                        <span>{getFieldError('value')?.message}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Category
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(categoryConfig).map(([key, config]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, category: key as Asset['category'] }))}
                          className={`
                            p-3 rounded-xl border-2 transition-all duration-200 text-left
                            ${formData.category === key
                              ? 'border-purple-500 bg-purple-500/10'
                              : isDarkMode 
                                ? 'border-gray-600 hover:border-gray-500 bg-gray-800/40' 
                                : 'border-gray-300 hover:border-gray-400 bg-white/40'
                            }
                          `}
                        >
                          <div className="flex items-center space-x-2">
                            <config.icon size={16} className={config.color} />
                            <span className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {config.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <SecondaryButton
                      onClick={resetForm}
                      fullWidth
                      disabled={isSubmitting}
                      isDarkMode={isDarkMode}
                    >
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton
                      type="submit"
                      fullWidth
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      isDarkMode={isDarkMode}
                      icon={<Plus size={16} />}
                    >
                      Add Asset
                    </PrimaryButton>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetManager;