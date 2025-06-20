import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Header from './common/Header';
import Sidebar from './Sidebar';
import Overview from "./views/Overview/Overview";
import DailyJournal from './views/DailyJournal';
import Journal from './views/Journal';
import MonthlyExpenses from './views/MonthlyExpenses';
import NetWorthTracker from './views/NetWorthTracker/NetWorthTracker';
import Settings from './views/Settings';
import ClimbingLog from './views/ClimbingLog';

const Layout: React.FC = () => {
  const { currentView, settings } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Check if we're on the overview page
  const isOverviewPage = currentView === 'overview';
  
  const renderCurrentView = () => {
    console.log('Current view:', currentView); // Debug log
    
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
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      settings.darkMode 
        ? 'bg-gray-950 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header - with conditional glassy styling for Overview */}
      <div className={isOverviewPage ? 'fixed top-0 left-0 right-0 z-50' : ''}>
        <div className={isOverviewPage ? 
`${settings.darkMode ? 'bg-gray-950/10' : 'bg-white/10'} backdrop-blur-lg` :          ''
        }>
          <Header 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            isTransparent={isOverviewPage}
          />
        </div>
      </div>
      
      {/* Sidebar - with conditional glassy styling for Overview */}
      <div className={isOverviewPage ? 'fixed left-0 top-0 bottom-0 z-40' : ''}>
        <Sidebar isTransparent={isOverviewPage} />
      </div>
      
      {/* Main content - Account for fixed header */}
      <main className="ml-64 min-h-screen pt-16">
        <div className={currentView === 'journal' ? 'px-8 pt-0 pb-6' : 'px-8 py-6'}>
          {renderCurrentView()}
        </div>
      </main>
    </div>
  );
};

export default Layout;