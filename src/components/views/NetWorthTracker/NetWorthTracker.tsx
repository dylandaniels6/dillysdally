import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { settings } = useAppContext();
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

  // Handle successful form submissions
  const handleQuickAddSuccess = async (formData: any) => {
    const success = await quickAddEntry(formData);
    if (success) {
      triggerSuccessAnimation();
      setShowQuickAdd(false);
    } else {
      triggerErrorAnimation();
    }
    return success;
  };

  // Handle asset operations
  const handleAssetAdd = async (formData: any) => {
    const success = await addAsset(formData);
    if (success) {
      triggerSuccessAnimation();
    } else {
      triggerErrorAnimation();
    }
    return success;
  };

  const handleAssetUpdate = async (id: string, value: number) => {
    const success = await updateAsset(id, value);
    if (success) {
      triggerSuccessAnimation();
    } else {
      triggerErrorAnimation();
    }
    return success;
  };

  const handleAssetDelete = async (id: string) => {
    const success = await deleteAsset(id);
    if (success) {
      triggerSuccessAnimation();
    } else {
      triggerErrorAnimation();
    }
    return success;
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

          {/* Refresh Button */}
          <SecondaryButton
            onClick={() => window.location.reload()}
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
  onAddAsset={handleAssetAdd}  // Add this line
  isLoading={isLoading}
  isDarkMode={settings.darkMode}
/>
    </motion.div>
  );
};

export default NetWorthTracker;