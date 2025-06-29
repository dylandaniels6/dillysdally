import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAppContext } from '../context/AppContext';
import Header from './common/Header';
import Sidebar from './Sidebar';
import Overview from "./views/Overview/Overview";
import DailyJournal from './views/DailyJournal';
import Journal from './views/Journal';
import MonthlyExpenses from './views/MonthlyExpenses';
import NetWorthTracker from './views/NetWorthTracker/NetWorthTracker';
import Settings from './views/Settings';
import ClimbingLog from './views/ClimbingLog/ClimbingLog';
import StarryBackground from './views/Overview/StarryBackground';

const Layout: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { currentView, settings } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Check if we're on the overview page
  const isOverviewPage = currentView === 'overview';
  
  const renderCurrentView = () => {
    console.log('Current view:', currentView);
    
    switch (currentView) {
      case 'overview':
        return <Overview />;
      case 'journal':
        return <DailyJournal />;
      case 'climbing':
        return <ClimbingLog />;
      case 'expenses':
        return <MonthlyExpenses />;
      case 'networth':
        return <NetWorthTracker />;
      case 'settings':
        return <Settings />;
      default:
        return <Overview />;
    }
  };

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 overflow-hidden">
        <StarryBackground blur={false} />
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication prompt if not signed in
  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 overflow-hidden">
        <StarryBackground blur={false} />
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">
              <h1 className="text-2xl font-bold text-white mb-4">
                Welcome to Dylan's Hub
              </h1>
              <p className="text-white/70 mb-6">
                Your personal productivity companion for journaling, habit tracking, climbing logs, and financial insights.
              </p>
              <p className="text-white/60 text-sm mb-6">
                Please sign in to access your data and sync across devices.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Global Starry Background - Always Present */}
      <StarryBackground blur={false} />
      
      {/* Main App Container */}
      <div className="relative h-full">
        {/* Header */}
        <Header 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isTransparent={isOverviewPage}
        />
        
        {/* Sidebar */}
        <Sidebar isTransparent={true} />
        
        {/* Main content */}
        <main className="ml-52 h-full pt-16">
          <div className={`h-full overflow-y-auto ${currentView === 'journal' ? 'px-8 pt-0 pb-6' : 'px-8 py-6'}`}>
            {renderCurrentView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;