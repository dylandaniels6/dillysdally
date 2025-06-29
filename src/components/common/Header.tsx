import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, User, LogOut, Cloud, CloudOff, RefreshCw, Settings, Home } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useAppContext } from '../../context/AppContext';
import CalendarModal from '../views/CalendarModal';

interface HeaderProps {
  toggleSidebar: () => void;
  isTransparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isTransparent = false }) => {
  const { 
    settings, 
    setSettings, 
    selectedDate, 
    cloudSyncStatus,
    lastSyncTime,
    forceSync,
    setCurrentView
  } = useAppContext();
  
  // Clerk user hook
  const { user, isLoaded } = useUser();
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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

              {/* Clerk User Button - Replaces all the custom auth logic */}
              {isLoaded && user && (
                <div className="relative">
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-12 h-12 rounded-2xl shadow-xl transition-all duration-300 hover:scale-110 hover:-translate-y-0.5",
                        userButtonPopoverCard: "bg-gray-900/90 backdrop-blur-2xl border-gray-700/50 rounded-3xl shadow-2xl",
                        userButtonPopoverActions: "text-white",
                        userButtonPopoverActionButton: "text-white hover:bg-white/10 rounded-2xl transition-all duration-300",
                        userButtonPopoverActionButtonText: "text-white",
                        userButtonPopoverFooter: "hidden" // Hide Clerk branding if desired
                      }
                    }}
                    userProfileMode="navigation"
                    userProfileUrl="/user-profile"
                    afterSignOutUrl="/"
                  />
                  
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-lg"></div>
                </div>
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
    </>
  );
};

export default Header;