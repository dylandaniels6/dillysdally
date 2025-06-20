import React, { useState } from 'react';
import { 
  Home, 
  BookOpen, 
  CreditCard, 
  TrendingUp, 
  Settings as SettingsIcon,
  User,
  LogOut,
  Mountain
} from 'lucide-react';
import { useAppContext, ViewMode } from '../context/AppContext';
import AuthModal from './auth/AuthModal';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  view: ViewMode;
  isActive: boolean;
  onClick: () => void;
}

interface SidebarProps {
  isTransparent?: boolean; // Add this prop
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
  const { settings } = useAppContext();
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? settings.darkMode
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-blue-600 text-white shadow-lg'
          : settings.darkMode
            ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isTransparent = false }) => { // Accept the prop
  const { currentView, setCurrentView, settings, user, signOut, isAuthenticated } = useAppContext();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navItems = [
    { icon: <Home size={20} />, label: 'Overview', view: 'overview' as ViewMode },
    { icon: <BookOpen size={20} />, label: 'Daily Journal', view: 'journal' as ViewMode },
    { icon: <Mountain size={20} />, label: 'Climbing Log', view: 'climbing' as ViewMode },
    { icon: <CreditCard size={20} />, label: 'Monthly Expenses', view: 'expenses' as ViewMode },
    { icon: <TrendingUp size={20} />, label: 'Net Worth Tracker', view: 'networth' as ViewMode },
    { icon: <SettingsIcon size={20} />, label: 'Settings', view: 'settings' as ViewMode },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <div className={`fixed left-0 top-0 h-full w-64 transition-colors duration-300 ${
        isTransparent 
          ? `${settings.darkMode ? 'bg-gray-950/10' : 'bg-white/10'} backdrop-blur-xl` // No border
          : settings.darkMode 
            ? 'bg-gray-900 border-gray-800 border-r' 
            : 'bg-white border-gray-200 border-r'
      }`}>
        <div className="p-6">
          <nav className="space-y-2 mt-16"> {/* Added mt-16 to account for header space */}
            {navItems.map((item) => (
              <NavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                view={item.view}
                isActive={currentView === item.view}
                onClick={() => setCurrentView(item.view)}
              />
            ))}
          </nav>

          {/* User Section */}
          <div className="absolute bottom-6 left-6 right-6">
            {isAuthenticated ? (
              <div className={`p-4 rounded-xl ${
                settings.darkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      settings.darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {user?.email}
                    </p>
                    <p className={`text-xs ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Signed in
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors ${
                    settings.darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl transition-colors ${
                  settings.darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <User size={16} />
                <span className="font-medium">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

export default Sidebar;