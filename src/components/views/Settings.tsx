import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Moon, Sun, Save, Bell, Download, Trash, Shield, User, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import DataImport from '../common/DataImport';
import { supabase } from '../../lib/supabase';

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
    enableAuthentication,
    anonymousUserId,
    cloudSyncStatus,
    lastSyncTime,
    forceSync
  } = useAppContext();

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
      anonymousUserId,
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
      const userId = isAuthenticated ? user?.id : anonymousUserId;
      
      if (settings.cloudSync && userId) {
        // Delete all user data from Supabase
        await Promise.all([
          supabase.from('journal_entries').delete().eq('user_id', userId),
          supabase.from('expenses').delete().eq('user_id', userId),
          supabase.from('net_worth_entries').delete().eq('user_id', userId),
          supabase.from('habits').delete().eq('user_id', userId),
          supabase.from('climbing_sessions').delete().eq('user_id', userId),
          supabase.from('user_profiles').delete().eq('user_id', userId)
        ]);
      }
      
      // Clear local storage
      localStorage.clear();
      
      // Reset to defaults
      setSettings({
        darkMode: false,
        autoSave: true,
        notifications: true,
        gyms: ['Crux Pflugerville', 'Crux Central', 'Mesa Rim', 'ABP - Westgate', 'ABP - Springdale'],
        categories: ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Health'],
        authenticationEnabled: false,
        cloudSync: true,
        autoBackup: true,
      });
      
      alert('All data has been cleared successfully.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear all data. Please try again.');
    }
  };

  const handleEnableAuthentication = () => {
    if (confirm('This will enable user accounts and cloud sync. Your current data will be preserved and synced to the cloud. Continue?')) {
      enableAuthentication();
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
      <div className={`p-6 rounded-2xl ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
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
            Anonymous User ID
          </h4>
          <p className={`text-sm font-mono ${
            settings.darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {anonymousUserId}
          </p>
          <p className={`text-xs mt-1 ${
            settings.darkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            This unique ID is used to sync your data across devices without requiring an account.
          </p>
        </div>
      </div>

      {/* Authentication Section */}
      <div className={`p-6 rounded-2xl ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        <h3 className={`text-lg font-semibold mb-6 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Account & Authentication
        </h3>
        
        {!settings.authenticationEnabled ? (
          <div className={`p-4 rounded-lg border-2 border-dashed ${
            settings.darkMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              <Shield size={24} className="text-blue-500" />
              <div>
                <h4 className={`font-medium ${
                  settings.darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Enable User Accounts (Optional)
                </h4>
                <p className={`text-sm ${
                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Currently using anonymous cloud sync
                </p>
              </div>
            </div>
            <p className={`text-sm mb-4 ${
              settings.darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Enable user accounts for enhanced security, multi-user support, and advanced features like AI reflections. Your current data will be preserved.
            </p>
            <button
              onClick={handleEnableAuthentication}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <User size={16} />
              <span>Enable Authentication</span>
            </button>
          </div>
        ) : (
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
                  {isAuthenticated ? 'Signed In & Syncing' : 'Authentication Enabled'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${
                isAuthenticated 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {isAuthenticated 
                  ? `Signed in as ${user?.email}. Data is automatically synced to the cloud.`
                  : 'Authentication is enabled. Sign in from the header to sync your data.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Data Import Section */}
      <DataImport />

      {/* Appearance */}
      <div className={`p-6 rounded-2xl ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        <h3 className={`text-lg font-semibold mb-6 ${
          settings.darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Appearance
        </h3>
        
        <div className="space-y-4">
          <ToggleSwitch
            label="Dark Mode"
            description="Switch between light and dark themes"
            checked={settings.darkMode}
            onChange={(checked) => updateSetting('darkMode', checked)}
            icon={settings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
          />
        </div>
      </div>

      {/* Preferences */}
      <div className={`p-6 rounded-2xl ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
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
      </div>

      {/* Data Management */}
      <div className={`p-6 rounded-2xl ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
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
      </div>

      {/* About */}
      <div className={`p-6 rounded-2xl ${
        settings.darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
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
          <p>
            Data is automatically synced to the cloud with local backup for reliability
          </p>
          <p>
            Anonymous cloud sync ensures your privacy while providing seamless data access
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;