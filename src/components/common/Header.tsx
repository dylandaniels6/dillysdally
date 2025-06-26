import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, User, LogOut, Cloud, CloudOff, RefreshCw, Settings, Home } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import CalendarModal from '../views/CalendarModal';
import AuthModal from '../auth/AuthModal';

interface HeaderProps {
  toggleSidebar: () => void;
  isTransparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isTransparent = false }) => {
  const { 
    settings, 
    setSettings, 
    selectedDate, 
    user, 
    isAuthenticated, 
    signOut,
    cloudSyncStatus,
    lastSyncTime,
    forceSync,
    setCurrentView
  } = useAppContext();
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScrolled, setIsScrolled] = useState(false);

  // Update current time every second for dynamic sync display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Track scroll for dynamic header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getSyncIcon = () => {
    switch (cloudSyncStatus) {
      case 'syncing':
        return <RefreshCw size={16} className="animate-spin" />;
      case 'synced':
        return <Cloud size={16} />;
      case 'error':
        return <CloudOff size={16} />;
      case 'offline':
        return <CloudOff size={16} />;
      default:
        return <Cloud size={16} />;
    }
  };

  const getSyncButtonColor = () => {
    switch (cloudSyncStatus) {
      case 'syncing':
        return 'text-blue-500';
      case 'synced':
        return 'text-emerald-500';
      case 'error':
        return 'text-red-500';
      case 'offline':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSyncTooltip = () => {
    switch (cloudSyncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return lastSyncTime ? `Last synced: ${lastSyncTime.toLocaleTimeString()}` : 'Synced';
      case 'error':
        return 'Sync error - click to retry';
      case 'offline':
        return 'Offline - will sync when connected';
      default:
        return 'Click to sync';
    }
  };

  const getMinimalSyncTime = () => {
    if (!lastSyncTime || cloudSyncStatus !== 'synced') return null;
    
    const diffMs = currentTime.getTime() - lastSyncTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) {
      return `${diffSecs}s`;
    }
    
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 10) {
      const remainingSecs = diffSecs % 60;
      return `${diffMins}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 bg-transparent border-0 transition-all duration-500 ease-out" 
        style={{ 
          zIndex: 9999, 
          position: 'fixed', 
          isolation: 'isolate',
          willChange: 'auto',
          transform: 'translateZ(0)'
        }}
      >
        <div className="h-16 px-8">
          <div className="flex justify-between items-center h-full max-w-full">
            
            {/* Left Section - Logo with subtle animation */}
            <div className="flex items-center space-x-4 group">
              <button
                onClick={() => setCurrentView('overview')}
                className="flex items-center space-x-3 transition-all duration-300 ease-out group-hover:scale-105"
              >
                {/* Animated Logo Container */}
                <div className="relative">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ease-out transform group-hover:rotate-12 group-hover:scale-110 ${
                    settings.darkMode 
                      ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 shadow-lg shadow-blue-500/25' 
                      : 'bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 shadow-lg shadow-blue-500/25'
                  }`}>
                    <Calendar size={16} className="text-white" />
                  </div>
                  {/* Subtle glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
                </div>
                
                {/* Logo Text with subtle spring animation */}
                <h1 className="text-xl font-bold tracking-tight transition-all duration-300 ease-out text-white group-hover:tracking-wide">
                  Dilly's Dally
                </h1>
              </button>
            </div>
            
            {/* Right Section - Control Panel */}
            <div className="flex items-center space-x-2">
              
              {/* Calendar Button */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="group relative p-3 rounded-2xl transition-all duration-300 ease-out transform hover:scale-110 hover:-translate-y-0.5 text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
                title="Open calendar"
              >
                <Calendar size={20} className="transition-transform duration-300 group-hover:rotate-12" />
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
              </button>

              {/* Cloud Sync Button - Enhanced with better visual feedback */}
              {settings.cloudSync && (
                <button
                  onClick={forceSync}
                  className={`group relative flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 ease-out transform hover:scale-105 hover:-translate-y-0.5 ${getSyncButtonColor()} hover:bg-white/10 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent`}
                  title={getSyncTooltip()}
                >
                  <div className="relative">
                    {getSyncIcon()}
                    {/* Sync pulse effect for active syncing */}
                    {cloudSyncStatus === 'syncing' && (
                      <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
                    )}
                  </div>
                  
                  {cloudSyncStatus === 'synced' && lastSyncTime && (
                    <span className="text-xs font-medium opacity-70 tracking-wider font-mono">
                      {getMinimalSyncTime()}
                    </span>
                  )}
                  
                  {/* Status indicator dot */}
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    cloudSyncStatus === 'synced' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' :
                    cloudSyncStatus === 'syncing' ? 'bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse' :
                    cloudSyncStatus === 'error' ? 'bg-red-500 shadow-lg shadow-red-500/50' :
                    'bg-gray-400'
                  }`}></div>
                  
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl ${
                    cloudSyncStatus === 'synced' ? 'bg-emerald-500/20' :
                    cloudSyncStatus === 'syncing' ? 'bg-blue-500/20' :
                    cloudSyncStatus === 'error' ? 'bg-red-500/20' :
                    'bg-gray-500/20'
                  }`}></div>
                </button>
              )}

              {/* Settings Button */}
              <button
                onClick={() => setCurrentView('settings')}
                className="group relative p-3 rounded-2xl transition-all duration-300 ease-out transform hover:scale-110 hover:-translate-y-0.5 text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
                title="Settings"
              >
                <Settings size={20} className="transition-transform duration-300 group-hover:rotate-90" />
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-500/20 to-gray-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
              </button>

              {/* Authentication Section */}
              {settings.authenticationEnabled && (
                <>
                  {isAuthenticated ? (
                    <div className="relative">
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="group flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ease-out transform hover:scale-105 hover:-translate-y-0.5 text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
                        aria-label="User menu"
                      >
                        {/* Avatar with gradient border */}
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                            settings.darkMode 
                              ? 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-xl shadow-gray-900/50' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-xl shadow-gray-500/25'
                          }`}>
                            <User size={18} />
                          </div>
                          {/* Online indicator */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg"></div>
                        </div>
                        
                        {/* User email with subtle animation */}
                        <div className="hidden sm:block text-left">
                          <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0]}</p>
                          <p className="text-xs mt-1 text-white/60">
                            Online
                          </p>
                        </div>
                        
                        {/* Chevron with smooth rotation */}
                        <div className={`w-5 h-5 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`}>
                          <div className="w-full h-full border-l-2 border-b-2 border-current transform rotate-45 scale-50"></div>
                        </div>
                      </button>

                      {/* Enhanced User Dropdown with glass morphism */}
                      {showUserMenu && (
                        <div className={`absolute right-0 mt-4 w-80 rounded-3xl shadow-2xl border backdrop-blur-2xl ${
                          settings.darkMode 
                            ? 'bg-gray-900/90 border-gray-700/50 shadow-black/50' 
                            : 'bg-white/90 border-gray-200/50 shadow-gray-500/25'
                        } style={{ zIndex: 10000 }} transform animate-in slide-in-from-top-2 duration-300`}>
                          
                          {/* Header */}
                          <div className="p-6 border-b border-gray-200/20">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                settings.darkMode 
                                  ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                                  : 'bg-gradient-to-br from-blue-500 to-purple-500'
                              } shadow-xl`}>
                                <User size={20} className="text-white" />
                              </div>
                              <div>
                                <p className={`text-lg font-semibold ${
                                  settings.darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {user?.email}
                                </p>
                                <p className={`text-sm ${
                                  settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Premium Member
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Menu Items */}
                          <div className="p-3">
                            <button
                              onClick={handleSignOut}
                              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ease-out transform hover:scale-105 ${
                                settings.darkMode 
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 backdrop-blur-xl' 
                                  : 'text-red-600 hover:text-red-700 hover:bg-red-50/50 backdrop-blur-xl'
                              }`}
                            >
                              <LogOut size={18} />
                              <span className="font-medium">Sign Out</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className={`group flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all duration-300 ease-out transform hover:scale-105 hover:-translate-y-0.5 ${
                        settings.darkMode 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl shadow-blue-500/25' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-xl shadow-blue-500/25'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent`}
                    >
                      <User size={18} />
                      <span className="hidden sm:inline font-medium">Sign In</span>
                      
                      {/* Button glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/50 to-purple-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Modal - Portaled to body */}
      {isCalendarOpen && createPortal(
        <CalendarModal 
          isOpen={isCalendarOpen} 
          onClose={() => setIsCalendarOpen(false)} 
        />,
        document.body
      )}

      {/* Auth Modal - Portaled to body */}
      {settings.authenticationEnabled && showAuthModal && createPortal(
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />,
        document.body
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0" 
          style={{ zIndex: 9995 }} 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};

export default Header;