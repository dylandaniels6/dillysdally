import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import AIChat from './AIChat';
import YesterdayRecap from './YesterdayRecap';
import TodoList from './TodoList';
import StarryBackground from './StarryBackground';
import ChatHistory from './ChatHistory';
import { generateDailyRecap } from './utils/summaryGenerator';
import { Menu } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasGeneratedToday = useRef(false);

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <StarryBackground blur={isChatFocused || showChatHistory} />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20"
        >
          <Menu size={24} className="text-white" />
        </button>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen">
        {/* AI Chat - Centered independently */}
        <div className="fixed inset-0 flex items-center justify-center px-4 pointer-events-none">
          <div className="w-full max-w-3xl pointer-events-auto">
            <AIChat 
              dailyRecap={dailyRecap}
              isLoading={isLoading}
              onFocusChange={setIsChatFocused}
              onHistoryClick={() => setShowChatHistory(true)}
            />
          </div>
        </div>

        {/* Side Panel - Fixed position, hidden on mobile */}
        <div className="hidden lg:block fixed right-8 top-1/2 transform -translate-y-1/2 w-80 max-h-[80vh] overflow-y-auto space-y-4">
          <YesterdayRecap />
          <TodoList />
        </div>
      </div>

      {/* Chat History Modal */}
      <ChatHistory 
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
      />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="absolute right-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-md p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Add your navigation items here */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <nav className="mt-12 space-y-4">
              {/* Navigation items from your sidebar */}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;