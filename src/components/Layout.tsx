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
import StarryBackground from './views/Overview/StarryBackground';

const Layout: React.FC = () => {
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
  
  return (
    <div className="min-h-screen relative">
      {/* Global Starry Background - Always Present */}
      <StarryBackground blur={false} />
      
      {/* Main App Container */}
      <div className="relative z-10 min-h-screen">
        {/* Header - fully transparent on Overview */}
        <Header 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isTransparent={isOverviewPage}
        />
        
        {/* Sidebar - positioned below header */}
        <Sidebar isTransparent={true} />
        
        {/* Main content - adjusted for maximum sidebar width */}
        <main className="ml-52 min-h-screen pt-16">
          <div className={currentView === 'journal' ? 'px-8 pt-0 pb-6' : 'px-8 py-6'}>
            {renderCurrentView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;