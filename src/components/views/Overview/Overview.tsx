import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import AIChat from './AIChat';
import YesterdayRecap from './YesterdayRecap';
import TodoList from './TodoList';
import StarryBackground from './StarryBackground';
import ChatHistory from './ChatHistory';
import { generateDailyRecap } from './utils/summaryGenerator';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const Overview: React.FC = () => {
  const { 
    journalEntries, 
    expenses, 
    climbingSessions,
    habits,
    settings 
  } = useAppContext();

  const [isLoading, setIsLoading] = useState(true);
  const [dailyRecap, setDailyRecap] = useState<string>('');
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isManuallyToggled, setIsManuallyToggled] = useState(false);
  const hasGeneratedToday = useRef(false);

  // Prevent body scroll when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Smart auto-collapse/expand based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      // Only auto-adjust if user hasn't manually toggled
      if (!isManuallyToggled) {
        if (width < 1400) {
          setIsSidebarCollapsed(true);
        } else {
          setIsSidebarCollapsed(false);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isManuallyToggled]);

  // Reset manual toggle on significant resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Reset manual override if screen becomes very large
      if (width > 1600 && isManuallyToggled) {
        setIsManuallyToggled(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isManuallyToggled]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsManuallyToggled(true);
  };

  // Generate daily recap on first load
  useEffect(() => {
    const generateRecap = async () => {
      if (hasGeneratedToday.current) return;
      
      const today = new Date().toDateString();
      const lastGenerated = localStorage.getItem('lastRecapDate');
      
      if (lastGenerated === today) {
        const savedRecap = localStorage.getItem('dailyRecap');
        if (savedRecap) {
          setDailyRecap(savedRecap);
          setIsLoading(false);
          return;
        }
      }

      try {
        const recap = await generateDailyRecap({
          journalEntries,
          expenses,
          climbingSessions,
          habits
        });
        
        setDailyRecap(recap);
        localStorage.setItem('dailyRecap', recap);
        localStorage.setItem('lastRecapDate', today);
        hasGeneratedToday.current = true;
      } catch (error) {
        console.error('Failed to generate daily recap:', error);
        setDailyRecap('Unable to generate daily recap. Please check your API configuration.');
      } finally {
        setIsLoading(false);
      }
    };

    generateRecap();
  }, [journalEntries, expenses, climbingSessions, habits]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Animated Background */}
      <StarryBackground blur={isChatFocused || showChatHistory} />
      
      {/* Main Content Container */}
      <div className="relative z-10 h-full">
        {/* AI Chat - Always centered */}
        <div className="absolute inset-0 flex items-center justify-center px-4 py-16">
          <div className={`w-full max-w-3xl h-full max-h-[calc(100vh-8rem)] transition-all duration-300 ${
            !isSidebarCollapsed ? 'lg:ml-[-160px]' : ''
          }`}>
            <AIChat 
              dailyRecap={dailyRecap}
              isLoading={isLoading}
              onFocusChange={setIsChatFocused}
              onHistoryClick={() => setShowChatHistory(true)}
            />
          </div>
        </div>

        {/* Side Panel with Arrow Button */}
        <div className="hidden lg:block">
          {/* Arrow Button - Centered on left edge of sidebar */}
          <button
            onClick={handleToggleSidebar}
            className={`fixed top-1/2 -translate-y-1/2 w-6 h-12 bg-white/5 backdrop-blur-md border border-white/10 rounded-l-full flex items-center justify-center hover:bg-white/10 transition-all hover:w-7 z-20 ${
              isSidebarCollapsed ? 'right-0' : 'right-[336px]'
            }`}
          >
            {isSidebarCollapsed ? (
              <ChevronLeft size={14} className="text-white/70" />
            ) : (
              <ChevronRight size={14} className="text-white/70" />
            )}
          </button>

          {/* Sidebar Content */}
          <div className={`fixed right-4 top-16 bottom-16 w-80 flex flex-col gap-4 transition-all duration-300 ${
            isSidebarCollapsed ? 'translate-x-[400px]' : ''
          }`}>
            <div className="flex-1 overflow-y-auto space-y-4">
              <YesterdayRecap />
              <TodoList />
            </div>
          </div>
        </div>
      </div>

      {/* Chat History Modal */}
      <ChatHistory 
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
      />
    </div>
  );
};

export default Overview;