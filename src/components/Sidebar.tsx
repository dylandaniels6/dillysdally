import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  BookOpen, 
  Mountain, 
  CreditCard, 
  TrendingUp, 
  Settings,
  Brain
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAdminStatus } from '../hooks/useAdminStatus'; // 🔒 SECURE: Use server-side admin check

// Ultra-minimal navigation items with labels
const navigationItems = [
  { id: 'overview', icon: Home, view: 'overview', label: 'Overview' },
  { id: 'journal', icon: BookOpen, view: 'journal', label: 'Journal' },
  { id: 'climbing', icon: Mountain, view: 'climbing', label: 'Climbing' },
  { id: 'expenses', icon: CreditCard, view: 'expenses', label: 'Expenses' },
  { id: 'networth', icon: TrendingUp, view: 'networth', label: 'Net Worth' },
  { id: 'settings', icon: Settings, view: 'settings', label: 'Settings' },
];

interface SidebarProps {
  isTransparent?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isTransparent = false }) => {
  const { currentView, setCurrentView } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 🔒 SECURE: Use server-side admin check instead of client-side email comparison
  const { isAdmin, loading } = useAdminStatus();

  // Add AI Analytics to navigation items if user is admin (and not loading)
  const allNavigationItems = (isAdmin && !loading)
    ? [...navigationItems, { id: 'ai-usage', icon: Brain, view: 'ai-usage', label: 'AI Analytics' }]
    : navigationItems;

  return (
    <motion.aside 
      className="fixed left-0 top-16 bottom-0 z-30 flex flex-col items-start py-8"
      initial={{ width: 64 }}
      animate={{ width: isExpanded ? 200 : 64 }}
      transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Dynamic background that appears on hover */}
      <AnimatePresence>
        {isExpanded && !isTransparent && (
          <motion.div 
            className="absolute inset-0 bg-black/30 backdrop-blur-xl border-r border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
      
      <nav className="relative flex flex-col items-start space-y-6 px-4 w-full">
        {allNavigationItems.map((item, index) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentView(item.view as any)}
              className="relative group flex items-center space-x-3 pl-1 pr-3 py-3 rounded-xl transition-all duration-200 focus:outline-none w-full text-left"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active indicator - aligned with top of icon, extended bottom */}
              {isActive && (
                <motion.div
                  className="absolute -left-4 top-[calc(50%-12px)] w-1 h-7 bg-white/80 rounded-r-full shadow-lg shadow-white/20"
                  layoutId="activeIndicator"
                  initial={{ opacity: 0, scaleY: 0.5 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    opacity: { duration: 0.2 },
                    scaleY: { duration: 0.3 }
                  }}
                />
              )}
              
              {/* Icon - manually positioned to align with others */}
              <div className="relative" style={{ marginLeft: '-2px' }}>
                <Icon 
                  size={20} 
                  className={`transition-colors duration-200 flex-shrink-0 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-white/40 group-hover:text-white/80'
                  }`} 
                />
              </div>
              
              {/* Label with smooth fade-in */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    className={`text-sm font-medium whitespace-nowrap transition-colors duration-200 relative z-10 ${
                      isActive 
                        ? 'text-white' 
                        : 'text-white/60 group-hover:text-white/90'
                    }`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                  >
                    {item.label}
                    {item.id === 'ai-usage' && (
                      <span className="text-xs text-purple-400 ml-1">(Admin)</span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {/* Subtle hover glow */}
              <motion.div
                className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={false}
                animate={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              />
            </motion.button>
          );
        })}
      </nav>
      
      {/* Loading indicator for admin check */}
      {loading && isExpanded && (
        <div className="px-4 py-2 text-xs text-white/50 mt-auto">
          Checking permissions...
        </div>
      )}
    </motion.aside>
  );
};

export default Sidebar;