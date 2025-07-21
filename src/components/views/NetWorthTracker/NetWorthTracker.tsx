import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../../../lib/supabase';
import { 
  Plus, 
  TrendingUp, 
  Package, 
  BarChart3, 
  Calendar,
  RefreshCw,
  Settings,
  Download,
  Upload,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useNetWorthData } from './hooks/useNetWorthData';
import { useNetWorthAnimations } from './hooks/useNetWorthAnimations';
import { ViewMode } from './types/networth.types';

// Components
import NetWorthSummary from './NetWorthSummary';
import QuickAddForm from './QuickAddForm';
import AssetManager from './AssetManager';
import NetWorthChart from './NetWorthChart';
import { PrimaryButton, SecondaryButton } from './shared/SpringButton';
import { GlassCard } from './shared/GlassCard';
import { motionVariants, staggerDelays } from './utils/animationPresets';

// 🔒 VALIDATION FUNCTIONS
const validateNetWorthEntry = (entry: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Date validation
  if (!entry.date) {
    errors.push('Date is required');
  } else {
    const date = new Date(entry.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    } else if (date > new Date()) {
      errors.push('Date cannot be in the future');
    } else if (date < new Date('1900-01-01')) {
      errors.push('Date is too far in the past');
    }
  }

  // Cash equivalents validation
  if (entry.cashEquivalents !== undefined && entry.cashEquivalents !== null) {
    if (typeof entry.cashEquivalents !== 'number' || isNaN(entry.cashEquivalents)) {
      errors.push('Cash equivalents must be a valid number');
    } else if (entry.cashEquivalents < 0) {
      errors.push('Cash equivalents cannot be negative');
    } else if (entry.cashEquivalents > 100000000) {
      errors.push('Cash equivalents amount seems unrealistic (max $100M)');
    }
  }

  // Credit cards validation
  if (entry.creditCards !== undefined && entry.creditCards !== null) {
    if (typeof entry.creditCards !== 'number' || isNaN(entry.creditCards)) {
      errors.push('Credit card debt must be a valid number');
    } else if (entry.creditCards < 0) {
      errors.push('Credit card debt must be positive (enter as positive amount)');
    } else if (entry.creditCards > 10000000) {
      errors.push('Credit card debt amount seems unrealistic (max $10M)');
    }
  }

  // Assets validation
  if (entry.assets) {
    if (!Array.isArray(entry.assets)) {
      errors.push('Assets must be an array');
    } else if (entry.assets.length > 1000) {
      errors.push('Too many assets (max 1000)');
    } else {
      entry.assets.forEach((asset: any, index: number) => {
        if (!asset || typeof asset !== 'object') {
          errors.push(`Asset ${index + 1} is invalid`);
          return;
        }

        // Asset name validation
        if (!asset.name || typeof asset.name !== 'string') {
          errors.push(`Asset ${index + 1}: Name is required`);
        } else if (asset.name.length > 200) {
          errors.push(`Asset ${index + 1}: Name is too long (max 200 characters)`);
        }

        // Asset value validation
        if (asset.value === undefined || asset.value === null) {
          errors.push(`Asset ${index + 1}: Value is required`);
        } else if (typeof asset.value !== 'number' || isNaN(asset.value)) {
          errors.push(`Asset ${index + 1}: Value must be a valid number`);
        } else if (asset.value < 0) {
          errors.push(`Asset ${index + 1}: Value cannot be negative`);
        } else if (asset.value > 1000000000) {
          errors.push(`Asset ${index + 1}: Value seems unrealistic (max $1B)`);
        }

        // Asset category validation
        if (asset.category && typeof asset.category === 'string') {
          const validCategories = ['real_estate', 'investments', 'vehicles', 'personal', 'other'];
          if (!validCategories.includes(asset.category)) {
            errors.push(`Asset ${index + 1}: Invalid category`);
          }
        }
      });
    }
  }

  // Notes validation
  if (entry.notes && typeof entry.notes === 'string' && entry.notes.length > 1000) {
    errors.push('Notes are too long (max 1000 characters)');
  }

  return { valid: errors.length === 0, errors };
};

const validateAssetData = (asset: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Name validation
  if (!asset.name || typeof asset.name !== 'string') {
    errors.push('Asset name is required');
  } else if (asset.name.length < 2) {
    errors.push('Asset name must be at least 2 characters');
  } else if (asset.name.length > 200) {
    errors.push('Asset name is too long (max 200 characters)');
  }

  // Value validation
  if (asset.value === undefined || asset.value === null) {
    errors.push('Asset value is required');
  } else if (typeof asset.value !== 'number' || isNaN(asset.value)) {
    errors.push('Asset value must be a valid number');
  } else if (asset.value < 0) {
    errors.push('Asset value cannot be negative');
  } else if (asset.value > 1000000000) {
    errors.push('Asset value seems unrealistic (max $1B)');
  }

  // Category validation
  if (!asset.category || typeof asset.category !== 'string') {
    errors.push('Asset category is required');
  } else {
    const validCategories = ['real_estate', 'investments', 'vehicles', 'personal', 'other'];
    if (!validCategories.includes(asset.category)) {
      errors.push('Invalid asset category');
    }
  }

  return { valid: errors.length === 0, errors };
};

const sanitizeNetWorthInput = (input: string): string => {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
};

const sanitizeNumericInput = (value: any, min: number, max: number): number => {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return Math.max(min, Math.min(num, max));
};

// Enhanced validation hook
const useNetWorthValidation = () => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const validateEntry = (entry: any) => {
    const validation = validateNetWorthEntry(entry);
    setValidationErrors(validation.errors);

    // Add warnings for potential issues
    const warnings: string[] = [];
    
    const totalAssets = (entry.cashEquivalents || 0) + 
                       (entry.assets?.reduce((sum: number, asset: any) => sum + (asset.value || 0), 0) || 0);
    const totalDebts = entry.creditCards || 0;
    const netWorth = totalAssets - totalDebts;
    
    if (netWorth < 0 && Math.abs(netWorth) > 100000) {
      warnings.push('Significant negative net worth - consider debt reduction strategies');
    }
    
    if (entry.cashEquivalents > totalAssets * 0.5 && totalAssets > 10000) {
      warnings.push('High cash percentage - consider investment opportunities');
    }
    
    if (entry.creditCards > entry.cashEquivalents * 2) {
      warnings.push('Credit card debt is high relative to cash - consider paying down debt');
    }

    setValidationWarnings(warnings);
    return validation.valid;
  };

  const validateAsset = (asset: any) => {
    const validation = validateAssetData(asset);
    setValidationErrors(validation.errors);

    // Add asset-specific warnings
    const warnings: string[] = [];
    
    if (asset.value < 100 && asset.category !== 'personal') {
      warnings.push('Very low asset value - consider if this asset is worth tracking');
    }
    
    if (asset.category === 'vehicles' && asset.value > 500000) {
      warnings.push('High vehicle value - ensure proper insurance coverage');
    }

    setValidationWarnings(warnings);
    return validation.valid;
  };

  const clearValidation = () => {
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  return {
    validationErrors,
    validationWarnings,
    validateEntry,
    validateAsset,
    clearValidation
  };
};

const NetWorthTracker: React.FC = () => {
  const { getToken } = useAuth();
  const { settings, isAuthenticated } = useAppContext();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('overview');

  // 🔒 VALIDATION: Use validation hook
  const { 
    validationErrors, 
    validationWarnings, 
    validateEntry, 
    validateAsset, 
    clearValidation 
  } = useNetWorthValidation();

  // Hook into our data management
  const {
    summary,
    metrics,
    chartData,
    trend,
    activeAssets,
    isLoading,
    hasError,
    errorMessage,
    chartConfig,
    quickAddEntry,
    addAsset,
    updateAsset,
    deleteAsset,
    updateChartConfig,
    clearError,
  } = useNetWorthData();

  // Animation hooks
  const { 
    cardSprings, 
    triggerSuccessAnimation,
    triggerErrorAnimation 
  } = useNetWorthAnimations(summary, isLoading, hasError);

  // 🔒 VALIDATION: Enhanced form submission with validation
  const handleQuickAddSuccess = async (formData: any) => {
    // Clear previous validation
    clearValidation();

    // Sanitize inputs
    const sanitizedData = {
      ...formData,
      notes: formData.notes ? sanitizeNetWorthInput(formData.notes) : '',
      cashEquivalents: sanitizeNumericInput(formData.cashEquivalents, 0, 100000000),
      creditCards: sanitizeNumericInput(formData.creditCards, 0, 10000000),
      assets: formData.assets?.map((asset: any) => ({
        ...asset,
        name: sanitizeNetWorthInput(asset.name || ''),
        value: sanitizeNumericInput(asset.value, 0, 1000000000)
      }))
    };

    // Validate the sanitized data
    const isValid = validateEntry(sanitizedData);
    if (!isValid) {
      triggerErrorAnimation();
      return false; // Validation errors will be shown
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Add the entry to database
      const { data, error } = await supabase
        .from('net_worth_entries')
        .insert([{
          date: sanitizedData.date,
          cash_equivalents: sanitizedData.cashEquivalents || 0,
          credit_cards: sanitizedData.creditCards || 0,
          assets: sanitizedData.assets || [],
          notes: sanitizedData.notes || ''
        }])
        .select()
        .single();

      if (error) throw error;

      const success = await quickAddEntry(sanitizedData);
      if (success) {
        triggerSuccessAnimation();
        setShowQuickAdd(false);
        clearValidation();
      } else {
        triggerErrorAnimation();
      }
      return success;
    } catch (error) {
      console.error('Error adding net worth entry:', error);
      triggerErrorAnimation();
      return false;
    }
  };

  // 🔒 VALIDATION: Enhanced asset operations with validation
  const handleAssetAdd = async (formData: any) => {
    // Clear previous validation
    clearValidation();

    // Sanitize inputs
    const sanitizedAsset = {
      ...formData,
      name: sanitizeNetWorthInput(formData.name || ''),
      value: sanitizeNumericInput(formData.value, 0, 1000000000)
    };

    // Validate the sanitized asset
    const isValid = validateAsset(sanitizedAsset);
    if (!isValid) {
      triggerErrorAnimation();
      return false;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Add asset to database (adjust based on your schema)
      
      const success = await addAsset(sanitizedAsset);
      if (success) {
        triggerSuccessAnimation();
        clearValidation();
      } else {
        triggerErrorAnimation();
      }
      return success;
    } catch (error) {
      console.error('Error adding asset:', error);
      triggerErrorAnimation();
      return false;
    }
  };

  // 🔒 VALIDATION: Enhanced asset update with validation
  const handleAssetUpdate = async (id: string, value: number) => {
    // Validate the value
    const sanitizedValue = sanitizeNumericInput(value, 0, 1000000000);
    
    if (value !== sanitizedValue) {
      alert(`Value adjusted to valid range: $${sanitizedValue.toLocaleString()}`);
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Update asset in database
      
      const success = await updateAsset(id, sanitizedValue);
      if (success) {
        triggerSuccessAnimation();
      } else {
        triggerErrorAnimation();
      }
      return success;
    } catch (error) {
      console.error('Error updating asset:', error);
      triggerErrorAnimation();
      return false;
    }
  };

  // 🔒 VALIDATION: Enhanced asset delete with confirmation
  const handleAssetDelete = async (id: string) => {
    const asset = activeAssets.find(a => a.id === id);
    if (!asset) return false;

    // Enhanced confirmation
    const confirmMessage = `Are you sure you want to delete "${asset.name}"?\n\nValue: $${asset.value.toLocaleString()}\nCategory: ${asset.category.replace('_', ' ')}\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return false;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Delete asset from database
      
      const success = await deleteAsset(id);
      if (success) {
        triggerSuccessAnimation();
      } else {
        triggerErrorAnimation();
      }
      return success;
    } catch (error) {
      console.error('Error deleting asset:', error);
      triggerErrorAnimation();
      return false;
    }
  };

  // 🔒 VALIDATION: Enhanced data export with validation
  const handleExportData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        alert('Please sign in to export data');
        return;
      }
      
      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Fetch all net worth data
      const { data, error } = await supabase
        .from('net_worth_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Validate data before export
      const validEntries = data.filter(entry => {
        const validation = validateNetWorthEntry(entry);
        if (!validation.valid) {
          console.warn('Excluding invalid entry from export:', entry, validation.errors);
        }
        return validation.valid;
      });

      const validAssets = activeAssets.filter(asset => {
        const validation = validateAssetData(asset);
        if (!validation.valid) {
          console.warn('Excluding invalid asset from export:', asset, validation.errors);
        }
        return validation.valid;
      });
      
      // Export data with validation report
      const exportData = {
        netWorthEntries: validEntries,
        summary: summary,
        activeAssets: validAssets,
        exportDate: new Date().toISOString(),
        validationReport: {
          totalEntries: data.length,
          validEntries: validEntries.length,
          invalidEntries: data.length - validEntries.length,
          totalAssets: activeAssets.length,
          validAssets: validAssets.length,
          invalidAssets: activeAssets.length - validAssets.length
        }
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `networth-data-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      // Show export summary
      const invalidCount = (data.length - validEntries.length) + (activeAssets.length - validAssets.length);
      if (invalidCount > 0) {
        alert(`Export completed. ${invalidCount} invalid records excluded from export.`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Handle data refresh with authentication
  const handleRefreshData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        alert('Please sign in to refresh data');
        return;
      }
      
      clearValidation();
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to refresh data. Please try again.');
    }
  };

  // View navigation
  const viewConfig = {
    overview: {
      label: 'Overview',
      icon: BarChart3,
      description: 'Summary and trends',
    },
    detailed: {
      label: 'Chart',
      icon: TrendingUp,
      description: 'Interactive chart view',
    },
    assets: {
      label: 'Assets',
      icon: Package,
      description: 'Manage your assets',
    },
  };

  // Clear error on view change
  useEffect(() => {
    if (hasError) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasError, clearError]);

  return (
    <motion.div
      className="min-h-screen p-6 space-y-8"
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        variants={motionVariants.slideUp}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0"
      >
        {/* View Navigation */}
        <div className={`flex items-center space-x-1 p-2 rounded-xl backdrop-blur-sm border ${
          settings.darkMode 
            ? 'bg-gray-800/80 border-gray-700/50' 
            : 'bg-white/80 border-gray-200/50'
        } shadow-lg w-fit`}>
            {Object.entries(viewConfig).map(([key, config]) => {
              const isActive = currentView === key;
              const IconComponent = config.icon;
              
              return (
                <button
                  key={key}
                  onClick={() => setCurrentView(key as ViewMode)}
                  className={`
                    flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200
                    ${isActive
                      ? settings.darkMode
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-purple-600 text-white shadow-lg'
                      : settings.darkMode
                        ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }
                  `}
                >
                  <IconComponent size={16} />
                  <span className="font-medium">{config.label}</span>
                </button>
              );
            })}
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-3">
          <PrimaryButton
            onClick={() => {
              clearValidation();
              setShowQuickAdd(true);
            }}
            icon={<Plus size={18} />}
            isDarkMode={settings.darkMode}
            glow={true}
            className="shadow-lg"
          >
            Quick Add
          </PrimaryButton>

          <SecondaryButton
            onClick={handleExportData}
            icon={<Download size={16} />}
            isDarkMode={settings.darkMode}
          />

          <SecondaryButton
            onClick={handleRefreshData}
            icon={<RefreshCw size={16} />}
            isDarkMode={settings.darkMode}
            disabled={isLoading}
            className={isLoading ? 'animate-spin' : ''}
          />
        </div>
      </motion.div>

      {/* 🔒 VALIDATION: Validation errors display */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="space-y-2">
          {validationErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`p-4 rounded-xl border ${
                settings.darkMode
                  ? 'bg-red-900/20 border-red-700/50 text-red-400'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} />
                <h4 className="font-medium text-sm">Please fix these issues:</h4>
              </div>
              <ul className="text-xs space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </motion.div>
          )}
          
          {validationWarnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`p-4 rounded-xl border ${
                settings.darkMode
                  ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} />
                <h4 className="font-medium text-sm">Suggestions:</h4>
              </div>
              <ul className="text-xs space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      )}

      {/* Error Banner */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`p-4 rounded-xl border ${
              settings.darkMode
                ? 'bg-red-900/20 border-red-700/50 text-red-400'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{errorMessage}</p>
              <button
                onClick={clearError}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                  settings.darkMode
                    ? 'bg-red-800/50 hover:bg-red-800'
                    : 'bg-red-100 hover:bg-red-200'
                }`}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Authentication Warning */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            settings.darkMode
              ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}
        >
          <p className="text-sm font-medium">
            Please sign in to access your net worth data and enable data syncing.
          </p>
        </motion.div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
          className="space-y-8"
        >
          {/* Overview View */}
          {currentView === 'overview' && (
            <>
              <NetWorthSummary
                summary={summary}
                isLoading={isLoading}
                isDarkMode={settings.darkMode}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-semibold ${
                    settings.darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Progress Overview
                  </h2>
                  <SecondaryButton
                    onClick={() => setCurrentView('detailed')}
                    icon={<TrendingUp size={16} />}
                    isDarkMode={settings.darkMode}
                    size="small"
                  >
                    View Details
                  </SecondaryButton>
                </div>

                <NetWorthChart
                  data={chartData}
                  config={chartConfig}
                  onConfigChange={updateChartConfig}
                  isLoading={isLoading}
                  isDarkMode={settings.darkMode}
                />
              </div>

              {activeAssets.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-semibold ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Top Assets
                    </h2>
                    <SecondaryButton
                      onClick={() => setCurrentView('assets')}
                      icon={<Package size={16} />}
                      isDarkMode={settings.darkMode}
                      size="small"
                    >
                      Manage All
                    </SecondaryButton>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeAssets
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 3)
                      .map((asset, index) => (
                        <motion.div
                          key={asset.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <GlassCard
                            variant="default"
                            padding="medium"
                            isDarkMode={settings.darkMode}
                            className="text-center"
                          >
                            <h3 className={`font-medium mb-1 ${
                              settings.darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {asset.name}
                            </h3>
                            <p className={`text-lg font-bold text-purple-600`}>
                              ${asset.value.toLocaleString()}
                            </p>
                            <p className={`text-xs ${
                              settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {asset.category.replace('_', ' ').toUpperCase()}
                            </p>
                          </GlassCard>
                        </motion.div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Detailed Chart View */}
          {currentView === 'detailed' && (
            <NetWorthChart
              data={chartData}
              config={chartConfig}
              onConfigChange={updateChartConfig}
              isLoading={isLoading}
              isDarkMode={settings.darkMode}
            />
          )}

          {/* Assets View */}
          {currentView === 'assets' && (
            <AssetManager
              assets={activeAssets}
              onAddAsset={handleAssetAdd}
              onUpdateAsset={handleAssetUpdate}
              onDeleteAsset={handleAssetDelete}
              isLoading={isLoading}
              isDarkMode={settings.darkMode}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Enhanced Quick Add Modal with validation */}
      <QuickAddForm
        isOpen={showQuickAdd}
        onClose={() => {
          setShowQuickAdd(false);
          clearValidation();
        }}
        onSubmit={handleQuickAddSuccess}
        onAddAsset={handleAssetAdd}
        isLoading={isLoading}
        isDarkMode={settings.darkMode}
        validationErrors={validationErrors}
        validationWarnings={validationWarnings}
        onValidate={validateEntry}
        onClearValidation={clearValidation}
      />
    </motion.div>
  );
};

export default NetWorthTracker;