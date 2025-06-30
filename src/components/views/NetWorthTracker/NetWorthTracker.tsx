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
  Upload
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

const NetWorthTracker: React.FC = () => {
  const { getToken } = useAuth();
  const { settings, isAuthenticated } = useAppContext();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('overview');

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

  // Handle successful form submissions with authentication
  const handleQuickAddSuccess = async (formData: any) => {
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
          date: formData.date,
          cashEquivalents: formData.cashEquivalents || 0,
          creditCards: formData.creditCards || 0,
          assets: formData.assets || [],
          notes: formData.notes || ''
        }])
        .select()
        .single();

      if (error) throw error;

      const success = await quickAddEntry(formData);
      if (success) {
        triggerSuccessAnimation();
        setShowQuickAdd(false);
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

  // Handle asset operations with authentication
  const handleAssetAdd = async (formData: any) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // You might want to store assets separately or as part of net worth entries
      // This depends on your data structure - adjust as needed
      
      const success = await addAsset(formData);
      if (success) {
        triggerSuccessAnimation();
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

  const handleAssetUpdate = async (id: string, value: number) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Update asset in database - adjust based on your schema
      
      const success = await updateAsset(id, value);
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

  const handleAssetDelete = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Delete asset from database - adjust based on your schema
      
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

  // Handle data export with authentication
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
      
      // Export data
      const exportData = {
        netWorthEntries: data,
        summary: summary,
        activeAssets: activeAssets,
        exportDate: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `networth-data-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
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
      
      const supabase = createAuthenticatedSupabaseClient(token, userId);
      
      // Trigger a data refresh - you might want to call your data loading functions
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
          {/* Quick Add Button */}
          <PrimaryButton
            onClick={() => setShowQuickAdd(true)}
            icon={<Plus size={18} />}
            isDarkMode={settings.darkMode}
            glow={true}
            className="shadow-lg"
          >
            Quick Add
          </PrimaryButton>

          {/* Export Button */}
          <SecondaryButton
            onClick={handleExportData}
            icon={<Download size={16} />}
            isDarkMode={settings.darkMode}
          />

          {/* Refresh Button */}
          <SecondaryButton
            onClick={handleRefreshData}
            icon={<RefreshCw size={16} />}
            isDarkMode={settings.darkMode}
            disabled={isLoading}
            className={isLoading ? 'animate-spin' : ''}
          />
        </div>
      </motion.div>

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
              {/* Summary Cards */}
              <NetWorthSummary
                summary={summary}
                isLoading={isLoading}
                isDarkMode={settings.darkMode}
              />

              {/* Chart Preview */}
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

              {/* Quick Asset Overview */}
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

      {/* Quick Add Modal */}
      <QuickAddForm
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSubmit={handleQuickAddSuccess}
        onAddAsset={handleAssetAdd}
        isLoading={isLoading}
        isDarkMode={settings.darkMode}
      />
    </motion.div>
  );
};

export default NetWorthTracker;