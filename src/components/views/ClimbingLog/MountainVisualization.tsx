import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClimbingSession {
  date: string;
  routes: Array<{ grade: string; completed: boolean }>;
  sends?: Record<string, number>;
}

interface MountainVisualizationProps {
  climbingSessions: ClimbingSession[];
  journalEntries: any[];
  settings: { darkMode: boolean };
  height?: number;
}

type TimeFrame = 'weekly' | '6month' | 'yearly';

interface MountainPoint {
  period: string;
  sends: number;
  startDate: Date;
  endDate: Date;
  x: number;
  y: number;
}

const MountainVisualization: React.FC<MountainVisualizationProps> = ({ 
  climbingSessions, 
  journalEntries,
  settings, 
  height = 500 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [hoveredPoint, setHoveredPoint] = useState<MountainPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedPeak, setSelectedPeak] = useState<MountainPoint | null>(null);
  
  // Aggregate data based on timeframe
  const mountainData = useMemo(() => {
    const allEntries = [...climbingSessions, ...journalEntries];
    const aggregated = new Map<string, { sends: number; startDate: Date; endDate: Date }>();
    
    allEntries.forEach(entry => {
      const date = new Date(entry.date);
      let periodKey: string;
      let periodStart: Date;
      let periodEnd: Date;
      
      if (timeFrame === 'weekly') {
        // Get week start (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        periodKey = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        periodStart = weekStart;
        periodEnd = weekEnd;
      } else if (timeFrame === '6month') {
        periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
        periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      } else { // yearly
        periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
        periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      }
      
      // Count sends
      let sends = 0;
      if (entry.routes) {
        sends = entry.routes.filter((r: any) => r.completed).length;
      } else if (entry.sends) {
        sends = Object.values(entry.sends as Record<string, number>).reduce((sum: number, count: any) => sum + count, 0);
      }
      
      const existing = aggregated.get(periodKey) || { sends: 0, startDate: periodStart, endDate: periodEnd };
      aggregated.set(periodKey, { 
        sends: existing.sends + sends,
        startDate: existing.startDate < periodStart ? existing.startDate : periodStart,
        endDate: existing.endDate > periodEnd ? existing.endDate : periodEnd
      });
    });
    
    // Convert to array and sort by date
    const dataArray = Array.from(aggregated.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    // Limit data points based on timeframe
    let limitedData = dataArray;
    if (timeFrame === 'weekly') {
      limitedData = dataArray.slice(-12); // Last 12 weeks
    } else if (timeFrame === '6month') {
      limitedData = dataArray.slice(-6); // Last 6 months
    } else {
      limitedData = dataArray.slice(-12); // Last 12 months
    }
    
    // Calculate positions
    const maxSends = Math.max(...limitedData.map(d => d.sends), 1);
    return limitedData.map((d, i) => ({
      ...d,
      x: (i / (limitedData.length - 1)) * 100,
      y: (d.sends / maxSends) * 60 + 20 // 20-80% range
    }));
  }, [climbingSessions, journalEntries, timeFrame]);
  
  // Generate stars
  const stars = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 40,
      size: Math.random() * 2 + 1,
      animationDelay: Math.random() * 3,
      twinkleDuration: Math.random() * 2 + 2
    }));
  }, []);
  
  // Handle mouse movement for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setMousePosition({ x, y });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Generate mountain path
  const generateMountainPath = (points: MountainPoint[], offset: number = 0) => {
    if (points.length === 0) return '';
    
    let path = `M0,${height}`;
    
    points.forEach((point, i) => {
      const x = (point.x / 100) * 1200;
      const y = height - (point.y / 100) * height - offset;
      
      if (i === 0) {
        path += ` L0,${y}`;
      }
      
      // Create smooth curves between points
      if (i > 0) {
        const prevPoint = points[i - 1];
        const prevX = (prevPoint.x / 100) * 1200;
        const prevY = height - (prevPoint.y / 100) * height - offset;
        
        const cp1x = prevX + (x - prevX) * 0.5;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) * 0.5;
        const cp2y = y;
        
        path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
      }
    });
    
    path += ` L1200,${height - offset} L1200,${height} Z`;
    return path;
  };
  
  const mainPath = generateMountainPath(mountainData, 0);
  const backPath1 = generateMountainPath(mountainData.map(d => ({ ...d, y: d.y * 0.7 })), 100);
  const backPath2 = generateMountainPath(mountainData.map(d => ({ ...d, y: d.y * 0.5 })), 150);
  
  return (
    <div className="space-y-4">
      {/* Time Frame Selector */}
      <div className="flex justify-center">
        <div className={`inline-flex rounded-xl p-1 ${settings.darkMode ? 'bg-gray-800/50' : 'bg-gray-100'} backdrop-blur-sm`}>
          {(['weekly', '6month', 'yearly'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                timeFrame === tf
                  ? `${settings.darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'} shadow-lg scale-105`
                  : `${settings.darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              {tf === 'weekly' ? 'Weekly' : tf === '6month' ? '6 Months' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Visualization */}
      <div 
        ref={containerRef}
        className={`relative overflow-hidden rounded-2xl ${
          settings.darkMode ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50'
        }`}
        style={{ height: `${height}px` }}
      >
        {/* Stars */}
        <div className="absolute inset-0">
          {stars.map(star => (
            <motion.div
              key={star.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 5}px)`
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: star.twinkleDuration,
                delay: star.animationDelay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Removed Sun/Moon */}
        
        {/* Grid Lines */}
        {[25, 50, 75].map(y => (
          <div
            key={y}
            className={`absolute w-full h-px ${settings.darkMode ? 'bg-white/5' : 'bg-black/5'}`}
            style={{ bottom: `${y}%` }}
          />
        ))}
        
        {/* Mountain Layers */}
        <svg
          viewBox="0 0 1200 500"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mountainGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={settings.darkMode ? '#4A5568' : '#CBD5E1'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={settings.darkMode ? '#2D3748' : '#94A3B8'} stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="mountainGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={settings.darkMode ? '#4A5568' : '#94A3B8'} stopOpacity="0.5" />
              <stop offset="100%" stopColor={settings.darkMode ? '#2D3748' : '#64748B'} stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="mountainGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={settings.darkMode ? '#93C5FD' : '#60A5FA'} stopOpacity="0.6" />
              <stop offset="15%" stopColor={settings.darkMode ? '#60A5FA' : '#3B82F6'} stopOpacity="0.7" />
              <stop offset="30%" stopColor={settings.darkMode ? '#3B82F6' : '#2563EB'} stopOpacity="0.75" />
              <stop offset="50%" stopColor={settings.darkMode ? '#2563EB' : '#1D4ED8'} stopOpacity="0.85" />
              <stop offset="70%" stopColor={settings.darkMode ? '#1E40AF' : '#1E40AF'} stopOpacity="0.9" />
              <stop offset="85%" stopColor={settings.darkMode ? '#1E3A8A' : '#1E3A8A'} stopOpacity="0.95" />
              <stop offset="100%" stopColor={settings.darkMode ? '#1E3A8A' : '#1E3A8A'} stopOpacity="1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="3" result="softBlur"/>
              <feMerge>
                <feMergeNode in="softBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background Mountains */}
          <motion.path
            d={backPath2}
            fill="url(#mountainGradient1)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              transform: `translateX(${mousePosition.x * 15}px)`
            }}
          />
          <motion.path
            d={backPath1}
            fill="url(#mountainGradient2)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{
              transform: `translateX(${mousePosition.x * 10}px)`
            }}
          />
          
          {/* Main Mountain */}
          <motion.path
            d={mainPath}
            fill="url(#mountainGradient3)"
            stroke={settings.darkMode ? '#60A5FA' : '#3B82F6'}
            strokeWidth="2"
            strokeOpacity="0.5"
            filter="url(#glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            style={{
              transform: `translateX(${mousePosition.x * 5}px)`
            }}
          />
        </svg>
        
        {/* Data Points */}
        <div className="absolute inset-0">
          {mountainData.map((point, index) => {
            const isHighest = point.sends === Math.max(...mountainData.map(d => d.sends));
            const x = (point.x / 100) * 100;
            const y = 100 - point.y;
            
            return (
              <motion.div
                key={point.period}
                className={`absolute w-4 h-4 rounded-full cursor-pointer ${
                  isHighest ? 'z-20' : 'z-10'
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 200
                }}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => setSelectedPeak(point)}
              >
                <motion.div
                  className={`w-full h-full rounded-full ${
                    isHighest 
                      ? 'bg-gradient-to-br from-green-400 to-green-600' 
                      : 'bg-gradient-to-br from-blue-400 to-blue-600'
                  } shadow-lg`}
                  animate={isHighest ? {
                    scale: [1, 1.3, 1],
                    boxShadow: [
                      '0 0 20px rgba(34, 197, 94, 0.5)',
                      '0 0 40px rgba(34, 197, 94, 0.8)',
                      '0 0 20px rgba(34, 197, 94, 0.5)'
                    ]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                {point.sends > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                    {point.sends}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Fog Effect */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: settings.darkMode
              ? 'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, transparent 100%)'
              : 'linear-gradient(to top, rgba(219, 234, 254, 0.9) 0%, transparent 100%)'
          }}
        />
        
        {/* Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              className={`absolute pointer-events-none z-30 ${
                settings.darkMode ? 'bg-gray-900/95' : 'bg-white/95'
              } backdrop-blur-md rounded-xl shadow-2xl border ${
                settings.darkMode ? 'border-gray-700' : 'border-gray-200'
              } p-4`}
              style={{
                left: `${(hoveredPoint.x / 100) * 100}%`,
                top: `${100 - hoveredPoint.y}%`,
                transform: 'translate(-50%, -120%)'
              }}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                {hoveredPoint.period}
              </div>
              <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                {hoveredPoint.sends} sends
              </div>
              <div className={`text-xs ${settings.darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                {hoveredPoint.startDate.toLocaleDateString()} - {hoveredPoint.endDate.toLocaleDateString()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Time Labels */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8">
          {mountainData.slice(0, 5).map((point, i) => (
            <span
              key={i}
              className={`text-xs ${settings.darkMode ? 'text-gray-500' : 'text-gray-600'}`}
              style={{ 
                position: 'absolute',
                left: `${(point.x / 100) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {point.period.split(' ').slice(-2).join(' ')}
            </span>
          ))}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <motion.div 
          className={`p-4 rounded-xl ${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border ${
            settings.darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Sends
          </div>
          <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {mountainData.reduce((sum, d) => sum + d.sends, 0)}
          </div>
        </motion.div>
        
        <motion.div 
          className={`p-4 rounded-xl ${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border ${
            settings.darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Best {timeFrame === 'weekly' ? 'Week' : 'Month'}
          </div>
          <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {Math.max(...mountainData.map(d => d.sends))}
          </div>
        </motion.div>
        
        <motion.div 
          className={`p-4 rounded-xl ${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border ${
            settings.darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Average
          </div>
          <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
            {(mountainData.reduce((sum, d) => sum + d.sends, 0) / mountainData.length).toFixed(1)}
          </div>
        </motion.div>
        
        <motion.div 
          className={`p-4 rounded-xl ${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border ${
            settings.darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Trend
          </div>
          <div className={`text-2xl font-bold flex items-center gap-2`}>
            {mountainData.length >= 2 && mountainData[mountainData.length - 1].sends > mountainData[mountainData.length - 2].sends ? (
              <>
                <span className="text-green-500">↑</span>
                <span className="text-green-500">
                  +{Math.round(((mountainData[mountainData.length - 1].sends - mountainData[mountainData.length - 2].sends) / mountainData[mountainData.length - 2].sends) * 100)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-red-500">↓</span>
                <span className="text-red-500">
                  {Math.round(((mountainData[mountainData.length - 1].sends - mountainData[mountainData.length - 2].sends) / mountainData[mountainData.length - 2].sends) * 100)}%
                </span>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MountainVisualization;