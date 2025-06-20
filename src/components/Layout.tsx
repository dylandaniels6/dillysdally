import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Header from './common/Header';
import Sidebar from './Sidebar';
import Overview from "./views/Overview/Overview";
import DailyJournal from './views/DailyJournal';
import Journal from './views/Journal';
import MonthlyExpenses from './views/MonthlyExpenses';
import NetWorthTracker from './views/NetWorthTracker/NetWorthTracker'; // ← CHANGED THIS LINE
import Settings from './views/Settings';
import ClimbingLog from './views/ClimbingLog';

const Layout: React.FC = () => {
  const { currentView, settings } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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
      {/* Header */}
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      {/* Sidebar - Fixed positioned */}
      <Sidebar />
      
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