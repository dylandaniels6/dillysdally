import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Moon, Sun, Save, Bell, Download, Trash, Shield, User, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import DataImport from '../common/DataImport';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';
import { useAuth } from '@clerk/clerk-react';

// Create inline Card components since we need to fix the import path
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'metric' | 'hero';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
  loading?: boolean;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  padding = 'lg',
  hover = false,
  glow = true,
  gradient = true,
  loading = false,
  className = '',
  ...props
}) => {
  const cardVariants = {
    default: 'bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-md transition-all duration-300 ease-out',
    elevated: 'bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-2xl shadow-lg transition-all duration-300 ease-out',
    interactive: 'bg-gray-800/40 backdrop-blur-md border border-gray-700/50 hover:border-purple-500/50 rounded-2xl shadow-md hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer group transition-all duration-300 ease-out',
    metric: 'bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-2xl shadow-lg transition-all duration-300 ease-out',
    hero: 'bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-3xl shadow-xl transition-all duration-300 ease-out',
  };

  const sizeVariants = {
    sm: 'min-h-[120px]',
    md: 'min-h-[160px]',
    lg: 'min-h-[200px]',
    xl: 'min-h-[280px]',
  };

  const paddingVariants = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const getCardStyle = (): React.CSSProperties => {
    let style: React.CSSProperties = {};

    if (gradient) {
      style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)';
    }

    if (glow) {
      style.boxShadow = '0 10px 25px rgba(139, 92, 246, 0.15), 0 4px 10px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    }

    return style;
  };

  const cardClasses = [
    cardVariants[variant],
    sizeVariants[size],
    paddingVariants[padding],
    loading && 'animate-pulse',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      style={getCardStyle()}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
      
      <div className="absolute inset-[1px] rounded-inherit pointer-events-none bg-gradient-to-b from-white/5 to-transparent" />
    </div>
  );
};

const Settings: React.FC = () => {
  const { 
    settings, 
    setSettings,
    journalEntries,
    expenses,
    netWorthEntries,
    habits,
    climbingSessions,
    dataImports,
    isAuthenticated,
    user,
    cloudSyncStatus,
    lastSyncTime,
    forceSync
  } = useAppContext();

  const { getToken } = useAuth();

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleExportData = () => {
    const data = {
      journalEntries,
      expenses,
      netWorthEntries,
      habits,
      climbingSessions,
      dataImports,
      settings,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `dylans-hub-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) return;
    
    try {
      if (settings.cloudSync && isAuthenticated) {
        const token = await getToken();
        if (!token) throw new Error('No authentication token');
        
        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Delete all user data from Supabase - RLS handles user filtering automatically
        await Promise.all([
          supabase.from('journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('net_worth_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('habits').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('climbing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('user_profiles').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
        ]);
      }
      
      // Clear local storage
      localStorage.clear();
      
      // Reset to defaults
      setSettings({
        darkMode: true,
        autoSave: true,
        notifications: true,
        gyms: ['Crux Pflugerville', 'Crux Central', 'Mesa Rim', 'ABP - Westgate', 'ABP - Springdale'],
        categories: ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Health'],
        authenticationEnabled: true,
        cloudSync: true,
        autoBackup: true,
      });
      
      alert('All data has been cleared successfully.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear all data. Please try again.');
    }
  };

  const handleToggleCloudSync = () => {
    if (!settings.cloudSync) {
      if (confirm('Enable cloud sync? Your data will be automatically backed up and synchronized across devices.')) {
        updateSetting('cloudSync', true);
      }
    } else {
      if (confirm('Disable cloud sync? Your data will only be stored locally.')) {
        updateSetting('cloudSync', false);
      }
    }
  };

  const ToggleSwitch: React.FC<{
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon: React.ReactNode;
    disabled?: boolean;
  }> = ({ label, description, checked, onChange, icon, disabled = false }) => (
    <div className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
      disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : settings.darkMode 
        ? 'bg-gray-700 hover:bg-gray-600' 
        : 'bg-gray-50 hover:bg-gray-100'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${
          settings.darkMode ? 'bg-gray-600' : 'bg-gray-200'
        }`}>
          {icon}
        </div>
        <div>
          <div className={`font-medium ${
            settings.darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {label}
          </div>
          <div className={`text-sm ${
            settings.darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {description}
          </div>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          disabled 
            ? 'cursor-not-allowed' 
            : checked 
            ? 'bg-blue-600' 
            : settings.darkMode 
            ? 'bg-gray-600' 
            : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-3xl font-bold mb-2 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Settings
        </h1>
        <p className={`text-lg ${
          settings.darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Customize your experience and manage your data
        </p>
      </div>

      {/* Cloud Sync Status */}
      <Card variant="elevated">
        <h3 className={`text-lg font-semibold mb-6 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Cloud Sync & Backup
        </h3>
        
        <div className={`p-4 rounded-lg mb-6 ${
          cloudSyncStatus === 'synced' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : cloudSyncStatus === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            : cloudSyncStatus === 'offline'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                cloudSyncStatus === 'synced' ? 'bg-green-100 dark:bg-green-800' :
                cloudSyncStatus === 'error' ? 'bg-red-100 dark:bg-red-800' :
                cloudSyncStatus === 'offline' ? 'bg-yellow-100 dark:bg-yellow-800' :
                'bg-blue-100 dark:bg-blue-800'
              }`}>
                {cloudSyncStatus === 'syncing' ? (
                  <RefreshCw size={20} className="animate-spin text-blue-600" />
                ) : cloudSyncStatus === 'synced' ? (
                  <Cloud size={20} className="text-green-600" />
                ) : cloudSyncStatus === 'error' ? (
                  <CloudOff size={20} className="text-red-600" />
                ) : (
                  <CloudOff size={20} className="text-yellow-600" />
                )}
              </div>
              <div>
                <h4 className={`font-medium ${
                  cloudSyncStatus === 'synced' ? 'text-green-800 dark:text-green-200' :
                  cloudSyncStatus === 'error' ? 'text-red-800 dark:text-red-200' :
                  cloudSyncStatus === 'offline' ? 'text-yellow-800 dark:text-yellow-200' :
                  'text-blue-800 dark:text-blue-200'
                }`}>
                  {cloudSyncStatus === 'syncing' ? 'Syncing Data...' :
                   cloudSyncStatus === 'synced' ? 'Cloud Sync Active' :
                   cloudSyncStatus === 'error' ? 'Sync Error' :
                   cloudSyncStatus === 'offline' ? 'Offline Mode' : 'Unknown Status'}
                </h4>
                <p className={`text-sm ${
                  cloudSyncStatus === 'synced' ? 'text-green-700 dark:text-green-300' :
                  cloudSyncStatus === 'error' ? 'text-red-700 dark:text-red-300' :
                  cloudSyncStatus === 'offline' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-blue-700 dark:text-blue-300'
                }`}>
                  {cloudSyncStatus === 'syncing' ? 'Your data is being synchronized...' :
                   cloudSyncStatus === 'synced' ? `Last synced: ${lastSyncTime?.toLocaleString() || 'Unknown'}` :
                   cloudSyncStatus === 'error' ? 'Failed to sync data. Check your connection.' :
                   cloudSyncStatus === 'offline' ? 'No internet connection. Data saved locally.' :
                   'Status unknown'}
                </p>
              </div>
            </div>
            {settings.cloudSync && (
              <button
                onClick={forceSync}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  settings.darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Force Sync
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ToggleSwitch
            label="Cloud Sync"
            description="Automatically sync your data to the cloud for backup and cross-device access"
            checked={settings.cloudSync}
            onChange={handleToggleCloudSync}
            icon={settings.cloudSync ? <Cloud size={20} /> : <CloudOff size={20} />}
          />
          
          <ToggleSwitch
            label="Auto Backup"
            description="Automatically create backups of your data every 30 seconds"
            checked={settings.autoBackup}
            onChange={(checked) => updateSetting('autoBackup', checked)}
            icon={<Save size={20} />}
            disabled={!settings.cloudSync}
          />
        </div>

        <div className={`mt-6 p-4 rounded-lg ${
          settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <h4 className={`font-medium mb-2 ${
            settings.darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            User ID
          </h4>
          <p className={`text-sm font-mono ${
            settings.darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {user?.id || 'Not authenticated'}
          </p>
          <p className={`text-xs mt-1 ${
            settings.darkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            This unique ID is used to sync your data securely across devices.
          </p>
        </div>
      </Card>

      {/* Authentication Section */}
      <Card variant="elevated">
        <h3 className={`text-lg font-semibold mb-6 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Account & Authentication
        </h3>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${
            isAuthenticated 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center space-x-2">
              <Shield size={18} className={isAuthenticated ? 'text-green-600' : 'text-yellow-600'} />
              <span className={`font-medium ${
                isAuthenticated 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {isAuthenticated ? 'Signed In & Syncing' : 'Authentication Required'}
              </span>
            </div>
            <p className={`text-sm mt-1 ${
              isAuthenticated 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {isAuthenticated 
                ? `Signed in as ${user?.primaryEmailAddress?.emailAddress || user?.firstName || 'User'}. Data is automatically synced to the cloud.`
                : 'Authentication is required to use this app. Please sign in to continue.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Data Import Section */}
      <DataImport />

      {/* Appearance */}
      <Card variant="elevated">
        <h3 className="text-lg font-semibold mb-6 text-white">
          Appearance
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gray-600">
                <Moon size={20} />
              </div>
              <div>
                <div className="font-medium text-white">
                  Dark Mode
                </div>
                <div className="text-sm text-gray-400">
                  Your site is now exclusively in dark mode
                </div>
              </div>
            </div>
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card variant="elevated">
        <h3 className={`text-lg font-semibold mb-6 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Preferences
        </h3>
        
        <div className="space-y-4">
          <ToggleSwitch
            label="Auto Save"
            description="Automatically save your entries as you type (30 second intervals)"
            checked={settings.autoSave}
            onChange={(checked) => updateSetting('autoSave', checked)}
            icon={<Save size={20} />}
          />
          
          <ToggleSwitch
            label="Notifications"
            description="Receive reminders and updates"
            checked={settings.notifications}
            onChange={(checked) => updateSetting('notifications', checked)}
            icon={<Bell size={20} />}
          />
        </div>
      </Card>

      {/* Data Management */}
      <Card variant="elevated">
        <h3 className={`text-lg font-semibold mb-6 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Data Management
        </h3>
        
        <div className="space-y-4">
          <button
            onClick={handleExportData}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
              settings.darkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <div>
              <p className={`font-medium text-left ${
                settings.darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Export Data
              </p>
              <p className={`text-sm text-left ${
                settings.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Download all your data as a JSON file for backup
              </p>
            </div>
            <Download size={20} className={
              settings.darkMode ? 'text-gray-400' : 'text-gray-500'
            } />
          </button>
          
          <button
            onClick={handleClearAllData}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
              settings.darkMode 
                ? 'bg-red-900/20 hover:bg-red-900/30' 
                : 'bg-red-50 hover:bg-red-100'
            }`}
          >
            <div>
              <p className={`font-medium text-left ${
                settings.darkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                Clear All Data
              </p>
              <p className={`text-sm text-left ${
                settings.darkMode ? 'text-red-300' : 'text-red-500'
              }`}>
                Permanently delete all your data from cloud and local storage
              </p>
            </div>
            <Trash size={20} className={
              settings.darkMode ? 'text-red-400' : 'text-red-500'
            } />
          </button>
        </div>
      </Card>

      {/* About */}
      <Card variant="elevated">
        <h3 className={`text-lg font-semibold mb-4 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          About
        </h3>
        
        <div className={`space-y-2 text-sm ${
          settings.darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <p>Dylan's Hub v2.0.0</p>
          <p>A modern journaling and productivity tracking application</p>
          <p>Built with React, TypeScript, and Tailwind CSS</p>
          <p>Powered by Clerk authentication and Supabase database</p>
          <p>
            Data is securely synced to the cloud with local backup for reliability
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Settings;